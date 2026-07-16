// Repositorio de Repuestos y Kardex - Acceso a BD
import prisma, { Db } from '../config/database';
import { CategoriaRepuesto, Prisma } from '@prisma/client';

export interface FiltrosRepuesto {
    categoria?: CategoriaRepuesto;
    busqueda?: string;
}

export const repuestoRepository = {
    async findAll(filtros: FiltrosRepuesto = {}, db: Db = prisma) {
        const where: Prisma.RepuestoWhereInput = {};
        if (filtros.categoria) where.categoria = filtros.categoria;
        if (filtros.busqueda) {
            where.OR = [
                { codigo: { contains: filtros.busqueda, mode: 'insensitive' } },
                { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },
            ];
        }
        return db.repuesto.findMany({ where, orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }] });
    },

    async findById(id: number, db: Db = prisma) {
        return db.repuesto.findUnique({
            where: { id },
            include: {
                movimientos: {
                    orderBy: { fecha: 'desc' },
                    take: 50,
                    include: {
                        usuario: { select: { nombreCompleto: true } },
                        vehiculo: { select: { placa: true } },
                    },
                },
            },
        });
    },

    async findByCodigo(codigo: string, db: Db = prisma) {
        return db.repuesto.findUnique({ where: { codigo } });
    },

    async create(datos: Prisma.RepuestoUncheckedCreateInput, db: Db = prisma) {
        return db.repuesto.create({ data: datos });
    },

    async update(id: number, datos: Prisma.RepuestoUncheckedUpdateInput, db: Db = prisma) {
        return db.repuesto.update({ where: { id }, data: datos });
    },

    async crearMovimiento(datos: Prisma.MovimientoRepuestoUncheckedCreateInput, db: Db = prisma) {
        return db.movimientoRepuesto.create({ data: datos });
    },

    async findBasico(id: number, db: Db = prisma) {
        return db.repuesto.findUnique({ where: { id } });
    },

    // Aplica la variación solo si el stock no queda negativo; devuelve el nuevo stock o null si no alcanza
    async ajustarStockAtomico(id: number, delta: number, db: Db = prisma): Promise<number | null> {
        const where: Prisma.RepuestoWhereInput = delta < 0 ? { id, stockActual: { gte: -delta } } : { id };
        const { count } = await db.repuesto.updateMany({ where, data: { stockActual: { increment: delta } } });
        if (count === 0) return null;
        const r = await db.repuesto.findUnique({ where: { id }, select: { stockActual: true } });
        return r?.stockActual ?? null;
    },

    async contarMovimientos(repuestoId: number, db: Db = prisma) {
        return db.movimientoRepuesto.count({ where: { repuestoId } });
    },

    async delete(id: number, db: Db = prisma) {
        return db.repuesto.delete({ where: { id } });
    },

    async movimientosRecientes(take = 12, db: Db = prisma) {
        return db.movimientoRepuesto.findMany({
            orderBy: { fecha: 'desc' },
            take,
            include: {
                repuesto: { select: { codigo: true, nombre: true } },
                usuario: { select: { nombreCompleto: true } },
                vehiculo: { select: { placa: true } },
            },
        });
    },
};
