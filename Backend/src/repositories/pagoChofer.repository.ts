// Repositorio de Pagos a Choferes - Acceso a BD
import prisma, { Db } from '../config/database';
import { TipoPagoChofer, MetodoPago, EstadoViaje } from '@prisma/client';
import { calcularLiquidacion } from '../domain/finanzas';
import { NotFoundError } from '../utils/errors';

export interface FiltrosPagoChofer {
    choferId?: number;
    viajeId?: number;
    tipoPago?: TipoPagoChofer;
    metodoPago?: MetodoPago;
    fechaDesde?: Date;
    fechaHasta?: Date;
    busqueda?: string;
}

export interface DatosCrearPagoChofer {
    choferId: number;
    viajeId?: number | null;
    tipoPago: TipoPagoChofer;
    monto: number;
    fecha: Date;
    metodoPago?: MetodoPago;
    descripcion?: string;
    urlComprobante?: string;
}

export const pagoChoferRepository = {
    async findAll(filtros: FiltrosPagoChofer = {}) {
        const where: any = {};

        if (filtros.choferId) {
            where.choferId = filtros.choferId;
        }

        if (filtros.viajeId) {
            where.viajeId = filtros.viajeId;
        }

        if (filtros.tipoPago) {
            where.tipoPago = filtros.tipoPago;
        }

        if (filtros.metodoPago) {
            where.metodoPago = filtros.metodoPago;
        }

        if (filtros.fechaDesde || filtros.fechaHasta) {
            where.fecha = {};
            if (filtros.fechaDesde) where.fecha.gte = filtros.fechaDesde;
            if (filtros.fechaHasta) where.fecha.lte = filtros.fechaHasta;
        }

        if (filtros.busqueda) {
            where.OR = [
                { descripcion: { contains: filtros.busqueda, mode: 'insensitive' } },
                {
                    chofer: {
                        OR: [
                            { nombres: { contains: filtros.busqueda, mode: 'insensitive' } },
                            { apellidos: { contains: filtros.busqueda, mode: 'insensitive' } },
                            { documentoId: { contains: filtros.busqueda, mode: 'insensitive' } },
                        ],
                    },
                },
            ];
        }

        return prisma.pagoChofer.findMany({
            where,
            include: {
                chofer: {
                    select: {
                        id: true,
                        nombres: true,
                        apellidos: true,
                        documentoId: true,
                        modalidadPago: true,
                        banco: true,
                        numeroCuenta: true,
                        sueldoMensual: true,
                    },
                },
                viaje: {
                    select: {
                        id: true,
                        origen: true,
                        destino: true,
                        tarifa: true,
                        estado: true,
                        fechaSalida: true,
                    },
                },
            },
            orderBy: { fecha: 'desc' },
        });
    },

    async findById(id: number, db: Db = prisma) {
        return db.pagoChofer.findUnique({
            where: { id },
            include: {
                chofer: true,
                viaje: true,
            },
        });
    },

    async create(data: DatosCrearPagoChofer, db: Db = prisma) {
        return db.pagoChofer.create({
            data: {
                choferId: data.choferId,
                viajeId: data.viajeId ?? null,
                tipoPago: data.tipoPago,
                monto: data.monto,
                fecha: data.fecha,
                metodoPago: data.metodoPago || MetodoPago.EFECTIVO,
                descripcion: data.descripcion,
                urlComprobante: data.urlComprobante,
            },
            include: {
                chofer: true,
                viaje: true,
            },
        });
    },

    async update(id: number, data: Partial<DatosCrearPagoChofer>, db: Db = prisma) {
        return db.pagoChofer.update({
            where: { id },
            data,
            include: {
                chofer: true,
                viaje: true,
            },
        });
    },

    async delete(id: number, db: Db = prisma) {
        return db.pagoChofer.delete({
            where: { id },
        });
    },

    // Costo de nómina del mes. Los ANTICIPOS no se suman: ese dinero se rinde con gastos de viaje,
    // que ya se cuentan como costo (sumarlos sería contar el mismo gasto dos veces)
    async getPagosMensuales(anio: number, mes: number): Promise<number> {
        const fechaInicio = new Date(anio, mes - 1, 1);
        const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999);

        const resultado = await prisma.pagoChofer.aggregate({
            _sum: {
                monto: true,
            },
            where: {
                fecha: {
                    gte: fechaInicio,
                    lte: fechaFin,
                },
                tipoPago: { not: TipoPagoChofer.ANTICIPO },
            },
        });

        return Number(resultado._sum.monto || 0);
    },

    async getResumenChofer(choferId: number) {
        const [chofer, pagos, viajes] = await Promise.all([
            prisma.chofer.findUnique({
                where: { id: choferId },
            }),
            prisma.pagoChofer.findMany({
                where: { choferId },
                orderBy: { fecha: 'desc' },
            }),
            prisma.viaje.findMany({
                where: { choferId },
                include: {
                    gastos: true,
                    pagosChofer: true,
                },
                orderBy: { fechaSalida: 'desc' },
            }),
        ]);

        if (!chofer) {
            throw new NotFoundError(`Chofer con ID ${choferId} no encontrado`);
        }

        // Desglose de pagos realizados
        let totalPagado = 0;
        let totalAnticipos = 0;
        let totalSueldo = 0;
        let totalPorViaje = 0;
        let totalLiquidaciones = 0;

        for (const p of pagos) {
            const monto = Number(p.monto);
            totalPagado += monto;
            if (p.tipoPago === TipoPagoChofer.ANTICIPO) totalAnticipos += monto;
            else if (p.tipoPago === TipoPagoChofer.SUELDO_MENSUAL) totalSueldo += monto;
            else if (p.tipoPago === TipoPagoChofer.POR_VIAJE) totalPorViaje += monto;
            else if (p.tipoPago === TipoPagoChofer.LIQUIDACION) totalLiquidaciones += monto;
        }

        // Desglose de viajes
        const viajesCompletados = viajes.filter(v => v.estado === EstadoViaje.COMPLETADO);
        const viajesEnCurso = viajes.filter(v => v.estado === EstadoViaje.EN_CURSO);
        const viajesPlanificados = viajes.filter(v => v.estado === EstadoViaje.PLANIFICADO);

        let totalGastosEnRuta = 0;
        for (const v of viajes) {
            for (const g of v.gastos) {
                totalGastosEnRuta += Number(g.monto);
            }
        }

        return {
            chofer: {
                id: chofer.id,
                nombres: chofer.nombres,
                apellidos: chofer.apellidos,
                documentoId: chofer.documentoId,
                modalidadPago: chofer.modalidadPago,
                metodoPago: chofer.metodoPago,
                banco: chofer.banco,
                numeroCuenta: chofer.numeroCuenta,
                sueldoMensual: Number(chofer.sueldoMensual || 0),
                estado: chofer.estado,
            },
            pagos: {
                totalPagado,
                totalAnticipos,
                totalSueldo,
                totalPorViaje,
                totalLiquidaciones,
                cantidadPagos: pagos.length,
                ultimosPagos: pagos.slice(0, 5),
            },
            viajes: {
                total: viajes.length,
                completados: viajesCompletados.length,
                enCurso: viajesEnCurso.length,
                planificados: viajesPlanificados.length,
                totalGastosEnRuta,
                ultimosViajes: viajes.slice(0, 5).map(v => ({
                    id: v.id,
                    origen: v.origen,
                    destino: v.destino,
                    tarifa: Number(v.tarifa),
                    estado: v.estado,
                    fechaSalida: v.fechaSalida,
                    totalGastos: v.gastos.reduce((acc, g) => acc + Number(g.monto), 0),
                    pagadoAlChofer: v.pagosChofer.reduce((acc, p) => acc + Number(p.monto), 0),
                })),
            },
            balance: {
                totalPagado,
                // Saldo de anticipos aún no rendidos con gastos en efectivo (> 0: el chofer debe devolver)
                anticiposPendientes: viajes.reduce((acc, v) => {
                    const liq = calcularLiquidacion(v.gastos, v.pagosChofer);
                    return acc + (liq.anticipos > 0 ? liq.saldo : 0);
                }, 0),
                sueldoMensualBase: Number(chofer.sueldoMensual || 0),
            },
        };
    },
};
