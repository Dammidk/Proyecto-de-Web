// Repositorio de Facturación y Cuentas por Cobrar - Acceso a BD
import prisma, { Db } from '../config/database';
import { EstadoFactura, Prisma } from '@prisma/client';

export interface FiltrosFactura {
    clienteId?: number;
    estado?: EstadoFactura;
    desde?: Date;
    hasta?: Date;
}

const incluir = {
    cliente: { select: { id: true, nombreRazonSocial: true, documentoId: true, telefono: true, correo: true } },
    viaje: { select: { id: true, origen: true, destino: true, fechaSalida: true, tarifa: true } },
    cobros: { orderBy: { fecha: 'desc' as const } },
};

export const facturaRepository = {
    async findAll(filtros: FiltrosFactura = {}, db: Db = prisma) {
        const where: Prisma.FacturaClienteWhereInput = {};
        if (filtros.clienteId) where.clienteId = filtros.clienteId;
        if (filtros.estado) where.estado = filtros.estado;
        if (filtros.desde || filtros.hasta) {
            where.fechaEmision = {};
            if (filtros.desde) where.fechaEmision.gte = filtros.desde;
            if (filtros.hasta) where.fechaEmision.lte = filtros.hasta;
        }
        return db.facturaCliente.findMany({ where, include: incluir, orderBy: { fechaEmision: 'desc' } });
    },

    async findById(id: number, db: Db = prisma) {
        return db.facturaCliente.findUnique({ where: { id }, include: incluir });
    },

    async findByNumero(numeroFactura: string, db: Db = prisma) {
        return db.facturaCliente.findUnique({ where: { numeroFactura } });
    },

    async ultimoNumero(db: Db = prisma) {
        const ultima = await db.facturaCliente.findFirst({
            where: { numeroFactura: { startsWith: '001-' } },
            orderBy: { numeroFactura: 'desc' },
            select: { numeroFactura: true },
        });
        return ultima?.numeroFactura ?? null;
    },

    // Factura vigente (no anulada) asociada a un viaje
    async findPorViaje(viajeId: number, db: Db = prisma) {
        return db.facturaCliente.findFirst({ where: { viajeId, estado: { not: EstadoFactura.ANULADA } } });
    },

    async create(datos: Prisma.FacturaClienteUncheckedCreateInput, db: Db = prisma) {
        return db.facturaCliente.create({ data: datos, include: incluir });
    },

    async update(id: number, datos: Prisma.FacturaClienteUncheckedUpdateInput, db: Db = prisma) {
        return db.facturaCliente.update({ where: { id }, data: datos, include: incluir });
    },

    async crearCobro(datos: Prisma.CobroFacturaUncheckedCreateInput, db: Db = prisma) {
        return db.cobroFactura.create({ data: datos });
    },

    // Facturas con saldo para el reporte de antigüedad
    async conSaldo(db: Db = prisma) {
        return db.facturaCliente.findMany({
            where: { estado: { in: [EstadoFactura.PENDIENTE, EstadoFactura.PAGADA_PARCIAL] } },
            select: {
                clienteId: true, saldoPendiente: true, fechaVencimiento: true, estado: true,
                cliente: { select: { nombreRazonSocial: true } },
            },
        });
    },

    // Fecha de vencimiento más antigua con saldo pendiente de un cliente
    async vencimientoMasAntiguoConSaldo(clienteId: number, db: Db = prisma) {
        const factura = await db.facturaCliente.findFirst({
            where: {
                clienteId,
                estado: { in: [EstadoFactura.PENDIENTE, EstadoFactura.PAGADA_PARCIAL] },
                saldoPendiente: { gt: 0 },
            },
            orderBy: { fechaVencimiento: 'asc' },
            select: { fechaVencimiento: true },
        });
        return factura?.fechaVencimiento ?? null;
    },

    async viajeParaFacturar(viajeId: number, db: Db = prisma) {
        return db.viaje.findUnique({
            where: { id: viajeId },
            select: { id: true, clienteId: true, estado: true, tarifa: true, origen: true, destino: true },
        });
    },

    async viajesFacturables(db: Db = prisma) {
        return db.viaje.findMany({
            where: { estado: 'COMPLETADO', facturas: { none: { estado: { not: EstadoFactura.ANULADA } } } },
            select: {
                id: true, origen: true, destino: true, tarifa: true, fechaSalida: true, clienteId: true,
                cliente: { select: { nombreRazonSocial: true } },
            },
            orderBy: { fechaSalida: 'desc' },
            take: 200,
        });
    },
};
