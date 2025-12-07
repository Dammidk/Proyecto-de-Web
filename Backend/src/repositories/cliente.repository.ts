// Repositorio de Clientes - Acceso a BD
import prisma from '../config/database';
import { EstadoCliente } from '@prisma/client';

export interface FiltrosCliente {
    busqueda?: string;
    estado?: EstadoCliente;
}

export const clienteRepository = {
    async findAll(filtros: FiltrosCliente = {}) {
        const where: any = {};
        if (filtros.busqueda) {
            where.OR = [
                { nombreRazonSocial: { contains: filtros.busqueda, mode: 'insensitive' } },
                { documentoId: { contains: filtros.busqueda, mode: 'insensitive' } }
            ];
        }
        if (filtros.estado) where.estado = filtros.estado;
        return prisma.cliente.findMany({ where, orderBy: { nombreRazonSocial: 'asc' } });
    },

    async findById(id: number) {
        return prisma.cliente.findUnique({ where: { id } });
    },

    async findByDocumento(documentoId: string) {
        return prisma.cliente.findUnique({ where: { documentoId } });
    },

    async create(data: any) {
        return prisma.cliente.create({ data });
    },

    async update(id: number, data: any) {
        return prisma.cliente.update({ where: { id }, data });
    },

    async delete(id: number) {
        return prisma.cliente.delete({ where: { id } });
    },

    async countActivos() {
        return prisma.cliente.count({ where: { estado: 'ACTIVO' } });
    },

    async countTotal() {
        return prisma.cliente.count();
    }
};
