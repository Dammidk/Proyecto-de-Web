// Servicio de Vehículos - Lógica de negocio
import { z } from 'zod';
import { AccionAuditoria } from '@prisma/client';
import { vehiculoRepository, FiltrosVehiculo } from '../repositories/vehiculo.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';

// Schema de validación Zod
export const vehiculoSchema = z.object({
    placa: z.string().min(1, 'Placa requerida').max(10),
    marca: z.string().min(1, 'Marca requerida'),
    modelo: z.string().min(1, 'Modelo requerido'),
    anio: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
    tipo: z.string().min(1, 'Tipo requerido'),
    capacidad: z.string().min(1, 'Capacidad requerida'),
    estado: z.enum(['ACTIVO', 'EN_RUTA', 'EN_MANTENIMIENTO', 'INACTIVO']).optional().default('ACTIVO'),
    kilometrajeActual: z.coerce.number().min(0).optional().default(0),
    observaciones: z.string().optional().nullable(),
    fechaUltimoMantenimiento: z.string().optional().nullable(),
    fechaProximoMantenimiento: z.string().optional().nullable(),
    fechaVencimientoSoat: z.string().optional().nullable(),
    fechaVencimientoSeguro: z.string().optional().nullable(),
    fechaVencimientoMatricula: z.string().optional().nullable()
});

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
            throw new Error(`Ya existe un vehículo con la placa ${placaNormalizada}`);
        }

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
            fechaVencimientoMatricula: datos.fechaVencimientoMatricula ? new Date(datos.fechaVencimientoMatricula) : null
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
        if (!anterior) throw new Error('Vehículo no encontrado');

        // Verificar placa única si cambió
        if (datos.placa && datos.placa.toUpperCase() !== anterior.placa) {
            const existente = await vehiculoRepository.findByPlaca(datos.placa.toUpperCase());
            if (existente) throw new Error(`La placa ${datos.placa} ya está en uso`);
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

        // Fechas
        ['fechaUltimoMantenimiento', 'fechaProximoMantenimiento', 'fechaVencimientoSoat', 'fechaVencimientoSeguro', 'fechaVencimientoMatricula'].forEach(f => {
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
        if (!vehiculo) throw new Error('Vehículo no encontrado');

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
