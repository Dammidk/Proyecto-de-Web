// Controlador de Facturación y Cuentas por Cobrar
import { Request, Response } from 'express';
import { EstadoFactura } from '@prisma/client';
import { facturaService, facturaSchema, cobroSchema } from '../services/factura.service';
import { asyncHandler, idParam, ipCliente, usuarioActual, validar } from '../utils/http';

export const facturaController = {
    listar: asyncHandler(async (req: Request, res: Response) => {
        const clienteId = req.query.clienteId ? idParam(String(req.query.clienteId), 'clienteId') : undefined;
        const estado = req.query.estado ? (String(req.query.estado) as EstadoFactura) : undefined;
        res.json({ exito: true, datos: await facturaService.listar({ clienteId, estado }) });
    }),

    resumenCartera: asyncHandler(async (_req: Request, res: Response) => {
        res.json({ exito: true, datos: await facturaService.resumenCartera() });
    }),

    viajesFacturables: asyncHandler(async (_req: Request, res: Response) => {
        res.json({ exito: true, datos: await facturaService.viajesFacturables() });
    }),

    obtenerPorId: asyncHandler(async (req: Request, res: Response) => {
        res.json({ exito: true, datos: await facturaService.obtenerPorId(idParam(req.params.id as string)) });
    }),

    crear: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(facturaSchema, req.body);
        const nueva = await facturaService.crear(datos, usuarioActual(req).id, ipCliente(req));
        res.status(201).json({ exito: true, mensaje: `Factura ${nueva.numeroFactura} emitida`, datos: nueva });
    }),

    registrarCobro: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(cobroSchema, req.body);
        const r = await facturaService.registrarCobro(idParam(req.params.id as string), datos, usuarioActual(req).id, ipCliente(req));
        res.status(201).json({ exito: true, mensaje: 'Cobro registrado', datos: r });
    }),

    anular: asyncHandler(async (req: Request, res: Response) => {
        const f = await facturaService.anular(idParam(req.params.id as string), usuarioActual(req).id, ipCliente(req));
        res.json({ exito: true, mensaje: 'Factura anulada', datos: f });
    }),
};
