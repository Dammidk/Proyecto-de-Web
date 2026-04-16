// Servicio de Mantenimientos - Lógica de negocio
import { AccionAuditoria, EstadoMantenimiento, EstadoVehiculo, Prisma } from '@prisma/client';
import { enTransaccion } from '../config/database';
import {
    mantenimientoRepository,
    FiltrosMantenimiento,
    DatosCrearMantenimiento,
} from '../repositories/mantenimiento.repository';
import { vehiculoRepository } from '../repositories/vehiculo.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';
import { storageService } from './storage.service';
import { NotFoundError, ValidationError } from '../utils/errors';

type VehiculoBase = { kilometrajeActual: number; estado: EstadoVehiculo };

/**
 * Cambios automáticos sobre el vehículo al registrar o actualizar un mantenimiento:
 * - El odómetro solo avanza (nunca retrocede)
 * - EN_PROCESO deja el vehículo EN_MANTENIMIENTO; COMPLETADO lo devuelve a ACTIVO
 */
const cambiosVehiculo = (
    vehiculo: VehiculoBase,
    datos: Partial<Pick<DatosCrearMantenimiento, 'kilometrajeAlMomento' | 'proximaFecha' | 'estado'>>
): Prisma.VehiculoUpdateInput => {
    const cambios: Prisma.VehiculoUpdateInput = {};

    if (datos.kilometrajeAlMomento && datos.kilometrajeAlMomento > vehiculo.kilometrajeActual) {
        cambios.kilometrajeActual = datos.kilometrajeAlMomento;
    }
    if (datos.proximaFecha) {
        cambios.fechaProximoMantenimiento = new Date(datos.proximaFecha);
    }
    if (datos.estado === EstadoMantenimiento.EN_PROCESO) {
        cambios.estado = EstadoVehiculo.EN_MANTENIMIENTO;
    } else if (
        (datos.estado === EstadoMantenimiento.COMPLETADO || datos.estado === EstadoMantenimiento.CANCELADO) &&
        vehiculo.estado === EstadoVehiculo.EN_MANTENIMIENTO
    ) {
        cambios.estado = EstadoVehiculo.ACTIVO;
    }
    return cambios;
};

