// Controlador de Clientes - Usa Service con validación Zod
import { Request, Response } from 'express';
import { clienteService, clienteSchema } from '../services/cliente.service';
import { EstadoCliente } from '@prisma/client';

// GET /api/clientes
export const listarClientes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { busqueda, estado } = req.query;
        const clientes = await clienteService.listar({
            busqueda: busqueda as string,
            estado: estado as EstadoCliente
        });
        res.json({ total: clientes.length, clientes });
    } catch (error: any) {
        console.error('[ERROR LISTAR CLIENTES]', error);
        res.status(500).json({ error: 'Error al obtener clientes' });
    }
};

// GET /api/clientes/:id
export const obtenerCliente = async (req: Request, res: Response): Promise<void> => {
    try {
        const cliente = await clienteService.obtenerPorId(parseInt(req.params.id));
        if (!cliente) { res.status(404).json({ error: 'Cliente no encontrado' }); return; }
        res.json({ cliente });
    } catch (error: any) {
        console.error('[ERROR OBTENER CLIENTE]', error);
        res.status(500).json({ error: 'Error al obtener cliente' });
    }
};

// POST /api/clientes
export const crearCliente = async (req: Request, res: Response): Promise<void> => {
    try {
        const resultado = clienteSchema.safeParse(req.body);
        if (!resultado.success) {
            res.status(400).json({ error: 'Datos inválidos', detalles: resultado.error.flatten() });
            return;
        }

        const cliente = await clienteService.crear(resultado.data, req.usuario!.id, req.ip || undefined);
        console.log(`✅ Cliente creado: ${cliente.nombreRazonSocial}`);
        res.status(201).json({ mensaje: 'Cliente creado exitosamente', cliente });
    } catch (error: any) {
        console.error('[ERROR CREAR CLIENTE]', error);
        res.status(400).json({ error: error.message || 'Error al crear cliente' });
    }
};

// PUT /api/clientes/:id
export const actualizarCliente = async (req: Request, res: Response): Promise<void> => {
    try {
        const cliente = await clienteService.actualizar(parseInt(req.params.id), req.body, req.usuario!.id, req.ip || undefined);
        console.log(`✅ Cliente actualizado: ${cliente.nombreRazonSocial}`);
        res.json({ mensaje: 'Cliente actualizado exitosamente', cliente });
    } catch (error: any) {
        console.error('[ERROR ACTUALIZAR CLIENTE]', error);
        res.status(400).json({ error: error.message || 'Error al actualizar cliente' });
    }
};

// DELETE /api/clientes/:id
export const eliminarCliente = async (req: Request, res: Response): Promise<void> => {
    try {
        const cliente = await clienteService.eliminar(parseInt(req.params.id), req.usuario!.id, req.ip || undefined);
        console.log(`🗑️ Cliente eliminado: ${cliente.nombreRazonSocial}`);
        res.json({ mensaje: 'Cliente eliminado exitosamente', clienteEliminado: cliente });
    } catch (error: any) {
        console.error('[ERROR ELIMINAR CLIENTE]', error);
        res.status(400).json({ error: error.message || 'Error al eliminar cliente' });
    }
};
