// Servicio de Viajes - Lógica de negocio
import { EstadoViaje, AccionAuditoria } from '@prisma/client';
import { viajesRepository, FiltrosViajes, DatosCrearViaje, DatosActualizarViaje } from '../repositories/viajes.repository';
import { gastosRepository } from '../repositories/gastos.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';

// Interfaz para resumen económico
export interface ResumenEconomico {
    ingreso: number;
    gastos: number;
    ganancia: number;
}

// Transiciones de estado válidas
const TRANSICIONES_VALIDAS: Record<EstadoViaje, EstadoViaje[]> = {
    PLANIFICADO: [EstadoViaje.EN_CURSO, EstadoViaje.CANCELADO],
    EN_CURSO: [EstadoViaje.COMPLETADO, EstadoViaje.CANCELADO],
    COMPLETADO: [], // Estado final
    CANCELADO: [], // Estado final
};

export const viajesService = {
    /**
     * Listar viajes con filtros y paginación
     */
    async listar(filtros: FiltrosViajes) {
        return viajesRepository.findAll(filtros);
    },

    /**
     * Obtener detalle de viaje con gastos y resumen económico
     */
    async obtenerDetalle(id: number) {
        const viaje = await viajesRepository.findById(id);

        if (!viaje) {
            throw new Error('Viaje no encontrado');
        }

        // Calcular resumen económico
        const totalGastos = await gastosRepository.sumarGastosViaje(id);
        const ingreso = Number(viaje.tarifa);

        const resumenEconomico: ResumenEconomico = {
            ingreso,
            gastos: totalGastos,
            ganancia: ingreso - totalGastos,
        };

        return {
            viaje,
            resumenEconomico,
        };
    },

    /**
     * Crear un nuevo viaje
     */
    async crear(datos: DatosCrearViaje, usuarioId: number) {
        // Validar entidades relacionadas
        const validacion = await viajesRepository.validarEntidadesRelacionadas(
            datos.vehiculoId,
            datos.choferId,
            datos.clienteId,
            datos.materialId
        );

        if (!validacion.valido) {
            throw new Error(validacion.errores.join(', '));
        }

        // Validar fechas
        if (datos.fechaLlegadaEstimada && datos.fechaSalida >= datos.fechaLlegadaEstimada) {
            throw new Error('La fecha de salida debe ser anterior a la fecha de llegada estimada');
        }

        // Validar tarifa
        if (datos.tarifa <= 0) {
            throw new Error('La tarifa debe ser mayor a 0');
        }

        // Crear viaje
        const viaje = await viajesRepository.create(datos);

        // Registrar auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.CREAR,
            entidad: 'Viaje',
            entidadId: viaje.id,
            datosNuevos: viaje,
        });

        return viaje;
    },

    /**
     * Actualizar datos de un viaje
     */
    async actualizar(id: number, datos: DatosActualizarViaje, usuarioId: number) {
        const viajeAnterior = await viajesRepository.findById(id);

        if (!viajeAnterior) {
            throw new Error('Viaje no encontrado');
        }

        // No permitir edición de viajes completados o cancelados
        if (viajeAnterior.estado === EstadoViaje.COMPLETADO || viajeAnterior.estado === EstadoViaje.CANCELADO) {
            throw new Error('No se puede editar un viaje completado o cancelado');
        }

        const viajeActualizado = await viajesRepository.update(id, datos);

        // Registrar auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'Viaje',
            entidadId: id,
            datosAnteriores: viajeAnterior,
            datosNuevos: viajeActualizado,
        });

        return viajeActualizado;
    },

    /**
     * Cambiar estado del viaje
     */
    async cambiarEstado(
        id: number,
        nuevoEstado: EstadoViaje,
        usuarioId: number,
        datosComplecion?: { fechaLlegadaReal?: Date; kilometrosReales?: number }
    ) {
        const viaje = await viajesRepository.findById(id);

        if (!viaje) {
            throw new Error('Viaje no encontrado');
        }

        // Validar transición de estado
        const transicionesPermitidas = TRANSICIONES_VALIDAS[viaje.estado];
        if (!transicionesPermitidas.includes(nuevoEstado)) {
            throw new Error(
                `No se puede cambiar de estado ${viaje.estado} a ${nuevoEstado}`
            );
        }

        // Si se está completando, validar datos de compleción
        const datosActualizacion: DatosActualizarViaje = { estado: nuevoEstado };

        if (nuevoEstado === EstadoViaje.COMPLETADO) {
            if (!datosComplecion?.fechaLlegadaReal) {
                datosActualizacion.fechaLlegadaReal = new Date();
            } else {
                datosActualizacion.fechaLlegadaReal = datosComplecion.fechaLlegadaReal;
            }

            if (datosComplecion?.kilometrosReales) {
                datosActualizacion.kilometrosReales = datosComplecion.kilometrosReales;
            }
        }

        const viajeActualizado = await viajesRepository.update(id, datosActualizacion);

        // Registrar auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'Viaje',
            entidadId: id,
            datosAnteriores: { estado: viaje.estado },
            datosNuevos: { estado: nuevoEstado, ...datosActualizacion },
        });

        return viajeActualizado;
    },

    /**
     * Eliminar viaje (solo si está planificado)
     */
    async eliminar(id: number, usuarioId: number) {
        const viaje = await viajesRepository.findById(id);

        if (!viaje) {
            throw new Error('Viaje no encontrado');
        }

        if (viaje.estado !== EstadoViaje.PLANIFICADO) {
            throw new Error('Solo se pueden eliminar viajes en estado PLANIFICADO');
        }

        await viajesRepository.delete(id);

        // Registrar auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.ELIMINAR,
            entidad: 'Viaje',
            entidadId: id,
            datosAnteriores: viaje,
        });

        return { mensaje: 'Viaje eliminado correctamente' };
    },

    /**
     * Obtener estadísticas mensuales para dashboard
     */
    async obtenerEstadisticasMensuales(anio: number, mes: number) {
        return viajesRepository.getEstadisticasMensuales(anio, mes);
    },
};
