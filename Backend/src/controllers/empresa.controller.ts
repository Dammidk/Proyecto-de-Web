// Controlador de Empresas (organización y plan)
import { Request, Response } from 'express';
import { empresaService, empresaSchema, empresaUpdateSchema } from '../services/empresa.service';
import { asyncHandler, ipCliente, usuarioActual, validar } from '../utils/http';

export const empresaController = {
    listar: asyncHandler(async (_req: Request, res: Response) => {
        res.json({ exito: true, datos: await empresaService.listar() });
    }),

    obtenerActual: asyncHandler(async (_req: Request, res: Response) => {
        res.json({ exito: true, datos: await empresaService.obtenerActual() });
    }),

    crear: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(empresaSchema, req.body);
        const nueva = await empresaService.crear(datos, usuarioActual(req).id, ipCliente(req));
        res.status(201).json({ exito: true, mensaje: 'Organización registrada', datos: nueva });
    }),

    actualizarActual: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(empresaUpdateSchema, req.body);
        const r = await empresaService.actualizarActual(datos, usuarioActual(req).id, ipCliente(req));
        res.json({ exito: true, mensaje: 'Perfil de la organización actualizado', datos: r });
    }),
};
