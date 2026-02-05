// Controlador de Choferes - Usa Service con validación Zod
import { Request, Response } from 'express';
import { choferService, choferSchema, choferUpdateSchema } from '../services/chofer.service';
import { EstadoChofer } from '@prisma/client';
import { asyncHandler, idParam, ipCliente, usuarioActual, validar } from '../utils/http';
import { NotFoundError } from '../utils/errors';

// GET /api/choferes
export const listarChoferes = asyncHandler(async (req: Request, res: Response) => {
    const { busqueda, estado } = req.query;
    const choferes = await choferService.listar({
        busqueda: busqueda as string,
        estado: Object.values(EstadoChofer).includes(estado as EstadoChofer) ? estado as EstadoChofer : undefined
    });
    res.json({ total: choferes.length, choferes });
});

// GET /api/choferes/:id
export const obtenerChofer = asyncHandler(async (req: Request, res: Response) => {
    const chofer = await choferService.obtenerPorId(idParam(req.params.id));
    if (!chofer) throw new NotFoundError('Chofer no encontrado');
    res.json({ chofer });
});

// POST /api/choferes
export const crearChofer = asyncHandler(async (req: Request, res: Response) => {
    const datos = validar(choferSchema, req.body);
    const chofer = await choferService.crear(datos, usuarioActual(req).id, ipCliente(req));
    console.log(`Chofer creado: ${chofer.nombres} ${chofer.apellidos}`);
    res.status(201).json({ mensaje: 'Chofer creado exitosamente', chofer });
});

// PUT /api/choferes/:id
export const actualizarChofer = asyncHandler(async (req: Request, res: Response) => {
    const datos = validar(choferUpdateSchema, req.body);
    const chofer = await choferService.actualizar(idParam(req.params.id), datos, usuarioActual(req).id, ipCliente(req));
    console.log(`Chofer actualizado: ${chofer.nombres} ${chofer.apellidos}`);
    res.json({ mensaje: 'Chofer actualizado exitosamente', chofer });
});

// DELETE /api/choferes/:id
export const eliminarChofer = asyncHandler(async (req: Request, res: Response) => {
    const chofer = await choferService.eliminar(idParam(req.params.id), usuarioActual(req).id, ipCliente(req));
    console.log(`Chofer eliminado: ${chofer.nombres} ${chofer.apellidos}`);
    res.json({ mensaje: 'Chofer eliminado exitosamente', choferEliminado: chofer });
});
