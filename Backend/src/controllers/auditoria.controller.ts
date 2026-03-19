// Controlador de Auditoría - Usa Service
import { Request, Response } from 'express';
import { z } from 'zod';
import { AccionAuditoria } from '@prisma/client';
import { auditoriaService } from '../services/auditoria.service';
import { asyncHandler, idParam } from '../utils/http';

const filtrosSchema = z.object({
    entidad: z.string().trim().optional(),
    accion: z.nativeEnum(AccionAuditoria).optional().catch(undefined),
    usuarioId: z.coerce.number().int().positive().optional().catch(undefined),
    entidadId: z.coerce.number().int().positive().optional().catch(undefined),
    fechaDesde: z.coerce.date().optional().catch(undefined),
    fechaHasta: z.coerce.date().optional().catch(undefined),
    pagina: z.coerce.number().int().min(1).catch(1).default(1),
    limite: z.coerce.number().int().min(1).max(500).catch(100).default(100),
});

// GET /api/auditoria
export const listarAuditoria = asyncHandler(async (req: Request, res: Response) => {
    const f = filtrosSchema.parse(req.query);
    const { registros, total } = await auditoriaService.listar({
        entidad: f.entidad || undefined,
        accion: f.accion,
        usuarioId: f.usuarioId,
        entidadId: f.entidadId,
        fechaDesde: f.fechaDesde,
        fechaHasta: f.fechaHasta,
        skip: (f.pagina - 1) * f.limite,
        take: f.limite,
    });
    res.json({
        total,
        registros,
        paginacion: { pagina: f.pagina, limite: f.limite, totalPaginas: Math.ceil(total / f.limite) },
    });
});

// GET /api/auditoria/:id
export const obtenerRegistroAuditoria = asyncHandler(async (req: Request, res: Response) => {
    const registro = await auditoriaService.obtener(idParam(req.params.id));
    res.json({ registro });
});
