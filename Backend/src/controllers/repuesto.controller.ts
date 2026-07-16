// Controlador de Repuestos
import { Request, Response } from 'express';
import { CategoriaRepuesto } from '@prisma/client';
import { repuestoService, repuestoSchema, repuestoUpdateSchema, movimientoSchema } from '../services/repuesto.service';
import { asyncHandler, idParam, ipCliente, usuarioActual, validar } from '../utils/http';

export const repuestoController = {
    listar: asyncHandler(async (req: Request, res: Response) => {
        const categoria = req.query.categoria ? (String(req.query.categoria) as CategoriaRepuesto) : undefined;
        const busqueda = req.query.busqueda ? String(req.query.busqueda) : undefined;
        res.json({ exito: true, datos: await repuestoService.listar({ categoria, busqueda }) });
    }),

    resumen: asyncHandler(async (_req: Request, res: Response) => {
        res.json({ exito: true, datos: await repuestoService.resumen() });
    }),

    movimientosRecientes: asyncHandler(async (_req: Request, res: Response) => {
        res.json({ exito: true, datos: await repuestoService.movimientosRecientes() });
    }),

    obtenerPorId: asyncHandler(async (req: Request, res: Response) => {
        res.json({ exito: true, datos: await repuestoService.obtenerPorId(idParam(req.params.id as string)) });
    }),

    crear: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(repuestoSchema, req.body);
        const nuevo = await repuestoService.crear(datos, usuarioActual(req).id, ipCliente(req));
        res.status(201).json({ exito: true, mensaje: 'Repuesto registrado', datos: nuevo });
    }),

    actualizar: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(repuestoUpdateSchema, req.body);
        const r = await repuestoService.actualizar(idParam(req.params.id as string), datos, usuarioActual(req).id, ipCliente(req));
        res.json({ exito: true, mensaje: 'Repuesto actualizado', datos: r });
    }),

    registrarMovimiento: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(movimientoSchema, req.body);
        const r = await repuestoService.registrarMovimiento(idParam(req.params.id as string), datos, usuarioActual(req).id, ipCliente(req));
        res.status(201).json({ exito: true, mensaje: 'Movimiento registrado', datos: r });
    }),

    eliminar: asyncHandler(async (req: Request, res: Response) => {
        await repuestoService.eliminar(idParam(req.params.id as string), usuarioActual(req).id, ipCliente(req));
        res.json({ exito: true, mensaje: 'Repuesto eliminado' });
    }),
};
