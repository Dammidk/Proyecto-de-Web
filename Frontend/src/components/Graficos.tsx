// GrÃ¡ficos de gestiÃ³n (Recharts)
// Paleta validada para daltonismo: ingresos = azul, costos = naranja (Î”E CVD 24.7, contraste â‰¥ 3:1).
// Marcas delgadas, esquinas de 4px ancladas a la base, grilla tenue, tooltip al pasar el mouse.
import {
    Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList,
} from 'recharts';
import { moneda, porcentaje } from '../utils/formato';

const COLORES = {
    ingresos: '#274f87',
    costos: '#b8851d',
    texto: '#52514e',
    tenue: '#8a8984',
    grilla: '#e8e7e3',
};

const ejeMoneda = (v: number) =>
    Math.abs(v) >= 1000 ? `$${(v / 1000).toLocaleString('es-EC', { maximumFractionDigits: 1 })}k` : `$${v}`;

export interface PuntoMensual {
    mes: string;
    etiqueta: string;
    ingresos: number;
    costos: number;
    gastosViaje: number;
    mantenimiento: number;
    nomina: number;
    utilidad: number;
    margen: number;
    viajes: number;
}

interface PropsTooltip<T> {
    active?: boolean;
    payload?: Array<{ payload: T }>;
}

const TooltipMensual = ({ active, payload }: PropsTooltip<PuntoMensual>) => {
    if (!active || !payload?.length) return null;
    const p: PuntoMensual = payload[0].payload;
    return (
        <div className="bg-white border border-slate-200 rounded-md shadow-lg p-3 text-xs min-w-[200px]">
            <p className="font-semibold text-slate-800 mb-2">{p.etiqueta}</p>
            <Fila color={COLORES.ingresos} texto="Ingresos" valor={moneda(p.ingresos, 0)} />
            <Fila color={COLORES.costos} texto="Costos" valor={moneda(p.costos, 0)} />
            <div className="pl-4 text-slate-500 space-y-0.5 mt-1">
                <div className="flex justify-between gap-4"><span>Gastos de ruta</span><span>{moneda(p.gastosViaje, 0)}</span></div>
                <div className="flex justify-between gap-4"><span>Mantenimiento</span><span>{moneda(p.mantenimiento, 0)}</span></div>
                <div className="flex justify-between gap-4"><span>NÃ³mina</span><span>{moneda(p.nomina, 0)}</span></div>
            </div>
            <div className="border-t border-slate-100 mt-2 pt-2 flex justify-between font-semibold text-slate-800">
                <span>Utilidad</span>
                <span>{moneda(p.utilidad, 0)} Â· {porcentaje(p.margen)}</span>
            </div>
            <p className="text-slate-400 mt-1">{p.viajes} viaje(s) completado(s)</p>
        </div>
    );
};

const Fila = ({ color, texto, valor }: { color: string; texto: string; valor: string }) => (
    <div className="flex items-center justify-between gap-4 text-slate-700">
        <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
            {texto}
        </span>
        <span className="font-medium">{valor}</span>
    </div>
);

export const Leyenda = ({ items }: { items: Array<{ color: string; texto: string }> }) => (
    <div className="flex flex-wrap gap-4 text-xs text-slate-600" role="list">
        {items.map(i => (
            <span key={i.texto} className="flex items-center gap-1.5" role="listitem">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} />
                {i.texto}
            </span>
        ))}
    </div>
);

// Barras agrupadas: ingresos vs. costos por mes (un solo eje, en USD)
export function GraficoIngresosCostos({ datos, alto = 280 }: { datos: PuntoMensual[]; alto?: number }) {
    return (
        <div>
            <Leyenda items={[{ color: COLORES.ingresos, texto: 'Ingresos' }, { color: COLORES.costos, texto: 'Costos operativos' }]} />
            <div style={{ height: alto }} className="mt-3" role="img" aria-label="Ingresos y costos operativos por mes">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datos} barGap={2} barCategoryGap="22%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke={COLORES.grilla} />
                        <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: COLORES.texto }} tickLine={false} axisLine={{ stroke: COLORES.grilla }} />
                        <YAxis tickFormatter={ejeMoneda} tick={{ fontSize: 11, fill: COLORES.texto }} tickLine={false} axisLine={false} width={56} />
                        <Tooltip content={<TooltipMensual />} cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} />
                        <Bar dataKey="ingresos" name="Ingresos" fill={COLORES.ingresos} radius={[2, 2, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="costos" name="Costos" fill={COLORES.costos} radius={[2, 2, 0, 0]} maxBarSize={28} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export interface CategoriaCosto {
    categoria: string;
    etiqueta: string;
    monto: number;
    porcentaje: number;
}

const TooltipCosto = ({ active, payload }: PropsTooltip<CategoriaCosto>) => {
    if (!active || !payload?.length) return null;
    const c: CategoriaCosto = payload[0].payload;
    return (
        <div className="bg-white border border-slate-200 rounded-md shadow-lg p-3 text-xs">
            <p className="font-semibold text-slate-800">{c.etiqueta}</p>
            <p className="text-slate-600 mt-1">{moneda(c.monto, 0)} Â· {porcentaje(c.porcentaje)} del costo</p>
        </div>
    );
};

// Barras horizontales ordenadas: composiciÃ³n del costo operativo (una sola serie, un solo color)
export function GraficoDistribucionCostos({ datos }: { datos: CategoriaCosto[] }) {
    const alto = Math.max(160, datos.length * 34 + 16);
    return (
        <div style={{ height: alto }} role="img" aria-label="DistribuciÃ³n del costo operativo por categorÃ­a">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 72, left: 0, bottom: 0 }} barCategoryGap={6}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="etiqueta" width={150} tick={{ fontSize: 12, fill: COLORES.texto }} tickLine={false} axisLine={false} />
                    <Tooltip content={<TooltipCosto />} cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} />
                    <Bar dataKey="monto" fill={COLORES.ingresos} radius={[0, 4, 4, 0]} maxBarSize={22}>
                        <LabelList dataKey="porcentaje" position="right" formatter={(v) => porcentaje(Number(v))} style={{ fontSize: 11, fill: COLORES.texto }} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

