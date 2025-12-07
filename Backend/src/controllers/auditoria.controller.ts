// Controlador de Auditoría - Usa Service
import { Request, Response } from 'express';
import { auditoriaService } from '../services/auditoria.service';
import { AccionAuditoria } from '@prisma/client';
import prisma from '../config/database';

// GET /api/auditoria
export const listarAuditoria = async (req: Request, res: Response): Promise<void> => {
    try {
        const { entidad, accion } = req.query;
        const registros = await auditoriaService.listar({
            entidad: entidad as string,
            accion: accion as AccionAuditoria
        });
        res.json({ total: registros.length, registros });
    } catch (error: any) {
        console.error('[ERROR LISTAR AUDITORÍA]', error);
        res.status(500).json({ error: 'Error al obtener registros de auditoría' });
    }
};

// GET /api/auditoria/:id
export const obtenerRegistroAuditoria = async (req: Request, res: Response): Promise<void> => {
    try {
        const registro = await prisma.registroAuditoria.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { usuario: { select: { id: true, nombreCompleto: true } } }
        });

        if (!registro) {
            res.status(404).json({ error: 'Registro no encontrado' });
            return;
        }

        res.json({ registro });
    } catch (error: any) {
        console.error('[ERROR OBTENER AUDITORÍA]', error);
        res.status(500).json({ error: 'Error al obtener registro de auditoría' });
    }
};
