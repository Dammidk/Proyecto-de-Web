// Repositorio de Gastos de Viaje - Acceso a BD
import prisma from '../config/database';
import { TipoGasto, MetodoPago, TipoComprobante } from '@prisma/client';

export interface DatosCrearGasto {
    viajeId: number;
    tipoGasto: TipoGasto;
    monto: number;
    fecha: Date;
    metodoPago?: MetodoPago;
    descripcion?: string;
}

export interface DatosComprobante {
    tipo: TipoComprobante;
    referenciaId?: number;
    url: string;
    publicId: string;
    nombreArchivoOriginal: string;
}

export const gastosRepository = {
    async findByViajeId(viajeId: number) {
        return prisma.gastoViaje.findMany({
            where: { viajeId },
            include: {
                comprobante: true,
            },
            orderBy: { fecha: 'desc' },
        });
    },

    async findById(id: number) {
        return prisma.gastoViaje.findUnique({
            where: { id },
            include: { comprobante: true },
        });
    },

    async create(datos: DatosCrearGasto, comprobanteId?: number) {
        return prisma.gastoViaje.create({
            data: {
                viajeId: datos.viajeId,
                tipoGasto: datos.tipoGasto,
                monto: datos.monto,
                fecha: datos.fecha,
                metodoPago: datos.metodoPago || MetodoPago.EFECTIVO,
                descripcion: datos.descripcion,
                comprobanteId,
            },
            include: { comprobante: true },
        });
    },

    async update(id: number, datos: Partial<DatosCrearGasto>) {
        return prisma.gastoViaje.update({
            where: { id },
            data: datos,
            include: { comprobante: true },
        });
    },

    async delete(id: number) {
        return prisma.gastoViaje.delete({ where: { id } });
    },

    // Crear comprobante
    async createComprobante(datos: DatosComprobante) {
        return prisma.comprobante.create({
            data: {
                tipo: datos.tipo,
                referenciaId: datos.referenciaId,
                url: datos.url,
                publicId: datos.publicId,
                nombreArchivoOriginal: datos.nombreArchivoOriginal,
            },
        });
    },

    // Sumar gastos de un viaje
    async sumarGastosViaje(viajeId: number): Promise<number> {
        const result = await prisma.gastoViaje.aggregate({
            where: { viajeId },
            _sum: { monto: true },
        });
        return Number(result._sum.monto) || 0;
    },

    // Gastos totales del mes (para dashboard)
    async getGastosMensuales(anio: number, mes: number): Promise<number> {
        const inicioMes = new Date(anio, mes - 1, 1);
        const finMes = new Date(anio, mes, 0, 23, 59, 59);

        const result = await prisma.gastoViaje.aggregate({
            where: {
                fecha: { gte: inicioMes, lte: finMes },
            },
            _sum: { monto: true },
        });

        return Number(result._sum.monto) || 0;
    },
};
