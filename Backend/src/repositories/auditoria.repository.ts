// Repositorio de Auditoría - Acceso a BD
import prisma from '../config/database';
import { AccionAuditoria } from '@prisma/client';

export interface FiltrosAuditoria {
    entidad?: string;
    accion?: AccionAuditoria;
}

export interface DatosAuditoria {
    accion: AccionAuditoria;
    entidad: string;
    entidadId: number;
    datosAnteriores?: any;
    datosNuevos?: any;
    ipAddress?: string;
}

export const auditoriaRepository = {
    async findAll(filtros: FiltrosAuditoria = {}) {
        const where: any = {};
        if (filtros.entidad) where.entidad = filtros.entidad;
        if (filtros.accion) where.accion = filtros.accion;
        return prisma.registroAuditoria.findMany({
            where,
            include: { usuario: { select: { id: true, nombreCompleto: true } } },
            orderBy: { fechaHora: 'desc' },
            take: 100
        });
    },

    async create(usuarioId: number, datos: DatosAuditoria) {
        return prisma.registroAuditoria.create({
            data: {
                usuarioId,
                accion: datos.accion,
                entidad: datos.entidad,
                entidadId: datos.entidadId,
                datosAnteriores: datos.datosAnteriores || null,
                datosNuevos: datos.datosNuevos || null,
                ipAddress: datos.ipAddress || null
            }
        });
    }
};
