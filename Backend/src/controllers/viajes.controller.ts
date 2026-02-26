// Controlador de Viajes
import { Request, Response } from 'express';
import { z } from 'zod';
import { EstadoViaje } from '@prisma/client';
import { viajesService } from '../services/viajes.service';
import { asyncHandler, fechaOpcional, idParam, ipCliente, numeroOpcional, textoOpcional, usuarioActual, validar } from '../utils/http';

const id = z.coerce.number().int().positive();
const kmOpcional = numeroOpcional(z.coerce.number().int().positive('Los kilómetros deben ser mayores a 0'));

const crearViajeSchema = z.object({
    vehiculoId: id,
    choferId: id,
    clienteId: id,
    materialId: id,
    origen: z.string().trim().min(2, 'Origen requerido'),
    destino: z.string().trim().min(2, 'Destino requerido'),
    fechaSalida: z.coerce.date({ message: 'Fecha de salida inválida' }),
    fechaLlegadaEstimada: fechaOpcional,
    kilometrosEstimados: kmOpcional,
    tarifa: z.coerce.number().positive('La tarifa debe ser mayor a 0'),
    observaciones: textoOpcional,
});

// En la edición todo es opcional y el estado no se acepta (se cambia con PATCH /estado)
const actualizarViajeSchema = crearViajeSchema.partial().extend({
    kilometrosReales: kmOpcional,
}).strip();

const cambiarEstadoSchema = z.object({
    estado: z.nativeEnum(EstadoViaje, { message: `Estado inválido. Estados permitidos: ${Object.values(EstadoViaje).join(', ')}` }),
    fechaLlegadaReal: fechaOpcional,
    kilometrosReales: kmOpcional,
});

const listarSchema = z.object({
    estado: z.nativeEnum(EstadoViaje).optional().catch(undefined),
    vehiculoId: id.optional().catch(undefined),
    choferId: id.optional().catch(undefined),
    clienteId: id.optional().catch(undefined),
    fechaDesde: z.coerce.date().optional().catch(undefined),
    fechaHasta: z.coerce.date().optional().catch(undefined),
    busqueda: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).catch(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).catch(20).default(20),
});

export const viajesController = {
    /**
     * GET /api/viajes
     * Listar viajes con filtros y paginación
     */
    listar: asyncHandler(async (req: Request, res: Response) => {
        const q = listarSchema.parse(req.query);
        const resultado = await viajesService.listar({
            estado: q.estado,
            vehiculoId: q.vehiculoId,
            choferId: q.choferId,
            clienteId: q.clienteId,
            fechaDesde: q.fechaDesde,
            fechaHasta: q.fechaHasta,
            busqueda: q.busqueda || undefined,
            skip: (q.page - 1) * q.limit,
            take: q.limit,
        });

        res.json({
            exito: true,
            datos: resultado.viajes,
            paginacion: {
                total: resultado.total,
                pagina: q.page,
                limite: q.limit,
                totalPaginas: Math.ceil(resultado.total / q.limit),
            },
        });
    }),

    /**
     * GET /api/viajes/:id
     * Detalle de viaje con gastos, pagos y resumen económico (CPK, rendimiento)
     */
    obtenerDetalle: asyncHandler(async (req: Request, res: Response) => {
        const resultado = await viajesService.obtenerDetalle(idParam(req.params.id));
        res.json({ exito: true, datos: resultado });
    }),

    /**
     * GET /api/viajes/:id/liquidacion
     * Hoja de liquidación: anticipos vs. gastos comprobados
     */
    obtenerLiquidacion: asyncHandler(async (req: Request, res: Response) => {
        const resultado = await viajesService.obtenerLiquidacion(idParam(req.params.id));
        res.json({ exito: true, datos: resultado });
    }),

    /**
     * POST /api/viajes
     * Crear nuevo viaje
     */
    crear: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(crearViajeSchema, req.body);
        const viaje = await viajesService.crear(datos, usuarioActual(req).id, ipCliente(req));
        res.status(201).json({ exito: true, mensaje: 'Viaje creado exitosamente', datos: viaje });
    }),

    /**
     * PUT /api/viajes/:id
     * Actualizar datos de un viaje
     */
    actualizar: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(actualizarViajeSchema, req.body);
        const viaje = await viajesService.actualizar(idParam(req.params.id), datos, usuarioActual(req).id, ipCliente(req));
        res.json({ exito: true, mensaje: 'Viaje actualizado exitosamente', datos: viaje });
    }),

    /**
     * PATCH /api/viajes/:id/estado
     * Cambiar estado del viaje
     */
    cambiarEstado: asyncHandler(async (req: Request, res: Response) => {
        const { estado, fechaLlegadaReal, kilometrosReales } = validar(cambiarEstadoSchema, req.body);
        const viaje = await viajesService.cambiarEstado(
            idParam(req.params.id),
            estado,
            usuarioActual(req).id,
            {
                fechaLlegadaReal: fechaLlegadaReal ?? undefined,
                kilometrosReales: kilometrosReales ?? undefined,
            },
            ipCliente(req)
        );
        res.json({ exito: true, mensaje: `Estado cambiado a ${estado}`, datos: viaje });
    }),

    /**
     * DELETE /api/viajes/:id
     * Eliminar viaje
     */
    eliminar: asyncHandler(async (req: Request, res: Response) => {
        const resultado = await viajesService.eliminar(idParam(req.params.id), usuarioActual(req).id, ipCliente(req));
        res.json({ exito: true, mensaje: resultado.mensaje });
    }),
};
