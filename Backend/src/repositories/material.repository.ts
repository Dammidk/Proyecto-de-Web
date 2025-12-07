// Repositorio de Materiales - Acceso a BD
import prisma from '../config/database';

export interface FiltrosMaterial {
    busqueda?: string;
}

export const materialRepository = {
    async findAll(filtros: FiltrosMaterial = {}) {
        const where: any = {};
        if (filtros.busqueda) {
            where.nombre = { contains: filtros.busqueda, mode: 'insensitive' };
        }
        return prisma.material.findMany({ where, orderBy: { nombre: 'asc' } });
    },

    async findById(id: number) {
        return prisma.material.findUnique({ where: { id } });
    },

    async findByNombre(nombre: string) {
        return prisma.material.findUnique({ where: { nombre } });
    },

    async create(data: any) {
        return prisma.material.create({ data });
    },

    async update(id: number, data: any) {
        return prisma.material.update({ where: { id }, data });
    },

    async delete(id: number) {
        return prisma.material.delete({ where: { id } });
    },

    async countTotal() {
        return prisma.material.count();
    }
};
