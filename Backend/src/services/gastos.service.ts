// Servicio de Gastos de Viaje - Lógica de negocio
import { TipoGasto, TipoComprobante, AccionAuditoria, EstadoViaje } from '@prisma/client';
import { enTransaccion } from '../config/database';
import { gastosRepository, DatosCrearGasto, DatosActualizarGasto } from '../repositories/gastos.repository';
import { viajesRepository } from '../repositories/viajes.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';
import { storageService } from './storage.service';
import { r2 } from '../domain/finanzas';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

export interface DatosCrearGastoConArchivo extends DatosCrearGasto {
    archivo?: Express.Multer.File;
}

/**
 * Normaliza los datos de combustible:
 * - Solo los gastos COMBUSTIBLE guardan galones, precio, estación y kilometraje
 * - Si hay galones pero no precio por galón, se calcula como monto / galones
 */
const normalizarCombustible = <T extends DatosActualizarGasto>(datos: T, tipoGasto: TipoGasto, monto?: number): T => {
    if (tipoGasto !== TipoGasto.COMBUSTIBLE) {
        return { ...datos, galones: null, precioPorGalon: null, estacionServicio: null, kilometrajeAlCargar: null };
    }
    if (datos.galones !== undefined && datos.galones !== null && datos.galones <= 0) {
        throw new ValidationError('Los galones deben ser mayores a 0');
    }
    if (datos.galones && !datos.precioPorGalon && monto) {
        return { ...datos, precioPorGalon: r2(monto / datos.galones) };
    }
    return datos;
};

export const gastosService = {
    /**
     * Listar gastos de un viaje
     */
    async listarPorViaje(viajeId: number) {
        const viaje = await viajesRepository.findById(viajeId);
        if (!viaje) throw new NotFoundError('Viaje no encontrado');
        return gastosRepository.findByViajeId(viajeId);
    },

    /**
     * Crear un gasto de viaje (con soporte para archivo de comprobante)
     */
    async crear(datos: DatosCrearGastoConArchivo, usuarioId: number, ip?: string) {
        const viaje = await viajesRepository.findById(datos.viajeId);
        if (!viaje) throw new NotFoundError('Viaje no encontrado');

        if (viaje.estado === EstadoViaje.CANCELADO) {
            throw new ConflictError('No se pueden registrar gastos en un viaje cancelado');
        }
        if (datos.monto <= 0) {
            throw new ValidationError('El monto debe ser mayor a 0');
        }

        const { archivo, ...resto } = datos;
        const datosGasto = normalizarCombustible(resto, datos.tipoGasto, datos.monto);

        return enTransaccion(async (tx) => {
            let comprobanteId: number | undefined;

            if (archivo) {
                const subido = storageService.procesarArchivoSubido(archivo, 'gastos');
                const comprobante = await gastosRepository.createComprobante({
                    tipo: TipoComprobante.GASTO_VIAJE,
                    url: subido.url,
                    publicId: subido.publicId,
                    nombreArchivoOriginal: archivo.originalname,
                }, tx);
                comprobanteId = comprobante.id;
            }

            const gasto = await gastosRepository.create(datosGasto, comprobanteId, tx);

            // Referencia inversa: el comprobante apunta al gasto que respalda
            if (comprobanteId) {
                await gastosRepository.setReferenciaComprobante(comprobanteId, gasto.id, tx);
            }

            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.CREAR,
                entidad: 'GastoViaje',
                entidadId: gasto.id,
                datosNuevos: gasto,
                ipAddress: ip,
            }, tx);

            return gasto;
        });
    },

    /**
     * Actualizar un gasto (no se puede mover a otro viaje)
     */
    async actualizar(id: number, datos: DatosActualizarGasto, usuarioId: number, ip?: string) {
        const gastoAnterior = await gastosRepository.findById(id);
        if (!gastoAnterior) throw new NotFoundError('Gasto no encontrado');

        if (gastoAnterior.viaje.estado === EstadoViaje.CANCELADO) {
            throw new ConflictError('No se pueden editar gastos de un viaje cancelado');
        }
        if (datos.monto !== undefined && datos.monto <= 0) {
            throw new ValidationError('El monto debe ser mayor a 0');
        }

        const tipo = datos.tipoGasto ?? gastoAnterior.tipoGasto;
        const monto = datos.monto ?? Number(gastoAnterior.monto);
        const cambios = normalizarCombustible(datos, tipo, monto);

        return enTransaccion(async (tx) => {
            const gastoActualizado = await gastosRepository.update(id, cambios, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.EDITAR,
                entidad: 'GastoViaje',
                entidadId: id,
                datosAnteriores: gastoAnterior,
                datosNuevos: gastoActualizado,
                ipAddress: ip,
            }, tx);
            return gastoActualizado;
        });
    },

    /**
     * Eliminar un gasto y su comprobante
     */
    async eliminar(id: number, usuarioId: number, ip?: string) {
        const gasto = await gastosRepository.findById(id);
        if (!gasto) throw new NotFoundError('Gasto no encontrado');

        await enTransaccion(async (tx) => {
            await gastosRepository.delete(id, tx);
            if (gasto.comprobanteId) {
                await gastosRepository.deleteComprobante(gasto.comprobanteId, tx);
            }
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.ELIMINAR,
                entidad: 'GastoViaje',
                entidadId: id,
                datosAnteriores: gasto,
                ipAddress: ip,
            }, tx);
        });

        // El archivo se borra solo después de confirmar la transacción
        if (gasto.comprobante) {
            await storageService.eliminarArchivo(gasto.comprobante.publicId);
        }

        return { mensaje: 'Gasto eliminado correctamente' };
    },

    /**
     * Obtener gastos totales del mes para dashboard
     */
    async obtenerGastosMensuales(anio: number, mes: number) {
        return gastosRepository.getGastosMensuales(anio, mes);
    },
};
