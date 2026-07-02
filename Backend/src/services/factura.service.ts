// Servicio de Facturación y Cuentas por Cobrar (CxC)
import { z } from 'zod';
import { AccionAuditoria, EstadoFactura, MetodoPago } from '@prisma/client';
import { enTransaccion } from '../config/database';
import { facturaRepository, FiltrosFactura } from '../repositories/factura.repository';
import { clienteRepository } from '../repositories/cliente.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';
import {
    DIAS_BLOQUEO_POR_MORA, calcularFechaVencimiento, calcularTotalesFactura, clasificarVencimiento,
    esNumeroFacturaValido, estadoSegunSaldo, resumirCartera, siguienteNumeroFactura,
} from '../domain/cartera';
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { fechaOpcional, numeroOpcional, textoOpcional } from '../utils/http';

export const facturaSchema = z.object({
    clienteId: z.coerce.number().int().positive('Seleccione un cliente'),
    viajeId: numeroOpcional(z.coerce.number().int().positive()),
    numeroFactura: z.string().trim().optional().transform(v => v || undefined),
    subtotal: numeroOpcional(z.coerce.number().positive('El subtotal debe ser mayor a 0')),
    ivaPorcentaje: z.coerce.number().min(0).max(100).default(15),
    diasCredito: z.coerce.number().int().min(0).max(365).default(30),
    fechaEmision: fechaOpcional,
    observaciones: textoOpcional,
});

export const cobroSchema = z.object({
    monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
    metodoPago: z.nativeEnum(MetodoPago).default(MetodoPago.TRANSFERENCIA),
    fecha: fechaOpcional,
    referencia: textoOpcional,
    observaciones: textoOpcional,
});

const redondear = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

type FacturaDb = NonNullable<Awaited<ReturnType<typeof facturaRepository.findById>>>;

const presentar = (f: FacturaDb, hoy = new Date()) => {
    const saldo = Number(f.saldoPendiente);
    const vigente = f.estado !== EstadoFactura.ANULADA && saldo > 0.005;
    const clasificacion = clasificarVencimiento(f.fechaVencimiento, hoy);
    return {
        ...f,
        subtotal: Number(f.subtotal),
        iva: Number(f.iva),
        total: Number(f.total),
        saldoPendiente: saldo,
        cobros: f.cobros.map(c => ({ ...c, monto: Number(c.monto) })),
        viaje: f.viaje ? { ...f.viaje, tarifa: Number(f.viaje.tarifa) } : null,
        diasVencido: vigente ? Math.max(0, clasificacion.diasDiferencia) : 0,
        antiguedad: vigente ? clasificacion.categoria : null,
        esVencida: vigente && clasificacion.diasDiferencia > 0,
    };
};

const obtenerOFallar = async (id: number) => {
    const f = await facturaRepository.findById(id);
    if (!f) throw new NotFoundError('Factura no encontrada');
    return f;
};

