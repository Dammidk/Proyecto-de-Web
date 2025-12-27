// Repositorio de Viajes - Acceso a BD
import prisma from '../config/database';
import { EstadoViaje, Prisma } from '@prisma/client';

export interface FiltrosViajes {
    estado?: EstadoViaje;
    vehiculoId?: number;
    choferId?: number;
    clienteId?: number;
    fechaDesde?: Date;
    fechaHasta?: Date;
    skip?: number;
    take?: number;
}

export interface DatosCrearViaje {
    vehiculoId: number;
    choferId: number;
    clienteId: number;
    materialId: number;
    origen: string;
    destino: string;
    fechaSalida: Date;
    fechaLlegadaEstimada?: Date;
    kilometrosEstimados?: number;
    tarifa: number;
    observaciones?: string;
}

export interface DatosActualizarViaje {
    origen?: string;
    destino?: string;
    fechaSalida?: Date;
    fechaLlegadaEstimada?: Date;
    fechaLlegadaReal?: Date;
    kilometrosEstimados?: number;
    kilometrosReales?: number;
    tarifa?: number;
    observaciones?: string;
    estado?: EstadoViaje;
}

export const viajesRepository = {
    async findAll(filtros: FiltrosViajes = {}) {
        const where: Prisma.ViajeWhereInput = {};

        if (filtros.estado) where.estado = filtros.estado;
        if (filtros.vehiculoId) where.vehiculoId = filtros.vehiculoId;
        if (filtros.choferId) where.choferId = filtros.choferId;
        if (filtros.clienteId) where.clienteId = filtros.clienteId;

        if (filtros.fechaDesde || filtros.fechaHasta) {
            where.fechaSalida = {};
            if (filtros.fechaDesde) where.fechaSalida.gte = filtros.fechaDesde;
            if (filtros.fechaHasta) where.fechaSalida.lte = filtros.fechaHasta;
        }

        const [viajes, total] = await Promise.all([
            prisma.viaje.findMany({
                where,
                include: {
                    vehiculo: { select: { id: true, placa: true, marca: true, modelo: true } },
                    chofer: { select: { id: true, nombres: true, apellidos: true, telefono: true } },
                    cliente: { select: { id: true, nombreRazonSocial: true } },
                    material: { select: { id: true, nombre: true } },
                },
                orderBy: { fechaSalida: 'desc' },
                skip: filtros.skip || 0,
                take: filtros.take || 50,
            }),
            prisma.viaje.count({ where }),
        ]);

        return { viajes, total };
    },

    async findById(id: number) {
        return prisma.viaje.findUnique({
            where: { id },
            include: {
                vehiculo: { select: { id: true, placa: true, marca: true, modelo: true, tipo: true } },
                chofer: { select: { id: true, nombres: true, apellidos: true, telefono: true, correo: true } },
                cliente: { select: { id: true, nombreRazonSocial: true, telefono: true, correo: true } },
                material: { select: { id: true, nombre: true, unidadMedida: true, esPeligroso: true } },
                gastos: {
                    include: {
                        comprobante: true,
                    },
                    orderBy: { fecha: 'desc' },
                },
            },
        });
    },

    async create(datos: DatosCrearViaje) {
        return prisma.viaje.create({
            data: {
                vehiculoId: datos.vehiculoId,
                choferId: datos.choferId,
                clienteId: datos.clienteId,
                materialId: datos.materialId,
                origen: datos.origen,
                destino: datos.destino,
                fechaSalida: datos.fechaSalida,
                fechaLlegadaEstimada: datos.fechaLlegadaEstimada,
                kilometrosEstimados: datos.kilometrosEstimados,
                tarifa: datos.tarifa,
                observaciones: datos.observaciones,
                estado: EstadoViaje.PLANIFICADO,
            },
        });
    },

    async update(id: number, datos: DatosActualizarViaje) {
        return prisma.viaje.update({
            where: { id },
            data: datos,
        });
    },

    async delete(id: number) {
        return prisma.viaje.delete({ where: { id } });
    },

    // Verificar que existan entidades relacionadas
    async validarEntidadesRelacionadas(vehiculoId: number, choferId: number, clienteId: number, materialId: number) {
        const [vehiculo, chofer, cliente, material] = await Promise.all([
            prisma.vehiculo.findFirst({ where: { id: vehiculoId, estado: 'ACTIVO' } }),
            prisma.chofer.findFirst({ where: { id: choferId, estado: 'ACTIVO' } }),
            prisma.cliente.findFirst({ where: { id: clienteId, estado: 'ACTIVO' } }),
            prisma.material.findUnique({ where: { id: materialId } }),
        ]);

        const errores: string[] = [];
        if (!vehiculo) errores.push('Vehículo no encontrado o inactivo');
        if (!chofer) errores.push('Chofer no encontrado o inactivo');
        if (!cliente) errores.push('Cliente no encontrado o inactivo');
        if (!material) errores.push('Material no encontrado');

        return { valido: errores.length === 0, errores };
    },

    // Estadísticas para dashboard
    async getEstadisticasMensuales(anio: number, mes: number) {
        const inicioMes = new Date(anio, mes - 1, 1);
        const finMes = new Date(anio, mes, 0, 23, 59, 59);

        const [viajesCompletados, totalViajes] = await Promise.all([
            prisma.viaje.findMany({
                where: {
                    estado: EstadoViaje.COMPLETADO,
                    fechaSalida: { gte: inicioMes, lte: finMes },
                },
                select: { tarifa: true },
            }),
            prisma.viaje.count({
                where: {
                    fechaSalida: { gte: inicioMes, lte: finMes },
                },
            }),
        ]);

        const ingresosTotales = viajesCompletados.reduce(
            (sum, v) => sum + Number(v.tarifa),
            0
        );

        return {
            totalViajes,
            viajesCompletados: viajesCompletados.length,
            ingresosTotales,
        };
    },
};
