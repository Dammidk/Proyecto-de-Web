// Repositorio de Vehículos - Acceso a BD
import prisma, { Db } from '../config/database';
import { EstadoVehiculo, Prisma } from '@prisma/client';

export interface FiltrosVehiculo {
    busqueda?: string;
    estado?: EstadoVehiculo;
}

export const vehiculoRepository = {
    async findAll(filtros: FiltrosVehiculo = {}) {
        const where: Prisma.VehiculoWhereInput = {};
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

    async findById(id: number, db: Db = prisma) {
        return db.vehiculo.findUnique({ where: { id } });
    },

    async findByPlaca(placa: string) {
        return prisma.vehiculo.findUnique({ where: { placa } });
    },

    async create(data: Prisma.VehiculoCreateInput, db: Db = prisma) {
        return db.vehiculo.create({ data });
    },

    async update(id: number, data: Prisma.VehiculoUpdateInput, db: Db = prisma) {
        return db.vehiculo.update({ where: { id }, data });
    },

    async delete(id: number, db: Db = prisma) {
        return db.vehiculo.delete({ where: { id } });
    },

    async countActivos() {
        return prisma.vehiculo.count({ where: { estado: 'ACTIVO' } });
    },

    async countTotal() {
        return prisma.vehiculo.count();
    },

    // Vehículos operativos con sus fechas de vencimiento (para el semáforo documental)
    async findParaCumplimiento() {
        return prisma.vehiculo.findMany({
            where: { estado: { not: EstadoVehiculo.INACTIVO } },
            select: {
                id: true, placa: true, marca: true, modelo: true, estado: true,
                fechaVencimientoSoat: true, fechaVencimientoSeguro: true,
                fechaVencimientoMatricula: true, fechaVencimientoRevisionTecnica: true,
            },
            orderBy: { placa: 'asc' },
        });
    },
};