export const facturaService = {
    async listar(filtros: FiltrosFactura = {}) {
        const hoy = new Date();
        return (await facturaRepository.findAll(filtros)).map(f => presentar(f as FacturaDb, hoy));
    },

    async obtenerPorId(id: number) {
        return presentar(await obtenerOFallar(id));
    },

    async crear(datos: z.infer<typeof facturaSchema>, usuarioId: number, ip?: string) {
        const cliente = await clienteRepository.findById(datos.clienteId);
        if (!cliente) throw new ValidationError('El cliente no existe');

        let subtotal = datos.subtotal ?? null;
        if (datos.viajeId) {
            const viaje = await facturaRepository.viajeParaFacturar(datos.viajeId);
            if (!viaje) throw new ValidationError('El viaje no existe');
            if (viaje.clienteId !== datos.clienteId) throw new ValidationError('El viaje pertenece a otro cliente');
            if (viaje.estado !== 'COMPLETADO') throw new BusinessRuleError('Solo se facturan viajes completados');
            if (await facturaRepository.findPorViaje(viaje.id)) {
                throw new ConflictError('El viaje ya tiene una factura vigente');
            }
            subtotal = subtotal ?? Number(viaje.tarifa);
        }
        if (subtotal === null) throw new ValidationError('Indique el subtotal o seleccione un viaje');

        if (datos.numeroFactura && !esNumeroFacturaValido(datos.numeroFactura)) {
            throw new ValidationError('El número debe tener el formato 001-001-000000001');
        }

        const fechaEmision = datos.fechaEmision ?? new Date();
        const totales = calcularTotalesFactura(subtotal, datos.ivaPorcentaje);

        return enTransaccion(async tx => {
            const numeroFactura = datos.numeroFactura ?? siguienteNumeroFactura(await facturaRepository.ultimoNumero(tx));
            if (await facturaRepository.findByNumero(numeroFactura, tx)) {
                throw new ConflictError(`Ya existe la factura ${numeroFactura}`);
            }
            const nueva = await facturaRepository.create({
                numeroFactura,
                clienteId: datos.clienteId,
                viajeId: datos.viajeId ?? null,
                fechaEmision,
                fechaVencimiento: calcularFechaVencimiento(fechaEmision, datos.diasCredito),
                diasCredito: datos.diasCredito,
                subtotal: totales.subtotal,
                iva: totales.iva,
                total: totales.total,
                saldoPendiente: totales.total,
                estado: EstadoFactura.PENDIENTE,
                observaciones: datos.observaciones ?? null,
                empresaId: cliente.empresaId ?? null,
            }, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.CREAR, entidad: 'FacturaCliente', entidadId: nueva.id, datosNuevos: nueva, ipAddress: ip,
            }, tx);
            return nueva;
        });
    },

    // El saldo se relee dentro de la transacción para que dos cobros simultáneos no sobrepasen el total
    async registrarCobro(id: number, datos: z.infer<typeof cobroSchema>, usuarioId: number, ip?: string) {
        await obtenerOFallar(id);

        return enTransaccion(async tx => {
            const factura = await facturaRepository.findById(id, tx);
            if (!factura) throw new NotFoundError('Factura no encontrada');
            if (factura.estado === EstadoFactura.ANULADA) throw new ConflictError('La factura está anulada');
            if (factura.estado === EstadoFactura.PAGADA) throw new ConflictError('La factura ya está pagada');

            const saldo = Number(factura.saldoPendiente);
            if (datos.monto > saldo + 0.005) {
                throw new BusinessRuleError(`El monto excede el saldo pendiente ($${saldo.toFixed(2)})`);
            }

            const nuevoSaldo = redondear(Math.max(0, saldo - datos.monto));
            const nuevoEstado = estadoSegunSaldo(Number(factura.total), nuevoSaldo);

            const cobro = await facturaRepository.crearCobro({
                facturaId: id,
                monto: datos.monto,
                fecha: datos.fecha ?? new Date(),
                metodoPago: datos.metodoPago,
                referencia: datos.referencia ?? null,
                observaciones: datos.observaciones ?? null,
            }, tx);
            await facturaRepository.update(id, { saldoPendiente: nuevoSaldo, estado: nuevoEstado }, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.EDITAR, entidad: 'FacturaCliente', entidadId: id,
                datosAnteriores: { saldoPendiente: saldo, estado: factura.estado },
                datosNuevos: { cobro: { monto: datos.monto, metodoPago: datos.metodoPago }, saldoPendiente: nuevoSaldo, estado: nuevoEstado },
                ipAddress: ip,
            }, tx);
            return { cobro, saldoPendiente: nuevoSaldo, estado: nuevoEstado };
        });
    },

    // Solo se anula una factura sin cobros; una con pagos requiere nota de crédito (fuera de alcance)
    async anular(id: number, usuarioId: number, ip?: string) {
        const factura = await obtenerOFallar(id);
        if (factura.estado === EstadoFactura.ANULADA) throw new ConflictError('La factura ya está anulada');
        if (factura.cobros.length > 0) {
            throw new BusinessRuleError('No se puede anular una factura con cobros registrados');
        }

        return enTransaccion(async tx => {
            const actualizada = await facturaRepository.update(id, { estado: EstadoFactura.ANULADA, saldoPendiente: 0 }, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.EDITAR, entidad: 'FacturaCliente', entidadId: id,
                datosAnteriores: { estado: factura.estado, saldoPendiente: Number(factura.saldoPendiente) },
                datosNuevos: { estado: EstadoFactura.ANULADA },
                ipAddress: ip,
            }, tx);
            return actualizada;
        });
    },

    async resumenCartera() {
        const [pendientes, todas] = await Promise.all([facturaRepository.conSaldo(), facturaRepository.findAll()]);
        const cartera = resumirCartera(pendientes.map(f => ({
            clienteId: f.clienteId,
            clienteNombre: f.cliente.nombreRazonSocial,
            saldoPendiente: Number(f.saldoPendiente),
            fechaVencimiento: f.fechaVencimiento,
            estado: f.estado,
        })));

        const vigentes = todas.filter(f => f.estado !== EstadoFactura.ANULADA);
        const totalFacturado = vigentes.reduce((s, f) => s + Number(f.total), 0);
        const totalPendiente = vigentes.reduce((s, f) => s + Number(f.saldoPendiente), 0);

        return {
            ...cartera,
            totalFacturado: redondear(totalFacturado),
            totalCobrado: redondear(totalFacturado - totalPendiente),
            cantidadFacturas: vigentes.length,
            diasBloqueoPorMora: DIAS_BLOQUEO_POR_MORA,
        };
    },

    async viajesFacturables() {
        const viajes = await facturaRepository.viajesFacturables();
        return viajes.map(v => ({ ...v, tarifa: Number(v.tarifa) }));
    },

    // Regla comercial: no se asignan nuevos viajes a clientes con mora superior al plazo de bloqueo
    async verificarClienteSinMora(clienteId: number) {
        const vencimiento = await facturaRepository.vencimientoMasAntiguoConSaldo(clienteId);
        if (!vencimiento) return;
        const { diasDiferencia } = clasificarVencimiento(vencimiento);
        if (diasDiferencia > DIAS_BLOQUEO_POR_MORA) {
            throw new BusinessRuleError(
                `El cliente tiene facturas vencidas hace ${diasDiferencia} días (límite ${DIAS_BLOQUEO_POR_MORA}). Regularice su cartera antes de asignar nuevos viajes`
            );
        }
    },
};
