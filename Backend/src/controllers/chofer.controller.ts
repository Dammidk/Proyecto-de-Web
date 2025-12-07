// Controlador de Choferes - Usa Service con validación Zod
import { Request, Response } from 'express';
import { choferService, choferSchema } from '../services/chofer.service';
import { EstadoChofer } from '@prisma/client';

// GET /api/choferes
export const listarChoferes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { busqueda, estado } = req.query;
        const choferes = await choferService.listar({
            busqueda: busqueda as string,
            estado: estado as EstadoChofer
        });
        res.json({ total: choferes.length, choferes });
    } catch (error: any) {
        console.error('[ERROR LISTAR CHOFERES]', error);
        res.status(500).json({ error: 'Error al obtener choferes' });
    }
};

// GET /api/choferes/:id
export const obtenerChofer = async (req: Request, res: Response): Promise<void> => {
    try {
        const chofer = await choferService.obtenerPorId(parseInt(req.params.id));
        if (!chofer) { res.status(404).json({ error: 'Chofer no encontrado' }); return; }
        res.json({ chofer });
    } catch (error: any) {
        console.error('[ERROR OBTENER CHOFER]', error);
        res.status(500).json({ error: 'Error al obtener chofer' });
    }
};

// POST /api/choferes
export const crearChofer = async (req: Request, res: Response): Promise<void> => {
    try {
        const resultado = choferSchema.safeParse(req.body);
        if (!resultado.success) {
            res.status(400).json({ error: 'Datos inválidos', detalles: resultado.error.flatten() });
            return;
        }

        const chofer = await choferService.crear(resultado.data, req.usuario!.id, req.ip || undefined);
        console.log(`✅ Chofer creado: ${chofer.nombres} ${chofer.apellidos}`);
        res.status(201).json({ mensaje: 'Chofer creado exitosamente', chofer });
    } catch (error: any) {
        console.error('[ERROR CREAR CHOFER]', error);
        res.status(400).json({ error: error.message || 'Error al crear chofer' });
    }
};

// PUT /api/choferes/:id
export const actualizarChofer = async (req: Request, res: Response): Promise<void> => {
    try {
        const chofer = await choferService.actualizar(parseInt(req.params.id), req.body, req.usuario!.id, req.ip || undefined);
        console.log(`✅ Chofer actualizado: ${chofer.nombres} ${chofer.apellidos}`);
        res.json({ mensaje: 'Chofer actualizado exitosamente', chofer });
    } catch (error: any) {
        console.error('[ERROR ACTUALIZAR CHOFER]', error);
        res.status(400).json({ error: error.message || 'Error al actualizar chofer' });
    }
};

// DELETE /api/choferes/:id
export const eliminarChofer = async (req: Request, res: Response): Promise<void> => {
    try {
        const chofer = await choferService.eliminar(parseInt(req.params.id), req.usuario!.id, req.ip || undefined);
        console.log(`🗑️ Chofer eliminado: ${chofer.nombres} ${chofer.apellidos}`);
        res.json({ mensaje: 'Chofer eliminado exitosamente', choferEliminado: chofer });
    } catch (error: any) {
        console.error('[ERROR ELIMINAR CHOFER]', error);
        res.status(400).json({ error: error.message || 'Error al eliminar chofer' });
    }
};
