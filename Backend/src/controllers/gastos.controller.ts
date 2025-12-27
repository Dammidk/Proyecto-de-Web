// Controlador de Gastos de Viaje
import { Request, Response } from 'express';
import { gastosService } from '../services/gastos.service';
import { TipoGasto, MetodoPago } from '@prisma/client';

export const gastosController = {
    /**
     * GET /api/viajes/:viajeId/gastos
     * Listar gastos de un viaje
     */
    async listar(req: Request, res: Response) {
        try {
            const { viajeId } = req.params;
            const gastos = await gastosService.listarPorViaje(parseInt(viajeId));

            res.json({
                exito: true,
                datos: gastos,
            });
        } catch (error: any) {
            const status = error.message === 'Viaje no encontrado' ? 404 : 500;
            res.status(status).json({ exito: false, mensaje: error.message });
        }
    },

    /**
     * POST /api/viajes/:viajeId/gastos
     * Crear gasto para un viaje (con soporte para archivo/comprobante)
     */
    async crear(req: Request, res: Response) {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) {
                return res.status(401).json({ exito: false, mensaje: 'No autorizado' });
            }

            const { viajeId } = req.params;
            const { tipoGasto, monto, fecha, metodoPago, descripcion } = req.body;

            // Validaciones básicas
            if (!tipoGasto || !monto || !fecha) {
                return res.status(400).json({
                    exito: false,
                    mensaje: 'Faltan campos requeridos: tipoGasto, monto, fecha',
                });
            }

            // Validar que el tipo de gasto sea válido
            if (!Object.values(TipoGasto).includes(tipoGasto)) {
                return res.status(400).json({
                    exito: false,
                    mensaje: `Tipo de gasto inválido. Tipos permitidos: ${Object.values(TipoGasto).join(', ')}`,
                });
            }

            // Validar método de pago si viene
            if (metodoPago && !Object.values(MetodoPago).includes(metodoPago)) {
                return res.status(400).json({
                    exito: false,
                    mensaje: `Método de pago inválido. Métodos permitidos: ${Object.values(MetodoPago).join(', ')}`,
                });
            }

            const gasto = await gastosService.crear(
                {
                    viajeId: parseInt(viajeId),
                    tipoGasto,
                    monto: parseFloat(monto),
                    fecha: new Date(fecha),
                    metodoPago,
                    descripcion,
                    archivo: req.file
                        ? {
                            buffer: req.file.buffer,
                            originalname: req.file.originalname,
                        }
                        : undefined,
                },
                usuarioId
            );

            res.status(201).json({
                exito: true,
                mensaje: 'Gasto registrado exitosamente',
                datos: gasto,
            });
        } catch (error: any) {
            res.status(400).json({ exito: false, mensaje: error.message });
        }
    },

    /**
     * PUT /api/gastos/:id
     * Actualizar un gasto
     */
    async actualizar(req: Request, res: Response) {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) {
                return res.status(401).json({ exito: false, mensaje: 'No autorizado' });
            }

            const { id } = req.params;
            const datos = req.body;

            // Parsear monto si viene
            if (datos.monto) datos.monto = parseFloat(datos.monto);
            if (datos.fecha) datos.fecha = new Date(datos.fecha);

            const gasto = await gastosService.actualizar(parseInt(id), datos, usuarioId);

            res.json({
                exito: true,
                mensaje: 'Gasto actualizado exitosamente',
                datos: gasto,
            });
        } catch (error: any) {
            const status = error.message === 'Gasto no encontrado' ? 404 : 400;
            res.status(status).json({ exito: false, mensaje: error.message });
        }
    },

    /**
     * DELETE /api/gastos/:id
     * Eliminar un gasto
     */
    async eliminar(req: Request, res: Response) {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) {
                return res.status(401).json({ exito: false, mensaje: 'No autorizado' });
            }

            const { id } = req.params;
            const resultado = await gastosService.eliminar(parseInt(id), usuarioId);

            res.json({
                exito: true,
                mensaje: resultado.mensaje,
            });
        } catch (error: any) {
            const status = error.message === 'Gasto no encontrado' ? 404 : 400;
            res.status(status).json({ exito: false, mensaje: error.message });
        }
    },
};
