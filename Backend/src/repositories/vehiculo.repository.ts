// Repositorio de Vehículos - Acceso a BD
import prisma from '../config/database';
import { EstadoVehiculo } from '@prisma/client';

export interface FiltrosVehiculo {
    busqueda?: string;
    estado?: EstadoVehiculo;
}

export const vehiculoRepository = {
    async findAll(filtros: FiltrosVehiculo = {}) {
        const where: any = {};
        if (filtros.busqueda) {
            where.OR = [
                { placa: { contains: filtros.busqueda, mode: 'insensitive' } },
                { marca: { contains: filtros.busqueda, mode: 'insensitive' } },
                { modelo: { contains: filtros.busqueda, mode: 'insensitive' } }
            ];
        }
        if (filtros.estado) where.estado = filtros.estado;
        return prisma.vehiculo.findMany({ where, orderBy: { placa: 'asc' } });
    },

    async findById(id: number) {
        return prisma.vehiculo.findUnique({ where: { id } });
    },

    async findByPlaca(placa: string) {
        return prisma.vehiculo.findUnique({ where: { placa } });
    },

    async create(data: any) {
        return prisma.vehiculo.create({ data });
    },

    async update(id: number, data: any) {
        return prisma.vehiculo.update({ where: { id }, data });
    },

    async delete(id: number) {
        return prisma.vehiculo.delete({ where: { id } });
    },

    async countActivos() {
        return prisma.vehiculo.count({ where: { estado: 'ACTIVO' } });
    },

    async countTotal() {
        return prisma.vehiculo.count();
    }
};
