// Servicio de Viajes - Lógica de negocio
import { EstadoViaje, AccionAuditoria, EstadoVehiculo } from '@prisma/client';
import { enTransaccion, Db } from '../config/database';
import { viajesRepository, FiltrosViajes, DatosCrearViaje, DatosActualizarViaje } from '../repositories/viajes.repository';
import { vehiculoRepository } from '../repositories/vehiculo.repository';
import { neumaticoRepository } from '../repositories/neumatico.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';
import { facturaService } from './factura.service';
import { validarAsignacion } from '../domain/cumplimiento';
import { calcularLiquidacion, calcularResumenViaje, diagnosticarRendimiento, num } from '../domain/finanzas';
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '../utils/errors';

// Transiciones de estado válidas
export const TRANSICIONES_VALIDAS: Record<EstadoViaje, EstadoViaje[]> = {
    PLANIFICADO: [EstadoViaje.EN_CURSO, EstadoViaje.CANCELADO],
    EN_CURSO: [EstadoViaje.COMPLETADO, EstadoViaje.CANCELADO],
    COMPLETADO: [], // Estado final
    CANCELADO: [], // Estado final
};

export interface DatosComplecion {
    fechaLlegadaReal?: Date;
    kilometrosReales?: number;
}

/**
 * Verifica que vehículo, chofer, cliente y material existan y puedan asignarse al viaje
 * (estado, documentos vigentes a la fecha de salida, licencia, HazMat).
 */
const validarEntidades = async (
    ids: { vehiculoId: number; choferId: number; clienteId: number; materialId: number },
    fechaSalida: Date,
    db?: Db
) => {
    const { vehiculo, chofer, cliente, material } = await viajesRepository.obtenerEntidadesAsignacion(
        ids.vehiculoId, ids.choferId, ids.clienteId, ids.materialId, db
    );

    const faltantes: string[] = [];
    if (!vehiculo) faltantes.push('Vehículo no encontrado');
    if (!chofer) faltantes.push('Chofer no encontrado');
    if (!cliente) faltantes.push('Cliente no encontrado');
    else if (cliente.estado !== 'ACTIVO') faltantes.push(`El cliente ${cliente.nombreRazonSocial} está INACTIVO`);
    if (!material) faltantes.push('Material no encontrado');
    if (faltantes.length > 0 || !vehiculo || !chofer || !material) {
        throw new ValidationError(faltantes.join(', '), { errores: faltantes });
    }

    const impedimentos = validarAsignacion(vehiculo, chofer, material, fechaSalida);
    if (impedimentos.length > 0) {
        throw new BusinessRuleError(impedimentos.join('. '), { errores: impedimentos });
    }

    return { vehiculo, chofer, cliente, material };
};

const validarFechas = (fechaSalida: Date, fechaLlegadaEstimada?: Date | null) => {
    if (fechaLlegadaEstimada && fechaSalida >= fechaLlegadaEstimada) {
        throw new ValidationError('La fecha de salida debe ser anterior a la fecha de llegada estimada');
    }
};

