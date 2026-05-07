// Controlador de Pagos a Choferes
import { Request, Response } from 'express';
import { z } from 'zod';
import { pagoChoferService } from '../services/pagoChofer.service';
import { storageService } from '../services/storage.service';
import { TipoPagoChofer, MetodoPago } from '@prisma/client';
import { asyncHandler, idParam, ipCliente, numeroOpcional, usuarioActual, validar } from '../utils/http';

const pagoChoferSchema = z.object({
    choferId: z.coerce.number().int().positive('Chofer requerido'),
    viajeId: numeroOpcional(z.coerce.number().int().positive()),
    tipoPago: z.nativeEnum(TipoPagoChofer, { message: 'Tipo de pago inválido' }),
    monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
    fecha: z.coerce.date(),
    metodoPago: z.nativeEnum(MetodoPago, { message: 'Método de pago inválido' }).optional(),
    descripcion: z.string().optional(),
    urlComprobante: z.string().optional(),
});

// Si se adjuntó un archivo, su ruta pública reemplaza a la URL escrita a mano
const conComprobante = (req: Request, datos: Record<string, unknown>) => {
    if (req.file) {
        datos.urlComprobante = storageService.procesarArchivoSubido(req.file, 'pagos').url;
    }
    return datos;
};

const fechaFiltro = (v: unknown) => (v ? new Date(v as string) : undefined);

export const pagoChoferController = {
    listar: asyncHandler(async (req: Request, res: Response) => {
        const { choferId, viajeId, tipoPago, metodoPago, fechaDesde, fechaHasta, busqueda } = req.query;
        const pagos = await pagoChoferService.listar({
            choferId: choferId ? Number(choferId) : undefined,
            viajeId: viajeId ? Number(viajeId) : undefined,
            tipoPago: Object.values(TipoPagoChofer).includes(tipoPago as TipoPagoChofer) ? tipoPago as TipoPagoChofer : undefined,
            metodoPago: Object.values(MetodoPago).includes(metodoPago as MetodoPago) ? metodoPago as MetodoPago : undefined,
            fechaDesde: fechaFiltro(fechaDesde),
            fechaHasta: fechaFiltro(fechaHasta),
            busqueda: busqueda as string,
        });
        res.json({ pagos });
    }),

    obtener: asyncHandler(async (req: Request, res: Response) => {
        const pago = await pagoChoferService.obtener(idParam(req.params.id));
        res.json({ pago });
    }),

    crear: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(pagoChoferSchema, conComprobante(req, { ...req.body }));
        const nuevoPago = await pagoChoferService.crear(datos as any, usuarioActual(req).id, ipCliente(req));
        res.status(201).json({ mensaje: 'Pago registrado exitosamente', pago: nuevoPago });
    }),

    actualizar: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(pagoChoferSchema.partial(), conComprobante(req, { ...req.body }));
        const pagoActualizado = await pagoChoferService.actualizar(
            idParam(req.params.id),
            datos as any,
            usuarioActual(req).id,
            ipCliente(req)
        );
        res.json({ mensaje: 'Pago actualizado exitosamente', pago: pagoActualizado });
    }),

    eliminar: asyncHandler(async (req: Request, res: Response) => {
        const resultado = await pagoChoferService.eliminar(idParam(req.params.id), usuarioActual(req).id, ipCliente(req));
        res.json(resultado);
    }),

    obtenerResumenChofer: asyncHandler(async (req: Request, res: Response) => {
        const resumen = await pagoChoferService.obtenerResumenChofer(idParam(req.params.choferId, 'choferId'));
        res.json({ resumen });
    }),

    obtenerEstadisticas: asyncHandler(async (req: Request, res: Response) => {
        const hoy = new Date();
        const anio = req.query.anio ? Number(req.query.anio) : hoy.getFullYear();
        const mes = req.query.mes ? Number(req.query.mes) : (hoy.getMonth() + 1);
        const estadisticas = await pagoChoferService.obtenerEstadisticas(anio, mes);
        res.json({ estadisticas });
    }),
};