export const mantenimientoService = {
    async listar(filtros: FiltrosMantenimiento) {
        return mantenimientoRepository.findAll(filtros);
    },

    async obtener(id: number) {
        const mantenimiento = await mantenimientoRepository.findById(id);
        if (!mantenimiento) {
            throw new NotFoundError('Mantenimiento no encontrado');
        }
        return mantenimiento;
    },

    async crear(datos: DatosCrearMantenimiento, usuarioId: number, ip?: string) {
        // 1. Validar que el vehículo exista
        const vehiculo = await vehiculoRepository.findById(datos.vehiculoId);
        if (!vehiculo) {
            throw new NotFoundError(`El vehículo con ID ${datos.vehiculoId} no existe`);
        }
        if (vehiculo.estado === EstadoVehiculo.EN_RUTA && datos.estado === EstadoMantenimiento.EN_PROCESO) {
            throw new ValidationError(`El vehículo ${vehiculo.placa} está EN_RUTA: complete o cancele su viaje antes de ingresarlo al taller`);
        }

        // 2. Normalizar costos
        const manoObra = Number(datos.costoManoObra || 0);
        const repuestos = Number(datos.costoRepuestos || 0);
        const total = datos.costoTotal ? Number(datos.costoTotal) : (manoObra + repuestos);

        if (total < 0) {
            throw new ValidationError('El costo total no puede ser negativo');
        }

        return enTransaccion(async (tx) => {
            // 3. Crear el registro de mantenimiento
            const mantenimiento = await mantenimientoRepository.create({
                ...datos,
                costoManoObra: manoObra,
                costoRepuestos: repuestos,
                costoTotal: total,
                fecha: new Date(datos.fecha),
                proximaFecha: datos.proximaFecha ? new Date(datos.proximaFecha) : undefined,
            }, tx);

            // 4. Actualizar datos automáticos en el Vehículo (en la misma transacción)
            await vehiculoRepository.update(vehiculo.id, {
                fechaUltimoMantenimiento: new Date(datos.fecha),
                ...cambiosVehiculo(vehiculo, datos),
            }, tx);

            // 5. Registrar auditoría
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.CREAR,
                entidad: 'Mantenimiento',
                entidadId: mantenimiento.id,
                datosNuevos: mantenimiento,
                ipAddress: ip,
            }, tx);

            return mantenimiento;
        });
    },

    async actualizar(id: number, datos: Partial<DatosCrearMantenimiento>, usuarioId: number, ip?: string) {
        const mantenimientoAnterior = await mantenimientoRepository.findById(id);
        if (!mantenimientoAnterior) {
            throw new NotFoundError('Mantenimiento no encontrado');
        }
        if (datos.vehiculoId && datos.vehiculoId !== mantenimientoAnterior.vehiculoId) {
            throw new ValidationError('No se puede mover un mantenimiento a otro vehículo; elimínelo y regístrelo de nuevo');
        }

        const manoObra = datos.costoManoObra !== undefined ? Number(datos.costoManoObra) : Number(mantenimientoAnterior.costoManoObra);
        const repuestos = datos.costoRepuestos !== undefined ? Number(datos.costoRepuestos) : Number(mantenimientoAnterior.costoRepuestos);
        const total = datos.costoTotal !== undefined ? Number(datos.costoTotal) : (manoObra + repuestos);

        const datosActualizados = {
            ...datos,
            costoManoObra: manoObra,
            costoRepuestos: repuestos,
            costoTotal: total,
            fecha: datos.fecha ? new Date(datos.fecha) : undefined,
            proximaFecha: datos.proximaFecha ? new Date(datos.proximaFecha) : undefined,
        };

        const resultado = await enTransaccion(async (tx) => {
            const mantenimientoActualizado = await mantenimientoRepository.update(id, datosActualizados, tx);

            // Si cambió el estado o kilometraje, actualizar vehículo
            const vehiculo = await vehiculoRepository.findById(mantenimientoAnterior.vehiculoId, tx);
            if (vehiculo) {
                const cambios = cambiosVehiculo(vehiculo, datos);
                if (Object.keys(cambios).length > 0) {
                    await vehiculoRepository.update(vehiculo.id, cambios, tx);
                }
            }

            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.EDITAR,
                entidad: 'Mantenimiento',
                entidadId: id,
                datosAnteriores: mantenimientoAnterior,
                datosNuevos: mantenimientoActualizado,
                ipAddress: ip,
            }, tx);

            return mantenimientoActualizado;
        });

        // Si se reemplazó el comprobante subido, se elimina el archivo anterior
        if (datos.urlComprobante !== undefined && mantenimientoAnterior.urlComprobante
            && datos.urlComprobante !== mantenimientoAnterior.urlComprobante
            && mantenimientoAnterior.urlComprobante.startsWith('/uploads/')) {
            await storageService.eliminarArchivo(mantenimientoAnterior.urlComprobante);
        }

        return resultado;
    },

    async eliminar(id: number, usuarioId: number, ip?: string) {
        const mantenimiento = await mantenimientoRepository.findById(id);
        if (!mantenimiento) {
            throw new NotFoundError('Mantenimiento no encontrado');
        }

        await enTransaccion(async (tx) => {
            await mantenimientoRepository.delete(id, tx);

            // Si el vehículo seguía en taller por este mantenimiento, vuelve a estar disponible
            if (mantenimiento.estado === EstadoMantenimiento.EN_PROCESO && mantenimiento.vehiculo?.estado === EstadoVehiculo.EN_MANTENIMIENTO) {
                await vehiculoRepository.update(mantenimiento.vehiculoId, { estado: EstadoVehiculo.ACTIVO }, tx);
            }

            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.ELIMINAR,
                entidad: 'Mantenimiento',
                entidadId: id,
                datosAnteriores: mantenimiento,
                ipAddress: ip,
            }, tx);
        });

        if (mantenimiento.urlComprobante?.startsWith('/uploads/')) {
            await storageService.eliminarArchivo(mantenimiento.urlComprobante);
        }

        return { mensaje: 'Mantenimiento eliminado exitosamente' };
    },

    async obtenerAlertas() {
        return mantenimientoRepository.getAlertasMantenimiento();
    },

    async obtenerEstadisticas(anio: number, mes: number) {
        const costosMes = await mantenimientoRepository.getCostosMensuales(anio, mes);
        return {
            anio,
            mes,
            costosTotalesMantenimiento: costosMes,
        };
    },
};
