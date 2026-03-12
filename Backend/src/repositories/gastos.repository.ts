// Repositorio de Gastos de Viaje - Acceso a BD
import prisma, { Db } from '../config/database';
import { TipoGasto, MetodoPago, TipoComprobante } from '@prisma/client';

export interface DatosCrearGasto {
    viajeId: number;
    tipoGasto: TipoGasto;
    monto: number;
    fecha: Date;
    metodoPago?: MetodoPago;
    descripcion?: string | null;
    // Control de combustible
    galones?: number | null;
    precioPorGalon?: number | null;
    estacionServicio?: string | null;
    kilometrajeAlCargar?: number | null;
}

export type DatosActualizarGasto = Partial<Omit<DatosCrearGasto, 'viajeId'>>;

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

    async findById(id: number, db: Db = prisma) {
        return db.gastoViaje.findUnique({
            where: { id },
            include: { comprobante: true, viaje: { select: { id: true, estado: true } } },
        });
    },

    async create(datos: DatosCrearGasto, comprobanteId: number | undefined, db: Db = prisma) {
        return db.gastoViaje.create({
            data: {
                viajeId: datos.viajeId,
                tipoGasto: datos.tipoGasto,
                monto: datos.monto,
                fecha: datos.fecha,
                metodoPago: datos.metodoPago || MetodoPago.EFECTIVO,
                descripcion: datos.descripcion ?? null,
                galones: datos.galones ?? null,
                precioPorGalon: datos.precioPorGalon ?? null,
                estacionServicio: datos.estacionServicio ?? null,
                kilometrajeAlCargar: datos.kilometrajeAlCargar ?? null,
                comprobanteId,
            },
            include: { comprobante: true },
        });
    },

    async update(id: number, datos: DatosActualizarGasto, db: Db = prisma) {
        return db.gastoViaje.update({
            where: { id },
            data: datos,
            include: { comprobante: true },
        });
    },

    async delete(id: number, db: Db = prisma) {
        return db.gastoViaje.delete({ where: { id } });
    },

    async createComprobante(datos: DatosComprobante, db: Db = prisma) {
        return db.comprobante.create({
            data: {
                tipo: datos.tipo,
                referenciaId: datos.referenciaId,
                url: datos.url,
                publicId: datos.publicId,
                nombreArchivoOriginal: datos.nombreArchivoOriginal,
            },
        });
    },

    async setReferenciaComprobante(comprobanteId: number, referenciaId: number, db: Db = prisma) {
        return db.comprobante.update({ where: { id: comprobanteId }, data: { referenciaId } });
    },

    async deleteComprobante(comprobanteId: number, db: Db = prisma) {
        return db.comprobante.delete({ where: { id: comprobanteId } });
    },

    // Sumar gastos de un viaje
    async sumarGastosViaje(viajeId: number): Promise<number> {
        const result = await prisma.gastoViaje.aggregate({
            where: { viajeId },
            _sum: { monto: true },
        });
        return Number(result._sum.monto) || 0;
    },

    // Gastos totales del mes (para dashboard). Incluye viajes cancelados: el dinero ya se gastó
    async getGastosMensuales(anio: number, mes: number): Promise<number> {
        const inicioMes = new Date(anio, mes - 1, 1);
        const finMes = new Date(anio, mes, 0, 23, 59, 59, 999);

        const result = await prisma.gastoViaje.aggregate({
            where: {
                fecha: { gte: inicioMes, lte: finMes },
            },
            _sum: { monto: true },
        });

        return Number(result._sum.monto) || 0;
    },
};
