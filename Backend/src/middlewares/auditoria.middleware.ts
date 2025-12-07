// Middleware de Auditoría
// Registra automáticamente las acciones de crear, editar y eliminar

import { Request } from 'express';
import prisma from '../config/database';
import { AccionAuditoria, Prisma } from '@prisma/client';

interface DatosAuditoria {
    accion: AccionAuditoria;
    entidad: string;
    entidadId: number;
    datosAnteriores?: Prisma.InputJsonValue;
    datosNuevos?: Prisma.InputJsonValue;
}

// Función para registrar un evento de auditoría
export const registrarAuditoria = async (
    usuarioId: number,
    datos: DatosAuditoria,
    ipAddress?: string
): Promise<void> => {
    try {
        await prisma.registroAuditoria.create({
            data: {
                usuarioId,
                accion: datos.accion,
                entidad: datos.entidad,
                entidadId: datos.entidadId,
                datosAnteriores: datos.datosAnteriores ?? Prisma.JsonNull,
                datosNuevos: datos.datosNuevos ?? Prisma.JsonNull,
                ipAddress: ipAddress || null,
            }
        });

        console.log(`[AUDITORÍA] ${datos.accion} en ${datos.entidad} (ID: ${datos.entidadId}) por usuario ${usuarioId}`);
    } catch (error) {
        console.error('[ERROR AUDITORÍA] No se pudo registrar la acción:', error);
    }
};

// Obtener IP del cliente
export const obtenerIP = (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'desconocido';
};
