// Repositorio de Neumáticos - Acceso a BD
import prisma, { Db } from '../config/database';
import { EstadoNeumatico, Prisma } from '@prisma/client';

export interface FiltrosNeumatico {
    vehiculoId?: number;
    estado?: EstadoNeumatico;
    busqueda?: string;
}

const incluirVehiculo = { vehiculo: { select: { id: true, placa: true, marca: true, modelo: true, kilometrajeActual: true } } };

export const neumaticoRepository = {
    async findAll(filtros: FiltrosNeumatico = {}, db: Db = prisma) {
        const where: Prisma.NeumaticoWhereInput = {};
        if (filtros.vehiculoId !== undefined) where.vehiculoId = filtros.vehiculoId;
        if (filtros.estado) where.estado = filtros.estado;
        if (filtros.busqueda) {
            where.OR = [
                { codigoSerie: { contains: filtros.busqueda, mode: 'insensitive' } },
                { marca: { contains: filtros.busqueda, mode: 'insensitive' } },
                { modelo: { contains: filtros.busqueda, mode: 'insensitive' } },
            ];
        }
        return db.neumatico.findMany({
            where,
            include: { ...incluirVehiculo, inspecciones: { orderBy: { fecha: 'desc' }, take: 1 } },
            orderBy: [{ vehiculoId: 'asc' }, { posicionActual: 'asc' }, { codigoSerie: 'asc' }],
        });
    },

    async findById(id: number, db: Db = prisma) {
        return db.neumatico.findUnique({
            where: { id },
            include: { ...incluirVehiculo, inspecciones: { orderBy: { fecha: 'desc' }, take: 30 } },
        });
    },

    async findByCodigo(codigoSerie: string, db: Db = prisma) {
        return db.neumatico.findUnique({ where: { codigoSerie } });
    },

    // Neumático que ocupa una posición del vehículo (para evitar dos llantas en el mismo lugar)
    async findEnPosicion(vehiculoId: number, posicion: string, excluirId?: number, db: Db = prisma) {
        return db.neumatico.findFirst({
            where: {
                vehiculoId,
                posicionActual: posicion,
                estado: { not: EstadoNeumatico.DESECHO },
                ...(excluirId ? { id: { not: excluirId } } : {}),
            },
        });
    },

    async create(datos: Prisma.NeumaticoUncheckedCreateInput, db: Db = prisma) {
        return db.neumatico.create({ data: datos, include: incluirVehiculo });
    },

    async update(id: number, datos: Prisma.NeumaticoUncheckedUpdateInput, db: Db = prisma) {
        return db.neumatico.update({ where: { id }, data: datos, include: incluirVehiculo });
    },

    async crearInspeccion(datos: Prisma.InspeccionNeumaticoUncheckedCreateInput, db: Db = prisma) {
        return db.inspeccionNeumatico.create({ data: datos });
    },

    // Los kilómetros de un viaje completado se acreditan a las llantas montadas en el vehículo
    async sumarKilometrosVehiculo(vehiculoId: number, kilometros: number, db: Db = prisma) {
        if (kilometros <= 0) return { count: 0 };
        return db.neumatico.updateMany({
            where: { vehiculoId, estado: EstadoNeumatico.EN_USO, posicionActual: { not: 'REPUESTO' } },
            data: { kilometrosRecorridos: { increment: Math.round(kilometros) } },
        });
    },

    async totalesPorEstado(db: Db = prisma) {
        return db.neumatico.groupBy({ by: ['estado'], _count: { id: true }, _sum: { costoCompra: true } });
    },
};
