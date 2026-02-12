// Controlador de Clientes - Usa Service con validación Zod
import { Request, Response } from 'express';
import { clienteService, clienteSchema, clienteUpdateSchema } from '../services/cliente.service';
import { EstadoCliente } from '@prisma/client';
import { asyncHandler, idParam, ipCliente, usuarioActual, validar } from '../utils/http';
import { NotFoundError } from '../utils/errors';

// GET /api/clientes
export const listarClientes = asyncHandler(async (req: Request, res: Response) => {
    const { busqueda, estado } = req.query;
    const clientes = await clienteService.listar({
        busqueda: busqueda as string,
        estado: Object.values(EstadoCliente).includes(estado as EstadoCliente) ? estado as EstadoCliente : undefined
    });
    res.json({ total: clientes.length, clientes });
});

// GET /api/clientes/:id
export const obtenerCliente = asyncHandler(async (req: Request, res: Response) => {
    const cliente = await clienteService.obtenerPorId(idParam(req.params.id));
    if (!cliente) throw new NotFoundError('Cliente no encontrado');
    res.json({ cliente });
});

// POST /api/clientes
export const crearCliente = asyncHandler(async (req: Request, res: Response) => {
    const datos = validar(clienteSchema, req.body);
    const cliente = await clienteService.crear(datos, usuarioActual(req).id, ipCliente(req));
    console.log(`Cliente creado: ${cliente.nombreRazonSocial}`);
    res.status(201).json({ mensaje: 'Cliente creado exitosamente', cliente });
});

// PUT /api/clientes/:id
export const actualizarCliente = asyncHandler(async (req: Request, res: Response) => {
    const datos = validar(clienteUpdateSchema, req.body);
    const cliente = await clienteService.actualizar(idParam(req.params.id), datos, usuarioActual(req).id, ipCliente(req));
    console.log(`Cliente actualizado: ${cliente.nombreRazonSocial}`);
    res.json({ mensaje: 'Cliente actualizado exitosamente', cliente });
});

// DELETE /api/clientes/:id
export const eliminarCliente = asyncHandler(async (req: Request, res: Response) => {
    const cliente = await clienteService.eliminar(idParam(req.params.id), usuarioActual(req).id, ipCliente(req));
    console.log(`Cliente eliminado: ${cliente.nombreRazonSocial}`);
    res.json({ mensaje: 'Cliente eliminado exitosamente', clienteEliminado: cliente });
});
