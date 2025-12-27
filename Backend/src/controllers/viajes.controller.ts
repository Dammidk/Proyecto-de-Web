// Controlador de Viajes
import { Request, Response } from 'express';
import { viajesService } from '../services/viajes.service';
import { EstadoViaje } from '@prisma/client';

export const viajesController = {
    /**
     * GET /api/viajes
     * Listar viajes con filtros
     */
    async listar(req: Request, res: Response) {
        try {
            const {
                estado,
                vehiculoId,
                choferId,
                clienteId,
                fechaDesde,
                fechaHasta,
                page = '1',
                limit = '20',
            } = req.query;

            const filtros = {
                estado: estado as EstadoViaje | undefined,
                vehiculoId: vehiculoId ? parseInt(vehiculoId as string) : undefined,
                choferId: choferId ? parseInt(choferId as string) : undefined,
                clienteId: clienteId ? parseInt(clienteId as string) : undefined,
                fechaDesde: fechaDesde ? new Date(fechaDesde as string) : undefined,
                fechaHasta: fechaHasta ? new Date(fechaHasta as string) : undefined,
                skip: (parseInt(page as string) - 1) * parseInt(limit as string),
                take: parseInt(limit as string),
            };

            const resultado = await viajesService.listar(filtros);

            res.json({
                exito: true,
                datos: resultado.viajes,
                paginacion: {
                    total: resultado.total,
                    pagina: parseInt(page as string),
                    limite: parseInt(limit as string),
                    totalPaginas: Math.ceil(resultado.total / parseInt(limit as string)),
                },
            });
        } catch (error: any) {
            res.status(500).json({ exito: false, mensaje: error.message });
        }
    },

    /**
     * GET /api/viajes/:id
     * Obtener detalle de viaje con gastos y resumen económico
     */
    async obtenerDetalle(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const resultado = await viajesService.obtenerDetalle(parseInt(id));

            res.json({
                exito: true,
                datos: resultado,
            });
        } catch (error: any) {
            const status = error.message === 'Viaje no encontrado' ? 404 : 500;
            res.status(status).json({ exito: false, mensaje: error.message });
        }
    },

    /**
     * POST /api/viajes
     * Crear nuevo viaje
     */
    async crear(req: Request, res: Response) {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) {
                return res.status(401).json({ exito: false, mensaje: 'No autorizado' });
            }

            const {
                vehiculoId,
                choferId,
                clienteId,
                materialId,
                origen,
                destino,
                fechaSalida,
                fechaLlegadaEstimada,
                kilometrosEstimados,
                tarifa,
                observaciones,
            } = req.body;

            // Validaciones básicas
            if (!vehiculoId || !choferId || !clienteId || !materialId) {
                return res.status(400).json({
                    exito: false,
                    mensaje: 'Faltan campos requeridos: vehiculoId, choferId, clienteId, materialId',
                });
            }

            if (!origen || !destino || !fechaSalida || !tarifa) {
                return res.status(400).json({
                    exito: false,
                    mensaje: 'Faltan campos requeridos: origen, destino, fechaSalida, tarifa',
                });
            }

            const viaje = await viajesService.crear(
                {
                    vehiculoId: parseInt(vehiculoId),
                    choferId: parseInt(choferId),
                    clienteId: parseInt(clienteId),
                    materialId: parseInt(materialId),
                    origen,
                    destino,
                    fechaSalida: new Date(fechaSalida),
                    fechaLlegadaEstimada: fechaLlegadaEstimada ? new Date(fechaLlegadaEstimada) : undefined,
                    kilometrosEstimados: kilometrosEstimados ? parseInt(kilometrosEstimados) : undefined,
                    tarifa: parseFloat(tarifa),
                    observaciones,
                },
                usuarioId
            );

            res.status(201).json({
                exito: true,
                mensaje: 'Viaje creado exitosamente',
                datos: viaje,
            });
        } catch (error: any) {
            res.status(400).json({ exito: false, mensaje: error.message });
        }
    },

    /**
     * PUT /api/viajes/:id
     * Actualizar datos de un viaje
     */
    async actualizar(req: Request, res: Response) {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) {
                return res.status(401).json({ exito: false, mensaje: 'No autorizado' });
            }

            const { id } = req.params;
            const datos = req.body;

            // Parsear campos numéricos si vienen
            if (datos.kilometrosEstimados) datos.kilometrosEstimados = parseInt(datos.kilometrosEstimados);
            if (datos.kilometrosReales) datos.kilometrosReales = parseInt(datos.kilometrosReales);
            if (datos.tarifa) datos.tarifa = parseFloat(datos.tarifa);
            if (datos.fechaSalida) datos.fechaSalida = new Date(datos.fechaSalida);
            if (datos.fechaLlegadaEstimada) datos.fechaLlegadaEstimada = new Date(datos.fechaLlegadaEstimada);
            if (datos.fechaLlegadaReal) datos.fechaLlegadaReal = new Date(datos.fechaLlegadaReal);

            const viaje = await viajesService.actualizar(parseInt(id), datos, usuarioId);

            res.json({
                exito: true,
                mensaje: 'Viaje actualizado exitosamente',
                datos: viaje,
            });
        } catch (error: any) {
            const status = error.message === 'Viaje no encontrado' ? 404 : 400;
            res.status(status).json({ exito: false, mensaje: error.message });
        }
    },

    /**
     * PATCH /api/viajes/:id/estado
     * Cambiar estado del viaje
     */
    async cambiarEstado(req: Request, res: Response) {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) {
                return res.status(401).json({ exito: false, mensaje: 'No autorizado' });
            }

            const { id } = req.params;
            const { estado, fechaLlegadaReal, kilometrosReales } = req.body;

            if (!estado) {
                return res.status(400).json({
                    exito: false,
                    mensaje: 'El campo estado es requerido',
                });
            }

            // Validar que el estado sea válido
            if (!Object.values(EstadoViaje).includes(estado)) {
                return res.status(400).json({
                    exito: false,
                    mensaje: `Estado inválido. Estados permitidos: ${Object.values(EstadoViaje).join(', ')}`,
                });
            }

            const viaje = await viajesService.cambiarEstado(
                parseInt(id),
                estado,
                usuarioId,
                {
                    fechaLlegadaReal: fechaLlegadaReal ? new Date(fechaLlegadaReal) : undefined,
                    kilometrosReales: kilometrosReales ? parseInt(kilometrosReales) : undefined,
                }
            );

            res.json({
                exito: true,
                mensaje: `Estado cambiado a ${estado}`,
                datos: viaje,
            });
        } catch (error: any) {
            const status = error.message === 'Viaje no encontrado' ? 404 : 400;
            res.status(status).json({ exito: false, mensaje: error.message });
        }
    },

    /**
     * DELETE /api/viajes/:id
     * Eliminar viaje
     */
    async eliminar(req: Request, res: Response) {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) {
                return res.status(401).json({ exito: false, mensaje: 'No autorizado' });
            }

            const { id } = req.params;
            const resultado = await viajesService.eliminar(parseInt(id), usuarioId);

            res.json({
                exito: true,
                mensaje: resultado.mensaje,
            });
        } catch (error: any) {
            const status = error.message === 'Viaje no encontrado' ? 404 : 400;
            res.status(status).json({ exito: false, mensaje: error.message });
        }
    },
};
