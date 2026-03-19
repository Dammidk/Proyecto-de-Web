// Repositorio de Auditoría - Acceso a BD
import prisma, { Db } from '../config/database';
import { AccionAuditoria, Prisma } from '@prisma/client';

export interface FiltrosAuditoria {
    entidad?: string;
    accion?: AccionAuditoria;
    usuarioId?: number;
    entidadId?: number;
    fechaDesde?: Date;
    fechaHasta?: Date;
    skip?: number;
    take?: number;
}

export interface DatosAuditoria {
    accion: AccionAuditoria;
    entidad: string;
    entidadId: number;
    datosAnteriores?: any;
    datosNuevos?: any;
    ipAddress?: string;
}

// Los objetos de Prisma (Decimal, Date) se serializan a JSON plano antes de guardarse
const aJson = (valor: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
    valor === undefined || valor === null ? Prisma.JsonNull : JSON.parse(JSON.stringify(valor));

export const auditoriaRepository = {
    async findAll(filtros: FiltrosAuditoria = {}) {
        const where: Prisma.RegistroAuditoriaWhereInput = {};
        if (filtros.entidad) where.entidad = filtros.entidad;
        if (filtros.accion) where.accion = filtros.accion;
        if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
        if (filtros.entidadId) where.entidadId = filtros.entidadId;
        if (filtros.fechaDesde || filtros.fechaHasta) {
            where.fechaHora = {};
            if (filtros.fechaDesde) where.fechaHora.gte = filtros.fechaDesde;
            if (filtros.fechaHasta) where.fechaHora.lte = filtros.fechaHasta;
        }
        const [registros, total] = await Promise.all([
            prisma.registroAuditoria.findMany({
                where,
                include: { usuario: { select: { id: true, nombreCompleto: true } } },
                orderBy: { fechaHora: 'desc' },
                skip: filtros.skip ?? 0,
                take: filtros.take ?? 100,
            }),
            prisma.registroAuditoria.count({ where }),
        ]);
        return { registros, total };
    },

    async create(usuarioId: number, datos: DatosAuditoria, db: Db = prisma) {
        return db.registroAuditoria.create({
            data: {
                usuarioId,
                accion: datos.accion,
                entidad: datos.entidad,
                entidadId: datos.entidadId,
                datosAnteriores: aJson(datos.datosAnteriores),
                datosNuevos: aJson(datos.datosNuevos),
                ipAddress: datos.ipAddress || null
            }
        });
    }
};
