// Controlador de Vehiculos - Usa Service con validación Zod
import { Request, Response } from 'express';
import { vehiculoService, vehiculoSchema, vehiculoUpdateSchema } from '../services/vehiculo.service';
import { EstadoVehiculo } from '@prisma/client';
import { asyncHandler, idParam, ipCliente, usuarioActual, validar } from '../utils/http';
import { NotFoundError } from '../utils/errors';

// GET /api/vehiculos
export const listarVehiculos = asyncHandler(async (req: Request, res: Response) => {
    const { busqueda, estado } = req.query;
    const vehiculos = await vehiculoService.listar({
        busqueda: busqueda as string,
        estado: Object.values(EstadoVehiculo).includes(estado as EstadoVehiculo) ? estado as EstadoVehiculo : undefined
    });
    res.json({ total: vehiculos.length, vehiculos });
});

// GET /api/vehiculos/:id
export const obtenerVehiculo = asyncHandler(async (req: Request, res: Response) => {
    const vehiculo = await vehiculoService.obtenerPorId(idParam(req.params.id));
    if (!vehiculo) throw new NotFoundError('Vehículo no encontrado');
    res.json({ vehiculo });
});

// POST /api/vehiculos
export const crearVehiculo = asyncHandler(async (req: Request, res: Response) => {
    const datos = validar(vehiculoSchema, req.body);
    const vehiculo = await vehiculoService.crear(datos, usuarioActual(req).id, ipCliente(req));
    console.log(`Vehículo creado: ${vehiculo.placa}`);
    res.status(201).json({ mensaje: 'Vehículo creado exitosamente', vehiculo });
});

// PUT /api/vehiculos/:id
export const actualizarVehiculo = asyncHandler(async (req: Request, res: Response) => {
    const datos = validar(vehiculoUpdateSchema, req.body);
    const vehiculo = await vehiculoService.actualizar(idParam(req.params.id), datos, usuarioActual(req).id, ipCliente(req));
    console.log(`Vehículo actualizado: ${vehiculo.placa}`);
    res.json({ mensaje: 'Vehículo actualizado exitosamente', vehiculo });
});

// DELETE /api/vehiculos/:id
export const eliminarVehiculo = asyncHandler(async (req: Request, res: Response) => {
    const vehiculo = await vehiculoService.eliminar(idParam(req.params.id), usuarioActual(req).id, ipCliente(req));
    console.log(`Vehículo eliminado: ${vehiculo.placa}`);
    res.json({ mensaje: 'Vehículo eliminado exitosamente', vehiculoEliminado: vehiculo });
});