export const viajesService = {
    /**
     * Listar viajes con filtros y paginación
     */
    async listar(filtros: FiltrosViajes) {
        return viajesRepository.findAll(filtros);
    },

    /**
     * Obtener detalle de viaje con gastos, pagos y resumen económico (incluye CPK y rendimiento)
     */
    async obtenerDetalle(id: number) {
        const viaje = await viajesRepository.findById(id);
        if (!viaje) throw new NotFoundError('Viaje no encontrado');

        const resumenEconomico = calcularResumenViaje(
            viaje.tarifa, viaje.gastos, viaje.pagosChofer, viaje.kilometrosReales, viaje.kilometrosEstimados
        );
        const diagnosticoCombustible = diagnosticarRendimiento(
            resumenEconomico.rendimientoKmGal,
            viaje.vehiculo.rendimientoEsperadoKmGal ? num(viaje.vehiculo.rendimientoEsperadoKmGal) : null
        );

        return {
            viaje,
            resumenEconomico: { ...resumenEconomico, diagnosticoCombustible },
        };
    },

    /**
     * Hoja de liquidación del viaje: anticipos entregados al chofer vs. gastos comprobados
     */
    async obtenerLiquidacion(id: number) {
        const viaje = await viajesRepository.findById(id);
        if (!viaje) throw new NotFoundError('Viaje no encontrado');

        return {
            viaje,
            liquidacion: calcularLiquidacion(viaje.gastos, viaje.pagosChofer),
            resumenEconomico: calcularResumenViaje(
                viaje.tarifa, viaje.gastos, viaje.pagosChofer, viaje.kilometrosReales, viaje.kilometrosEstimados
            ),
            generadoEn: new Date(),
        };
    },

    /**
     * Crear un nuevo viaje
     */
    async crear(datos: DatosCrearViaje, usuarioId: number, ip?: string) {
        validarFechas(datos.fechaSalida, datos.fechaLlegadaEstimada);
        if (datos.tarifa <= 0) {
            throw new ValidationError('La tarifa debe ser mayor a 0');
        }

        await validarEntidades(datos, datos.fechaSalida);
        // Regla comercial: sin nuevos viajes para clientes con mora prolongada
        await facturaService.verificarClienteSinMora(datos.clienteId);

        return enTransaccion(async (tx) => {
            const viaje = await viajesRepository.create(datos, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.CREAR,
                entidad: 'Viaje',
                entidadId: viaje.id,
                datosNuevos: viaje,
                ipAddress: ip,
            }, tx);
            return viaje;
        });
    },

    /**
     * Actualizar datos de un viaje. El estado NO se cambia aquí (ver cambiarEstado).
     */
    async actualizar(id: number, datos: DatosActualizarViaje, usuarioId: number, ip?: string) {
        const viajeAnterior = await viajesRepository.findById(id);
        if (!viajeAnterior) throw new NotFoundError('Viaje no encontrado');

        // No permitir edición de viajes completados o cancelados
        if (viajeAnterior.estado === EstadoViaje.COMPLETADO || viajeAnterior.estado === EstadoViaje.CANCELADO) {
            throw new ConflictError('No se puede editar un viaje completado o cancelado');
        }

        // El estado solo cambia por la máquina de estados
        const { estado: _ignorado, ...cambios } = datos;

        const cambiaAsignacion = ['vehiculoId', 'choferId', 'clienteId', 'materialId']
            .some(k => cambios[k as keyof typeof cambios] !== undefined && cambios[k as keyof typeof cambios] !== viajeAnterior[k as keyof typeof viajeAnterior]);

        if (cambiaAsignacion && viajeAnterior.estado !== EstadoViaje.PLANIFICADO) {
            throw new ConflictError('Solo se puede cambiar vehículo, chofer, cliente o material de un viaje PLANIFICADO');
        }

        const fechaSalida = cambios.fechaSalida ?? viajeAnterior.fechaSalida;
        const fechaLlegadaEstimada = cambios.fechaLlegadaEstimada !== undefined
            ? cambios.fechaLlegadaEstimada
            : viajeAnterior.fechaLlegadaEstimada;
        validarFechas(fechaSalida, fechaLlegadaEstimada);

        if (cambios.tarifa !== undefined && cambios.tarifa <= 0) {
            throw new ValidationError('La tarifa debe ser mayor a 0');
        }

        if (cambiaAsignacion || cambios.fechaSalida) {
            await validarEntidades({
                vehiculoId: cambios.vehiculoId ?? viajeAnterior.vehiculoId,
                choferId: cambios.choferId ?? viajeAnterior.choferId,
                clienteId: cambios.clienteId ?? viajeAnterior.clienteId,
                materialId: cambios.materialId ?? viajeAnterior.materialId,
            }, fechaSalida);
        }

        return enTransaccion(async (tx) => {
            const viajeActualizado = await viajesRepository.update(id, cambios, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.EDITAR,
                entidad: 'Viaje',
                entidadId: id,
                datosAnteriores: viajeAnterior,
                datosNuevos: viajeActualizado,
                ipAddress: ip,
            }, tx);
            return viajeActualizado;
        });
    },

    /**
     * Cambiar estado del viaje y sincronizar el estado y odómetro del vehículo:
     * - EN_CURSO: el vehículo pasa a EN_RUTA (no puede estar en otro viaje en curso)
     * - COMPLETADO: el vehículo vuelve a ACTIVO y su odómetro suma los km reales
     * - CANCELADO: si estaba en ruta, el vehículo vuelve a ACTIVO
     */
    async cambiarEstado(
        id: number,
        nuevoEstado: EstadoViaje,
        usuarioId: number,
        datosComplecion?: DatosComplecion,
        ip?: string
    ) {
        const viaje = await viajesRepository.findById(id);
        if (!viaje) throw new NotFoundError('Viaje no encontrado');

        // Validar transición de estado
        const transicionesPermitidas = TRANSICIONES_VALIDAS[viaje.estado];
        if (!transicionesPermitidas.includes(nuevoEstado)) {
            throw new ConflictError(`No se puede cambiar de estado ${viaje.estado} a ${nuevoEstado}`);
        }

        const datosActualizacion: DatosActualizarViaje = { estado: nuevoEstado };

        if (nuevoEstado === EstadoViaje.EN_CURSO) {
            // Se revalidan documentos y licencia a la fecha real de salida
            await validarEntidades(viaje, new Date());
        }

        if (nuevoEstado === EstadoViaje.COMPLETADO) {
            const llegada = datosComplecion?.fechaLlegadaReal ?? new Date();
            if (llegada < viaje.fechaSalida) {
                throw new ValidationError('La fecha de llegada real no puede ser anterior a la fecha de salida');
            }
            datosActualizacion.fechaLlegadaReal = llegada;

            if (datosComplecion?.kilometrosReales !== undefined) {
                if (datosComplecion.kilometrosReales <= 0) {
                    throw new ValidationError('Los kilómetros reales deben ser mayores a 0');
                }
                datosActualizacion.kilometrosReales = datosComplecion.kilometrosReales;
            }
        }

        return enTransaccion(async (tx) => {
            const vehiculo = await vehiculoRepository.findById(viaje.vehiculoId, tx);
            if (!vehiculo) throw new NotFoundError('Vehículo del viaje no encontrado');

            if (nuevoEstado === EstadoViaje.EN_CURSO) {
                const conflicto = await viajesRepository.buscarViajeEnCursoConflicto(viaje.vehiculoId, viaje.choferId, id, tx);
                if (conflicto) {
                    const quien = conflicto.vehiculoId === viaje.vehiculoId ? `El vehículo ${vehiculo.placa}` : 'El chofer';
                    throw new ConflictError(`${quien} ya está en el viaje en curso #${conflicto.id} (${conflicto.origen} → ${conflicto.destino})`);
                }
                await vehiculoRepository.update(vehiculo.id, { estado: EstadoVehiculo.EN_RUTA }, tx);
            }

            if (nuevoEstado === EstadoViaje.COMPLETADO) {
                const km = datosActualizacion.kilometrosReales ?? 0;
                await vehiculoRepository.update(vehiculo.id, {
                    ...(vehiculo.estado === EstadoVehiculo.EN_RUTA ? { estado: EstadoVehiculo.ACTIVO } : {}),
                    ...(km > 0 ? { kilometrajeActual: vehiculo.kilometrajeActual + km } : {}),
                }, tx);
                // Los kilómetros del viaje se abonan a los neumáticos montados (base del costo por km)
                if (km > 0) await neumaticoRepository.sumarKilometrosVehiculo(vehiculo.id, km, tx);
            }

            if (nuevoEstado === EstadoViaje.CANCELADO && viaje.estado === EstadoViaje.EN_CURSO && vehiculo.estado === EstadoVehiculo.EN_RUTA) {
                await vehiculoRepository.update(vehiculo.id, { estado: EstadoVehiculo.ACTIVO }, tx);
            }

            const viajeActualizado = await viajesRepository.update(id, datosActualizacion, tx);

            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.EDITAR,
                entidad: 'Viaje',
                entidadId: id,
                datosAnteriores: { estado: viaje.estado },
                datosNuevos: datosActualizacion,
                ipAddress: ip,
            }, tx);

            return viajeActualizado;
        });
    },

    /**
     * Eliminar viaje (solo si está planificado)
     */
    async eliminar(id: number, usuarioId: number, ip?: string) {
        const viaje = await viajesRepository.findById(id);
        if (!viaje) throw new NotFoundError('Viaje no encontrado');

        if (viaje.estado !== EstadoViaje.PLANIFICADO) {
            throw new ConflictError('Solo se pueden eliminar viajes en estado PLANIFICADO. Use CANCELAR para los demás.');
        }
        if (viaje.gastos.length > 0 || viaje.pagosChofer.length > 0) {
            throw new ConflictError('El viaje tiene gastos o pagos registrados; cancélelo en lugar de eliminarlo');
        }

        await enTransaccion(async (tx) => {
            await viajesRepository.delete(id, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.ELIMINAR,
                entidad: 'Viaje',
                entidadId: id,
                datosAnteriores: viaje,
                ipAddress: ip,
            }, tx);
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
