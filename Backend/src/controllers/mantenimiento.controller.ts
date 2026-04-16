// Controlador de Mantenimientos
import { Request, Response } from 'express';
import { z } from 'zod';
import { mantenimientoService } from '../services/mantenimiento.service';
import { storageService } from '../services/storage.service';
import { TipoMantenimiento, EstadoMantenimiento } from '@prisma/client';
import { asyncHandler, idParam, ipCliente, numeroOpcional, usuarioActual, validar } from '../utils/http';

// Los formularios multipart envían todo como texto: "true"/"false" se convierten a booleano
const booleano = z.preprocess(v => (v === 'true' ? true : v === 'false' ? false : v), z.boolean());

const mantenimientoSchema = z.object({
    vehiculoId: z.coerce.number().int().positive('Vehículo requerido'),
    tipo: z.nativeEnum(TipoMantenimiento, { message: 'Tipo inválido (PREVENTIVO o CORRECTIVO)' }),
    estado: z.nativeEnum(EstadoMantenimiento).optional(),
    descripcion: z.string().trim().min(3, 'Descripción muy corta'),
    taller: z.string().trim().min(2, 'Taller requerido'),
    esExterno: booleano.optional(),
    costoManoObra: z.coerce.number().min(0).optional(),
    costoRepuestos: z.coerce.number().min(0).optional(),
    costoTotal: z.coerce.number().min(0).optional(),
    fecha: z.coerce.date(),
    kilometrajeAlMomento: numeroOpcional(z.coerce.number().int().min(0)),
    proximaFecha: numeroOpcional(z.coerce.date()),
    proximoKilometraje: numeroOpcional(z.coerce.number().int().min(0)),
    observaciones: z.string().optional(),
    urlComprobante: z.string().optional(),
});

// Si se adjuntó un archivo, su ruta pública reemplaza a la URL escrita a mano
const conComprobante = (req: Request, datos: Record<string, unknown>) => {
    if (req.file) {
        datos.urlComprobante = storageService.procesarArchivoSubido(req.file, 'mantenimientos').url;
    }
    return datos;
};

const fechaFiltro = (v: unknown) => (v ? new Date(v as string) : undefined);

export const mantenimientoController = {
    listar: asyncHandler(async (req: Request, res: Response) => {
        const { vehiculoId, tipo, estado, fechaDesde, fechaHasta, busqueda } = req.query;
        const mantenimientos = await mantenimientoService.listar({
            vehiculoId: vehiculoId ? Number(vehiculoId) : undefined,
            tipo: Object.values(TipoMantenimiento).includes(tipo as TipoMantenimiento) ? tipo as TipoMantenimiento : undefined,
            estado: Object.values(EstadoMantenimiento).includes(estado as EstadoMantenimiento) ? estado as EstadoMantenimiento : undefined,
            fechaDesde: fechaFiltro(fechaDesde),
            fechaHasta: fechaFiltro(fechaHasta),
            busqueda: busqueda as string,
        });
        res.json({ mantenimientos });
    }),

    obtener: asyncHandler(async (req: Request, res: Response) => {
        const mantenimiento = await mantenimientoService.obtener(idParam(req.params.id));
        res.json({ mantenimiento });
    }),

    crear: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(mantenimientoSchema, conComprobante(req, { ...req.body }));
        const nuevoMantenimiento = await mantenimientoService.crear(datos as any, usuarioActual(req).id, ipCliente(req));
        res.status(201).json({
            mensaje: 'Mantenimiento registrado exitosamente',
            mantenimiento: nuevoMantenimiento,
        });
    }),

    actualizar: asyncHandler(async (req: Request, res: Response) => {
        const datos = validar(mantenimientoSchema.partial(), conComprobante(req, { ...req.body }));
        const mantenimientoActualizado = await mantenimientoService.actualizar(
            idParam(req.params.id),
            datos as any,
            usuarioActual(req).id,
            ipCliente(req)
        );
        res.json({
            mensaje: 'Mantenimiento actualizado exitosamente',
            mantenimiento: mantenimientoActualizado,
        });
    }),

    eliminar: asyncHandler(async (req: Request, res: Response) => {
        const resultado = await mantenimientoService.eliminar(idParam(req.params.id), usuarioActual(req).id, ipCliente(req));
        res.json(resultado);
    }),

    obtenerAlertas: asyncHandler(async (req: Request, res: Response) => {
        const alertas = await mantenimientoService.obtenerAlertas();
        res.json({ alertas });
    }),

    obtenerEstadisticas: asyncHandler(async (req: Request, res: Response) => {
        const hoy = new Date();
        const anio = req.query.anio ? Number(req.query.anio) : hoy.getFullYear();
        const mes = req.query.mes ? Number(req.query.mes) : (hoy.getMonth() + 1);
        const estadisticas = await mantenimientoService.obtenerEstadisticas(anio, mes);
        res.json({ estadisticas });
    }),
};
