// Controlador de reportes: analítica de gestión, cumplimiento documental y exportaciones
import { Request, Response } from 'express';
import { z } from 'zod';
import { analiticaService, resolverPeriodo } from '../services/analitica.service';
import { cumplimientoService } from '../services/cumplimiento.service';
import { exportarService, TIPOS_EXPORTACION } from '../services/exportar.service';
import { asyncHandler, validar } from '../utils/http';

// 'YYYY-MM-DD' se interpreta como día local (new Date('2026-10-01') sería medianoche UTC,
// que en Ecuador cae el 30 de septiembre)
const diaLocal = z.preprocess(v => {
    const m = typeof v === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(v) : null;
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : v;
}, z.coerce.date());

const periodoSchema = z.object({
    desde: diaLocal.optional(),
    hasta: diaLocal.optional(),
});

const periodoDe = (req: Request) => {
    const { desde, hasta } = validar(periodoSchema, req.query);
    return resolverPeriodo(desde, hasta);
};

// GET /api/analitica?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
export const obtenerAnalitica = asyncHandler(async (req: Request, res: Response) => {
    const tablero = await analiticaService.obtenerTablero(periodoDe(req));
    res.json({ exito: true, datos: tablero });
});

// GET /api/cumplimiento
export const obtenerCumplimiento = asyncHandler(async (req: Request, res: Response) => {
    const estado = await cumplimientoService.obtenerEstado();
    res.json({ exito: true, datos: estado });
});

// GET /api/exportar/:tipo?desde&hasta  → archivo CSV
export const exportar = asyncHandler(async (req: Request, res: Response) => {
    const tipo = validar(z.enum(TIPOS_EXPORTACION, { message: `Tipo inválido. Use: ${TIPOS_EXPORTACION.join(', ')}` }), req.params.tipo);
    const periodo = periodoDe(req);
    const csv = await exportarService.generar(tipo, periodo);
    // Fechas en hora local del servidor (toISOString pasaría el fin del día al día siguiente en UTC)
    const dia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const nombre = `${tipo}_${dia(periodo.desde)}_${dia(periodo.hasta)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(csv);
});
