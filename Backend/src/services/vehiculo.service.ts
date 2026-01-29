// Servicio de Vehículos - Lógica de negocio
import { z } from 'zod';
import { AccionAuditoria } from '@prisma/client';
import { vehiculoRepository, FiltrosVehiculo } from '../repositories/vehiculo.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';
import { empresaService } from './empresa.service';
import { ConflictError, NotFoundError } from '../utils/errors';

// Schema de validación Zod
export const vehiculoSchema = z.object({
    placa: z.string().min(1, 'Placa requerida').max(10),
    marca: z.string().min(1, 'Marca requerida'),
    modelo: z.string().min(1, 'Modelo requerido'),
    anio: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
    tipo: z.string().min(1, 'Tipo requerido'),
    capacidad: z.string().min(1, 'Capacidad requerida'),
    estado: z.enum(['ACTIVO', 'EN_RUTA', 'EN_MANTENIMIENTO', 'INACTIVO']).optional(),
    kilometrajeActual: z.coerce.number().int().min(0).optional(),
    observaciones: z.string().optional().nullable(),
    fechaUltimoMantenimiento: z.string().optional().nullable(),
    fechaProximoMantenimiento: z.string().optional().nullable(),
    fechaVencimientoSoat: z.string().optional().nullable(),
    fechaVencimientoSeguro: z.string().optional().nullable(),
    fechaVencimientoMatricula: z.string().optional().nullable(),
    fechaVencimientoRevisionTecnica: z.string().optional().nullable(),
    rendimientoEsperadoKmGal: z.union([z.literal(''), z.null(), z.coerce.number().positive().max(100)]).optional()
        .transform(v => (v === '' ? null : v)),
});

// En la edición todos los campos son opcionales (sin valores por defecto que pisen los actuales)
export const vehiculoUpdateSchema = vehiculoSchema.partial();

export type VehiculoInput = z.infer<typeof vehiculoSchema>;

export const vehiculoService = {
    async listar(filtros: FiltrosVehiculo) {
        return vehiculoRepository.findAll(filtros);
    },

    async obtenerPorId(id: number) {
        return vehiculoRepository.findById(id);
    },

    async crear(datos: VehiculoInput, usuarioId: number, ip?: string) {
        // Normalizar placa a mayúsculas
        const placaNormalizada = datos.placa.toUpperCase().trim();

        // Verificar unicidad de placa
        const existente = await vehiculoRepository.findByPlaca(placaNormalizada);
        if (existente) {
            throw new ConflictError(`Ya existe un vehículo con la placa ${placaNormalizada}`);
        }

        // El plan de la organización limita el tamaño de la flota
        await empresaService.verificarCupoVehiculos();

        // Preparar datos para guardar
        const dataToSave = {
            placa: placaNormalizada,
            marca: datos.marca.trim(),
            modelo: datos.modelo.trim(),
            anio: datos.anio,
            tipo: datos.tipo.trim(),
            capacidad: datos.capacidad.trim(),
            estado: datos.estado || 'ACTIVO',
            kilometrajeActual: datos.kilometrajeActual || 0,
            observaciones: datos.observaciones || null,
            fechaUltimoMantenimiento: datos.fechaUltimoMantenimiento ? new Date(datos.fechaUltimoMantenimiento) : null,
            fechaProximoMantenimiento: datos.fechaProximoMantenimiento ? new Date(datos.fechaProximoMantenimiento) : null,
            fechaVencimientoSoat: datos.fechaVencimientoSoat ? new Date(datos.fechaVencimientoSoat) : null,
            fechaVencimientoSeguro: datos.fechaVencimientoSeguro ? new Date(datos.fechaVencimientoSeguro) : null,
            fechaVencimientoMatricula: datos.fechaVencimientoMatricula ? new Date(datos.fechaVencimientoMatricula) : null,
            fechaVencimientoRevisionTecnica: datos.fechaVencimientoRevisionTecnica ? new Date(datos.fechaVencimientoRevisionTecnica) : null,
            rendimientoEsperadoKmGal: datos.rendimientoEsperadoKmGal ?? null
        };

        const vehiculo = await vehiculoRepository.create(dataToSave);

        // Registrar auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.CREAR,
            entidad: 'Vehiculo',
            entidadId: vehiculo.id,
            datosNuevos: vehiculo,
            ipAddress: ip
        });

        return vehiculo;
    },

    async actualizar(id: number, datos: Partial<VehiculoInput>, usuarioId: number, ip?: string) {
        // Obtener datos anteriores
        const anterior = await vehiculoRepository.findById(id);
        if (!anterior) throw new NotFoundError('Vehículo no encontrado');

        // Verificar placa única si cambió
        if (datos.placa && datos.placa.toUpperCase() !== anterior.placa) {
            const existente = await vehiculoRepository.findByPlaca(datos.placa.toUpperCase());
            if (existente) throw new ConflictError(`La placa ${datos.placa} ya está en uso`);
        }

        // El odómetro nunca retrocede
        if (datos.kilometrajeActual !== undefined && datos.kilometrajeActual < anterior.kilometrajeActual) {
            throw new ConflictError(`El kilometraje no puede ser menor al actual (${anterior.kilometrajeActual} km)`);
        }

        // Preparar datos para actualizar
        const dataToUpdate: any = {};
        if (datos.placa) dataToUpdate.placa = datos.placa.toUpperCase().trim();
        if (datos.marca) dataToUpdate.marca = datos.marca.trim();
        if (datos.modelo) dataToUpdate.modelo = datos.modelo.trim();
        if (datos.anio) dataToUpdate.anio = datos.anio;
        if (datos.tipo) dataToUpdate.tipo = datos.tipo.trim();
        if (datos.capacidad) dataToUpdate.capacidad = datos.capacidad.trim();
        if (datos.estado) dataToUpdate.estado = datos.estado;
        if (datos.kilometrajeActual !== undefined) dataToUpdate.kilometrajeActual = datos.kilometrajeActual;
        if (datos.observaciones !== undefined) dataToUpdate.observaciones = datos.observaciones;
        if (datos.rendimientoEsperadoKmGal !== undefined) dataToUpdate.rendimientoEsperadoKmGal = datos.rendimientoEsperadoKmGal;

        // Fechas
        ['fechaUltimoMantenimiento', 'fechaProximoMantenimiento', 'fechaVencimientoSoat', 'fechaVencimientoSeguro', 'fechaVencimientoMatricula', 'fechaVencimientoRevisionTecnica'].forEach(f => {
            if ((datos as any)[f] !== undefined) {
                dataToUpdate[f] = (datos as any)[f] ? new Date((datos as any)[f]) : null;
            }
        });

        const vehiculo = await vehiculoRepository.update(id, dataToUpdate);

        // Registrar auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'Vehiculo',
            entidadId: id,
            datosAnteriores: anterior,
            datosNuevos: vehiculo,
            ipAddress: ip
        });

        return vehiculo;
    },

    async eliminar(id: number, usuarioId: number, ip?: string) {
        const vehiculo = await vehiculoRepository.findById(id);
        if (!vehiculo) throw new NotFoundError('Vehículo no encontrado');

        await vehiculoRepository.delete(id);

        // Registrar auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.ELIMINAR,
            entidad: 'Vehiculo',
            entidadId: id,
            datosAnteriores: vehiculo,
            ipAddress: ip
        });

        return vehiculo;
    }
};
