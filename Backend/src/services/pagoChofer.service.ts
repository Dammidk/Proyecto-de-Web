// Servicio de Pagos a Choferes - Lógica de negocio
import { AccionAuditoria, Prisma, MetodoPago, EstadoViaje } from '@prisma/client';
import { enTransaccion } from '../config/database';
import { storageService } from './storage.service';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import {
    pagoChoferRepository,
    FiltrosPagoChofer,
    DatosCrearPagoChofer,
} from '../repositories/pagoChofer.repository';
import { choferRepository } from '../repositories/chofer.repository';
import { viajesRepository } from '../repositories/viajes.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';

export const pagoChoferService = {
    async listar(filtros: FiltrosPagoChofer) {
        return pagoChoferRepository.findAll(filtros);
    },

    async obtener(id: number) {
        const pago = await pagoChoferRepository.findById(id);
        if (!pago) {
            throw new NotFoundError('Pago no encontrado');
        }
        return pago;
    },

    async crear(datos: DatosCrearPagoChofer, usuarioId: number, ip?: string) {
        // 1. Validar que el chofer exista
        const chofer = await choferRepository.findById(datos.choferId);
        if (!chofer) {
            throw new NotFoundError(`El chofer con ID ${datos.choferId} no existe`);
        }

        // 2. Validar monto
        const monto = Number(datos.monto);
        if (isNaN(monto) || monto <= 0) {
            throw new ValidationError('El monto del pago debe ser mayor a 0');
        }

        // 3. Si se especifica un viaje, verificar que exista y pertenezca al chofer
        if (datos.viajeId) {
            const viaje = await viajesRepository.findById(datos.viajeId);
            if (!viaje) {
                throw new NotFoundError(`El viaje con ID ${datos.viajeId} no existe`);
            }
            if (viaje.choferId !== datos.choferId) {
                throw new ValidationError(
                    `El viaje #${viaje.id} (${viaje.origen} → ${viaje.destino}) pertenece a otro conductor, no a ${chofer.nombres} ${chofer.apellidos}`
                );
            }
            if (viaje.estado === EstadoViaje.CANCELADO && datos.tipoPago !== 'LIQUIDACION') {
                throw new ConflictError(`El viaje #${viaje.id} está cancelado: solo admite pagos de liquidación`);
            }
        }

        // 4. Si el método es transferencia, validar que existan datos bancarios
        const metodo = datos.metodoPago || MetodoPago.EFECTIVO;
        if (metodo === MetodoPago.TRANSFERENCIA) {
            if (!chofer.banco && !chofer.numeroCuenta && !datos.descripcion) {
                console.warn(`[PAGO CHOFER] Chofer ${chofer.id} no tiene datos bancarios configurados`);
            }
        }

        // 5. Crear el registro de pago y su auditoría de forma atómica
        return enTransaccion(async (tx) => {
            const pago = await pagoChoferRepository.create({
                ...datos,
                monto,
                fecha: new Date(datos.fecha),
                metodoPago: metodo,
            }, tx);

            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.CREAR,
                entidad: 'PagoChofer',
                entidadId: pago.id,
                datosNuevos: pago as unknown as Prisma.InputJsonValue,
                ipAddress: ip,
            }, tx);

            return pago;
        });
    },

    async actualizar(id: number, datos: Partial<DatosCrearPagoChofer>, usuarioId: number, ip?: string) {
        const pagoAnterior = await pagoChoferRepository.findById(id);
        if (!pagoAnterior) {
            throw new NotFoundError('Pago no encontrado');
        }

        if (datos.monto !== undefined) {
            const monto = Number(datos.monto);
            if (isNaN(monto) || monto <= 0) {
                throw new ValidationError('El monto del pago debe ser mayor a 0');
            }
        }

        if (datos.viajeId) {
            const viaje = await viajesRepository.findById(datos.viajeId);
            if (!viaje) {
                throw new NotFoundError(`El viaje con ID ${datos.viajeId} no existe`);
            }
            const choferId = datos.choferId || pagoAnterior.choferId;
            if (viaje.choferId !== choferId) {
                throw new ValidationError(`El viaje #${viaje.id} no pertenece al chofer del pago`);
            }
        }

        const pagoActualizado = await enTransaccion(async (tx) => {
            const actualizado = await pagoChoferRepository.update(id, {
                ...datos,
                monto: datos.monto !== undefined ? Number(datos.monto) : undefined,
                fecha: datos.fecha ? new Date(datos.fecha) : undefined,
            }, tx);

            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.EDITAR,
                entidad: 'PagoChofer',
                entidadId: id,
                datosAnteriores: pagoAnterior as unknown as Prisma.InputJsonValue,
                datosNuevos: actualizado as unknown as Prisma.InputJsonValue,
                ipAddress: ip,
            }, tx);

            return actualizado;
        });

        // Si se reemplazó el comprobante subido, se elimina el archivo anterior
        if (datos.urlComprobante !== undefined && pagoAnterior.urlComprobante
            && datos.urlComprobante !== pagoAnterior.urlComprobante
            && pagoAnterior.urlComprobante.startsWith('/uploads/')) {
            await storageService.eliminarArchivo(pagoAnterior.urlComprobante);
        }

        return pagoActualizado;
    },

    async eliminar(id: number, usuarioId: number, ip?: string) {
        const pago = await pagoChoferRepository.findById(id);
        if (!pago) {
            throw new NotFoundError('Pago no encontrado');
        }

        await enTransaccion(async (tx) => {
            await pagoChoferRepository.delete(id, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.ELIMINAR,
                entidad: 'PagoChofer',
                entidadId: id,
                datosAnteriores: pago as unknown as Prisma.InputJsonValue,
                ipAddress: ip,
            }, tx);
        });

        if (pago.urlComprobante?.startsWith('/uploads/')) {
            await storageService.eliminarArchivo(pago.urlComprobante);
        }

        return { mensaje: 'Pago a chofer eliminado exitosamente' };
    },

    async obtenerResumenChofer(choferId: number) {
        return pagoChoferRepository.getResumenChofer(choferId);
    },

    async obtenerEstadisticas(anio: number, mes: number) {
        const pagosMes = await pagoChoferRepository.getPagosMensuales(anio, mes);
        return {
            anio,
            mes,
            totalPagosChoferes: pagosMes,
        };
    },
};
