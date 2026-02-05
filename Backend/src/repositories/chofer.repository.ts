// Repositorio de Choferes - Acceso a BD
import prisma, { Db } from '../config/database';
import { EstadoChofer } from '@prisma/client';

export interface FiltrosChofer {
    busqueda?: string;
    estado?: EstadoChofer;
}

export const choferRepository = {
    async findAll(filtros: FiltrosChofer = {}) {
        const where: any = {};
        if (filtros.busqueda) {
            where.OR = [
                { nombres: { contains: filtros.busqueda, mode: 'insensitive' } },
                { apellidos: { contains: filtros.busqueda, mode: 'insensitive' } },
                { documentoId: { contains: filtros.busqueda, mode: 'insensitive' } }
            ];
        }
        if (filtros.estado) where.estado = filtros.estado;
        return prisma.chofer.findMany({ where, orderBy: { apellidos: 'asc' } });
    },

    async findById(id: number, db: Db = prisma) {
        return db.chofer.findUnique({ where: { id } });
    },

    async findByDocumento(documentoId: string) {
        return prisma.chofer.findUnique({ where: { documentoId } });
    },

    async create(data: any) {
        return prisma.chofer.create({ data });
    },

    async update(id: number, data: any) {
        return prisma.chofer.update({ where: { id }, data });
    },

    async delete(id: number) {
        return prisma.chofer.delete({ where: { id } });
    },

    async countActivos() {
        return prisma.chofer.count({ where: { estado: 'ACTIVO' } });
    },

    async countTotal() {
        return prisma.chofer.count();
    },

    // Choferes activos con su licencia (para el semáforo documental)
    async findParaCumplimiento() {
        return prisma.chofer.findMany({
            where: { estado: 'ACTIVO' },
            select: {
                id: true, nombres: true, apellidos: true, documentoId: true,
                licenciaTipo: true, fechaVencimientoLicencia: true,
            },
            orderBy: { apellidos: 'asc' },
        });
    }
};
