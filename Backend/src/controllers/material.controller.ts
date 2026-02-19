// Controlador de Materiales - Usa Service con validación Zod
import { Request, Response } from 'express';
import { materialService, materialSchema, materialUpdateSchema } from '../services/material.service';
import { asyncHandler, idParam, ipCliente, usuarioActual, validar } from '../utils/http';
import { NotFoundError } from '../utils/errors';

// GET /api/materiales
export const listarMateriales = asyncHandler(async (req: Request, res: Response) => {
    const { busqueda } = req.query;
    const materiales = await materialService.listar({ busqueda: busqueda as string });
    res.json({ total: materiales.length, materiales });
});

// GET /api/materiales/:id
export const obtenerMaterial = asyncHandler(async (req: Request, res: Response) => {
    const material = await materialService.obtenerPorId(idParam(req.params.id));
    if (!material) throw new NotFoundError('Material no encontrado');
    res.json({ material });
});

// POST /api/materiales
export const crearMaterial = asyncHandler(async (req: Request, res: Response) => {
    const datos = validar(materialSchema, req.body);
    const material = await materialService.crear(datos, usuarioActual(req).id, ipCliente(req));
    console.log(`Material creado: ${material.nombre}`);
    res.status(201).json({ mensaje: 'Material creado exitosamente', material });
});

// PUT /api/materiales/:id
export const actualizarMaterial = asyncHandler(async (req: Request, res: Response) => {
    const datos = validar(materialUpdateSchema, req.body);
    const material = await materialService.actualizar(idParam(req.params.id), datos, usuarioActual(req).id, ipCliente(req));
    console.log(`Material actualizado: ${material.nombre}`);
    res.json({ mensaje: 'Material actualizado exitosamente', material });
});

// DELETE /api/materiales/:id
export const eliminarMaterial = asyncHandler(async (req: Request, res: Response) => {
    const material = await materialService.eliminar(idParam(req.params.id), usuarioActual(req).id, ipCliente(req));
    console.log(`Material eliminado: ${material.nombre}`);
    res.json({ mensaje: 'Material eliminado exitosamente', materialEliminado: material });
});
