// Controlador de Materiales - Usa Service con validación Zod
import { Request, Response } from 'express';
import { materialService, materialSchema } from '../services/material.service';

// GET /api/materiales
export const listarMateriales = async (req: Request, res: Response): Promise<void> => {
    try {
        const { busqueda } = req.query;
        const materiales = await materialService.listar({ busqueda: busqueda as string });
        res.json({ total: materiales.length, materiales });
    } catch (error: any) {
        console.error('[ERROR LISTAR MATERIALES]', error);
        res.status(500).json({ error: 'Error al obtener materiales' });
    }
};

// GET /api/materiales/:id
export const obtenerMaterial = async (req: Request, res: Response): Promise<void> => {
    try {
        const material = await materialService.obtenerPorId(parseInt(req.params.id));
        if (!material) { res.status(404).json({ error: 'Material no encontrado' }); return; }
        res.json({ material });
    } catch (error: any) {
        console.error('[ERROR OBTENER MATERIAL]', error);
        res.status(500).json({ error: 'Error al obtener material' });
    }
};

// POST /api/materiales
export const crearMaterial = async (req: Request, res: Response): Promise<void> => {
    try {
        const resultado = materialSchema.safeParse(req.body);
        if (!resultado.success) {
            res.status(400).json({ error: 'Datos inválidos', detalles: resultado.error.flatten() });
            return;
        }

        const material = await materialService.crear(resultado.data, req.usuario!.id, req.ip || undefined);
        console.log(`✅ Material creado: ${material.nombre}`);
        res.status(201).json({ mensaje: 'Material creado exitosamente', material });
    } catch (error: any) {
        console.error('[ERROR CREAR MATERIAL]', error);
        res.status(400).json({ error: error.message || 'Error al crear material' });
    }
};

// PUT /api/materiales/:id
export const actualizarMaterial = async (req: Request, res: Response): Promise<void> => {
    try {
        const material = await materialService.actualizar(parseInt(req.params.id), req.body, req.usuario!.id, req.ip || undefined);
        console.log(`✅ Material actualizado: ${material.nombre}`);
        res.json({ mensaje: 'Material actualizado exitosamente', material });
    } catch (error: any) {
        console.error('[ERROR ACTUALIZAR MATERIAL]', error);
        res.status(400).json({ error: error.message || 'Error al actualizar material' });
    }
};

// DELETE /api/materiales/:id
export const eliminarMaterial = async (req: Request, res: Response): Promise<void> => {
    try {
        const material = await materialService.eliminar(parseInt(req.params.id), req.usuario!.id, req.ip || undefined);
        console.log(`🗑️ Material eliminado: ${material.nombre}`);
        res.json({ mensaje: 'Material eliminado exitosamente', materialEliminado: material });
    } catch (error: any) {
        console.error('[ERROR ELIMINAR MATERIAL]', error);
        res.status(400).json({ error: error.message || 'Error al eliminar material' });
    }
};
