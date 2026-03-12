// Controlador de Gastos de Viaje
import { Request, Response } from 'express';
import { z } from 'zod';
import { TipoGasto, MetodoPago } from '@prisma/client';
import { gastosService } from '../services/gastos.service';
import { asyncHandler, idParam, ipCliente, numeroOpcional, textoOpcional, usuarioActual, validar } from '../utils/http';

// Los campos llegan como texto cuando el formulario es multipart/form-data
const decimalOpcional = numeroOpcional(z.coerce.number().positive());
const enteroOpcional = numeroOpcional(z.coerce.number().int().min(0));

const gastoSchema = z.object({
    tipoGasto: z.nativeEnum(TipoGasto, { message: `Tipo de gasto inválido. Tipos permitidos: ${Object.values(TipoGasto).join(', ')}` }),
    monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
    fecha: z.coerce.date({ message: 'Fecha inválida' }),
    metodoPago: z.nativeEnum(MetodoPago, { message: `Método de pago inválido. Métodos permitidos: ${Object.values(MetodoPago).join(', ')}` }).optional(),
    descripcion: textoOpcional,
    galones: decimalOpcional,
    precioPorGalon: decimalOpcional,
    estacionServicio: textoOpcional,
    kilometrajeAlCargar: enteroOpcional,
});

export const gastosController = {
    /**
     * GET /api/viajes/:viajeId/gastos
     */
    listar: asyncHandler(async (req: Request, res: Response) => {
        const gastos = await gastosService.listarPorViaje(idParam(req.params.viajeId, 'viajeId'));
        res.json({ exito: true, datos: gastos });
    }),

    /**
     * POST /api/viajes/:viajeId/gastos
     * Crear gasto para un viaje (con soporte para archivo/comprobante)
     */
    crear: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(gastoSchema, req.body);
        const gasto = await gastosService.crear(
            {
                ...datos,
                viajeId: idParam(req.params.viajeId, 'viajeId'),
                archivo: req.file || undefined,
            },
            usuarioActual(req).id,
            ipCliente(req)
        );
        res.status(201).json({ exito: true, mensaje: 'Gasto registrado exitosamente', datos: gasto });
    }),

    /**
     * PUT /api/gastos/:id
     */
    actualizar: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(gastoSchema.partial(), req.body);
        const gasto = await gastosService.actualizar(idParam(req.params.id), datos, usuarioActual(req).id, ipCliente(req));
        res.json({ exito: true, mensaje: 'Gasto actualizado exitosamente', datos: gasto });
    }),

    /**
     * DELETE /api/gastos/:id
     */
    eliminar: asyncHandler(async (req: Request, res: Response) => {
        const resultado = await gastosService.eliminar(idParam(req.params.id), usuarioActual(req).id, ipCliente(req));
        res.json({ exito: true, mensaje: resultado.mensaje });
    }),
};
