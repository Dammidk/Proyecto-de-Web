// Controlador de Neumáticos
import { Request, Response } from 'express';
import { EstadoNeumatico } from '@prisma/client';
import {
    neumaticoService, neumaticoSchema, neumaticoUpdateSchema, inspeccionSchema, montajeSchema, reencaucheSchema,
} from '../services/neumatico.service';
import { asyncHandler, idParam, ipCliente, usuarioActual, validar } from '../utils/http';

export const neumaticoController = {
    listar: asyncHandler(async (req: Request, res: Response) => {
        const vehiculoId = req.query.vehiculoId ? idParam(String(req.query.vehiculoId), 'vehiculoId') : undefined;
        const estado = req.query.estado ? (String(req.query.estado) as EstadoNeumatico) : undefined;
        const busqueda = req.query.busqueda ? String(req.query.busqueda) : undefined;
        res.json({ exito: true, datos: await neumaticoService.listar({ vehiculoId, estado, busqueda }) });
    }),

    resumen: asyncHandler(async (_req: Request, res: Response) => {
        res.json({ exito: true, datos: await neumaticoService.resumenFlota() });
    }),

    obtenerPorId: asyncHandler(async (req: Request, res: Response) => {
        res.json({ exito: true, datos: await neumaticoService.obtenerPorId(idParam(req.params.id as string)) });
    }),

    crear: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(neumaticoSchema, req.body);
        const nuevo = await neumaticoService.crear(datos, usuarioActual(req).id, ipCliente(req));
        res.status(201).json({ exito: true, mensaje: 'Neumático registrado', datos: nuevo });
    }),

    actualizar: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(neumaticoUpdateSchema, req.body);
        const actualizado = await neumaticoService.actualizar(idParam(req.params.id as string), datos, usuarioActual(req).id, ipCliente(req));
        res.json({ exito: true, mensaje: 'Neumático actualizado', datos: actualizado });
    }),

    registrarInspeccion: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(inspeccionSchema, req.body);
        const inspeccion = await neumaticoService.registrarInspeccion(idParam(req.params.id as string), datos, usuarioActual(req).id, ipCliente(req));
        res.status(201).json({ exito: true, mensaje: 'Inspección registrada', datos: inspeccion });
    }),

    reubicar: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(montajeSchema, req.body);
        const movido = await neumaticoService.reubicar(idParam(req.params.id as string), datos, usuarioActual(req).id, ipCliente(req));
        res.json({ exito: true, mensaje: 'Posición actualizada', datos: movido });
    }),

    reencauchar: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(reencaucheSchema, req.body);
        const r = await neumaticoService.reencauchar(idParam(req.params.id as string), datos, usuarioActual(req).id, ipCliente(req));
        res.json({ exito: true, mensaje: 'Reencauche registrado', datos: r });
    }),
};
