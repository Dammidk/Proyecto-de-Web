// Repositorio de Viajes - Acceso a BD
import prisma, { Db } from '../config/database';
import { EstadoViaje, Prisma } from '@prisma/client';

export interface FiltrosViajes {
    estado?: EstadoViaje;
    vehiculoId?: number;
    choferId?: number;
    clienteId?: number;
    fechaDesde?: Date;
    fechaHasta?: Date;
    busqueda?: string;
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
    fechaLlegadaEstimada?: Date | null;
    kilometrosEstimados?: number | null;
    tarifa: number;
    observaciones?: string | null;
}

export interface DatosActualizarViaje {
    vehiculoId?: number;
    choferId?: number;
    clienteId?: number;
    materialId?: number;
    origen?: string;
    destino?: string;
    fechaSalida?: Date;
    fechaLlegadaEstimada?: Date | null;
    fechaLlegadaReal?: Date | null;
    kilometrosEstimados?: number | null;
    kilometrosReales?: number | null;
    tarifa?: number;
    observaciones?: string | null;
    estado?: EstadoViaje;
}

const includeListado = {
    vehiculo: { select: { id: true, placa: true, marca: true, modelo: true } },
    chofer: { select: { id: true, nombres: true, apellidos: true, telefono: true } },
    cliente: { select: { id: true, nombreRazonSocial: true } },
    material: { select: { id: true, nombre: true, esPeligroso: true } },
} satisfies Prisma.ViajeInclude;

const includeDetalle = {
    vehiculo: { select: { id: true, placa: true, marca: true, modelo: true, tipo: true, capacidad: true, rendimientoEsperadoKmGal: true } },
    chofer: { select: { id: true, nombres: true, apellidos: true, documentoId: true, telefono: true, correo: true, licenciaTipo: true } },
    cliente: { select: { id: true, nombreRazonSocial: true, documentoId: true, telefono: true, correo: true, direccion: true } },
    material: { select: { id: true, nombre: true, unidadMedida: true, esPeligroso: true } },
    gastos: {
        include: { comprobante: true },
        orderBy: { fecha: 'desc' },
    },
    pagosChofer: { orderBy: { fecha: 'desc' } },
} satisfies Prisma.ViajeInclude;

export type ViajeDetalle = Prisma.ViajeGetPayload<{ include: typeof includeDetalle }>;

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

        if (filtros.busqueda) {
            const q = { contains: filtros.busqueda, mode: 'insensitive' as const };
            where.OR = [
                { origen: q },
                { destino: q },
                { vehiculo: { placa: q } },
                { cliente: { nombreRazonSocial: q } },
                { chofer: { OR: [{ nombres: q }, { apellidos: q }] } },
            ];
        }

        const [viajes, total] = await Promise.all([
            prisma.viaje.findMany({
                where,
                include: includeListado,
                orderBy: { fechaSalida: 'desc' },
                skip: filtros.skip || 0,
                take: filtros.take || 50,
            }),
            prisma.viaje.count({ where }),
        ]);

        return { viajes, total };
    },

    async findById(id: number, db: Db = prisma): Promise<ViajeDetalle | null> {
        return db.viaje.findUnique({
            where: { id },
            include: includeDetalle,
        });
    },

    async create(datos: DatosCrearViaje, db: Db = prisma) {
        return db.viaje.create({
            data: {
                vehiculoId: datos.vehiculoId,
                choferId: datos.choferId,
                clienteId: datos.clienteId,
                materialId: datos.materialId,
                origen: datos.origen,
                destino: datos.destino,
                fechaSalida: datos.fechaSalida,
                fechaLlegadaEstimada: datos.fechaLlegadaEstimada ?? null,
                kilometrosEstimados: datos.kilometrosEstimados ?? null,
                tarifa: datos.tarifa,
                observaciones: datos.observaciones ?? null,
                estado: EstadoViaje.PLANIFICADO,
            },
            include: includeListado,
        });
    },

    async update(id: number, datos: DatosActualizarViaje, db: Db = prisma) {
        return db.viaje.update({
            where: { id },
            data: datos,
            include: includeListado,
        });
    },

    async delete(id: number, db: Db = prisma) {
        return db.viaje.delete({ where: { id } });
    },

    // Entidades necesarias para validar una asignación (estado, documentos y licencia)
    async obtenerEntidadesAsignacion(vehiculoId: number, choferId: number, clienteId: number, materialId: number, db: Db = prisma) {
        const [vehiculo, chofer, cliente, material] = await Promise.all([
            db.vehiculo.findUnique({ where: { id: vehiculoId } }),
            db.chofer.findUnique({ where: { id: choferId } }),
            db.cliente.findUnique({ where: { id: clienteId } }),
            db.material.findUnique({ where: { id: materialId } }),
        ]);
        return { vehiculo, chofer, cliente, material };
    },

    // Otro viaje EN_CURSO que use el mismo vehículo o chofer (evita doble asignación simultánea)
    async buscarViajeEnCursoConflicto(vehiculoId: number, choferId: number, excluirViajeId: number, db: Db = prisma) {
        return db.viaje.findFirst({
            where: {
                estado: EstadoViaje.EN_CURSO,
                id: { not: excluirViajeId },
                OR: [{ vehiculoId }, { choferId }],
            },
            select: { id: true, vehiculoId: true, choferId: true, origen: true, destino: true },
        });
    },

    // Estadísticas para dashboard
    async getEstadisticasMensuales(anio: number, mes: number) {
        const inicioMes = new Date(anio, mes - 1, 1);
        const finMes = new Date(anio, mes, 0, 23, 59, 59, 999);

        const [viajesCompletados, totalViajes] = await Promise.all([
            prisma.viaje.findMany({
                where: {
                    estado: EstadoViaje.COMPLETADO,
                    fechaSalida: { gte: inicioMes, lte: finMes },
                },
                select: { tarifa: true, kilometrosReales: true },
            }),
            prisma.viaje.count({
                where: {
                    fechaSalida: { gte: inicioMes, lte: finMes },
                    estado: { not: EstadoViaje.CANCELADO },
                },
            }),
        ]);

        const ingresosTotales = viajesCompletados.reduce(
            (sum, v) => sum + Number(v.tarifa),
            0
        );
        const kilometrosRecorridos = viajesCompletados.reduce(
            (sum, v) => sum + (v.kilometrosReales || 0),
            0
        );

        return {
            totalViajes,
            viajesCompletados: viajesCompletados.length,
            ingresosTotales,
            kilometrosRecorridos,
        };
    },
};
