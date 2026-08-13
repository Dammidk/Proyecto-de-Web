// Analítica de gestión: CPK, rendimiento de combustible, utilización y rentabilidad
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    AlertTriangle, BarChart3, Download, Fuel, Gauge, Route as RouteIcon, TrendingUp, Truck, Users, BriefcaseBusiness,
} from 'lucide-react';
import { analiticaService, exportarService, mensajeError } from '../services/api';
import { GraficoDistribucionCostos, GraficoIngresosCostos, CategoriaCosto, PuntoMensual } from '../components/Graficos';
import { haceMeses, isoDia, moneda, numero, opcional, porcentaje } from '../utils/formato';

interface IndicadoresVehiculo {
    vehiculoId: number;
    placa: string;
    descripcion: string;
    estado: string;
    viajes: number;
    kilometros: number;
    ingresos: number;
    costoTotal: number;
    mantenimiento: number;
    correctivos: number;
    utilidad: number;
    margen: number;
    costoPorKm: number | null;
    ingresoPorKm: number | null;
    rendimientoKmGal: number | null;
    rendimientoEsperadoKmGal: number | null;
    diagnosticoCombustible: 'NORMAL' | 'BAJO' | 'SIN_DATOS' | 'SIN_REFERENCIA';
    utilizacion: number;
}

interface IndicadoresGrupo {
    clave: string;
    nombre: string;
    viajes: number;
    kilometros: number;
    ingresos: number;
    costos: number;
    utilidad: number;
    margen: number;
    ticketPromedio: number;
    costoPorKm: number | null;
}

interface IndicadoresChofer {
    choferId: number;
    nombre: string;
    viajes: number;
    kilometros: number;
    ingresosGenerados: number;
    gastosRuta: number;
    gastoPorKm: number | null;
    rendimientoKmGal: number | null;
    pagosRecibidos: number;
}

interface Tablero {
    kpis: {
        ingresos: number;
        costos: number;
        utilidad: number;
        margen: number;
        viajesCompletados: number;
        kilometros: number;
        costoPorKm: number | null;
        ingresoPorKm: number | null;
        rendimientoPromedioKmGal: number | null;
        utilizacionPromedio: number;
        alertasCombustible: number;
    };
    serieMensual: PuntoMensual[];
    distribucionCostos: CategoriaCosto[];
    vehiculos: IndicadoresVehiculo[];
    clientes: IndicadoresGrupo[];
    rutas: IndicadoresGrupo[];
    choferes: IndicadoresChofer[];
}

type Pestana = 'vehiculos' | 'clientes' | 'rutas' | 'choferes';

const PESTANAS: Array<{ id: Pestana; texto: string; Icono: typeof Truck }> = [
    { id: 'vehiculos', texto: 'Vehículos', Icono: Truck },
    { id: 'clientes', texto: 'Clientes', Icono: BriefcaseBusiness },
    { id: 'rutas', texto: 'Rutas', Icono: RouteIcon },
    { id: 'choferes', texto: 'Choferes', Icono: Users },
];

const claseUtilidad = (v: number) => (v >= 0 ? 'text-emerald-700' : 'text-rose-700');

export default function Analitica() {
    const [periodo, setPeriodo] = useState({ desde: haceMeses(12), hasta: isoDia(new Date()) });
    const [datos, setDatos] = useState<Tablero | null>(null);
    const [cargando, setCargando] = useState(true);
    const [pestana, setPestana] = useState<Pestana>('vehiculos');
    const [exportando, setExportando] = useState<string | null>(null);

    const cargar = async () => {
        try {
            setCargando(true);
            const respuesta = await analiticaService.obtener(periodo);
            setDatos(respuesta.datos);
        } catch (error) {
            toast.error(mensajeError(error, 'No se pudo cargar la analítica'));
        } finally {
            setCargando(false);
        }
    };

    // Carga inicial; después el usuario recarga con "Aplicar" al cambiar el período
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { cargar(); }, []);

    const exportar = async (tipo: 'viajes' | 'gastos' | 'mantenimientos' | 'pagos') => {
        try {
            setExportando(tipo);
            await exportarService.descargar(tipo, periodo);
        } catch (error) {
            toast.error(mensajeError(error, 'No se pudo exportar el archivo'));
        } finally {
            setExportando(null);
        }
    };

    const k = datos?.kpis;

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <h2 className="page-title">Analítica de Gestión</h2>
                    <p className="page-subtitle">Costo por kilómetro, consumo de combustible, uso de la flota y rentabilidad.</p>
                </div>
                <form
                    className="flex flex-wrap items-end gap-3"
                    onSubmit={(e) => { e.preventDefault(); cargar(); }}
                >
                    <label className="text-xs text-slate-500">
                        Desde
                        <input type="date" className="form-input mt-1 text-sm" value={periodo.desde} max={periodo.hasta}
                            onChange={(e) => setPeriodo({ ...periodo, desde: e.target.value })} required />
                    </label>
                    <label className="text-xs text-slate-500">
                        Hasta
                        <input type="date" className="form-input mt-1 text-sm" value={periodo.hasta} min={periodo.desde}
                            onChange={(e) => setPeriodo({ ...periodo, hasta: e.target.value })} required />
                    </label>
                    <button type="submit" className="btn btn-primary text-sm">Aplicar</button>
                </form>
            </div>

            {cargando && !datos ? (
                <div className="flex items-center justify-center h-[50vh]">
                    <div className="spinner h-10 w-10 border-4 border-t-indigo-600"></div>
                </div>
            ) : datos && k ? (
                <>
                    {/* KPIs principales */}
                    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${cargando ? 'opacity-60' : ''}`}>
                        <Kpi Icono={TrendingUp} titulo="Utilidad del período" valor={moneda(k.utilidad, 0)}
                            detalle={`${porcentaje(k.margen)} de margen sobre ${moneda(k.ingresos, 0)}`} claseValor={claseUtilidad(k.utilidad)} />
                        <Kpi Icono={Gauge} titulo="Costo por km (CPK)" valor={opcional(k.costoPorKm, v => moneda(v))}
                            detalle={`Ingreso por km: ${opcional(k.ingresoPorKm, v => moneda(v))} · ${numero(k.kilometros)} km`} />
                        <Kpi Icono={Fuel} titulo="Rendimiento promedio" valor={opcional(k.rendimientoPromedioKmGal, v => `${numero(v, 1)} km/gal`)}
                            detalle={k.alertasCombustible > 0 ? `${k.alertasCombustible} vehículo(s) con consumo anómalo` : 'Sin consumos anómalos'}
                            alerta={k.alertasCombustible > 0} />
                        <Kpi Icono={Truck} titulo="Utilización de flota" valor={porcentaje(k.utilizacionPromedio)}
                            detalle={`${k.viajesCompletados} viajes completados`} />
                    </div>

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                        <div className="card xl:col-span-3">
                            <h3 className="font-semibold text-slate-800">Ingresos vs. costos operativos por mes</h3>
                            <p className="text-xs text-slate-500 mb-4">Costos = gastos de ruta + mantenimiento + nómina (los anticipos no se cuentan dos veces).</p>
                            <GraficoIngresosCostos datos={datos.serieMensual} />
                        </div>
                        <div className="card xl:col-span-2">
                            <h3 className="font-semibold text-slate-800">¿En qué se va el dinero?</h3>
                            <p className="text-xs text-slate-500 mb-4">Participación de cada rubro en el costo operativo del período.</p>
                            {datos.distribucionCostos.length > 0
                                ? <GraficoDistribucionCostos datos={datos.distribucionCostos} />
                                : <p className="text-sm text-slate-400 py-10 text-center">Sin costos registrados en el período.</p>}
                        </div>
                    </div>

                    {/* Tablas de rentabilidad */}
                    <div className="card p-0 overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 border-b border-slate-100">
                            <div className="flex gap-1" role="tablist">
                                {PESTANAS.map(({ id, texto, Icono }) => (
                                    <button
                                        key={id}
                                        role="tab"
                                        aria-selected={pestana === id}
                                        onClick={() => setPestana(id)}
                                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${pestana === id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Icono className="h-4 w-4" /> {texto}
                                    </button>
                                ))}
                            </div>
                            <BarChart3 className="h-4 w-4 text-slate-300 hidden sm:block" />
                        </div>
                        <div className="overflow-x-auto">
                            {pestana === 'vehiculos' && <TablaVehiculos filas={datos.vehiculos} />}
                            {pestana === 'clientes' && <TablaGrupos filas={datos.clientes} titulo="Cliente" />}
                            {pestana === 'rutas' && <TablaGrupos filas={datos.rutas} titulo="Ruta" />}
                            {pestana === 'choferes' && <TablaChoferes filas={datos.choferes} />}
                        </div>
                    </div>

                    {/* Exportaciones */}
                    <div className="card">
                        <h3 className="font-semibold text-slate-800">Exportar para contabilidad</h3>
                        <p className="text-xs text-slate-500 mb-4">Archivos CSV del período seleccionado; se abren directamente en Excel.</p>
                        <div className="flex flex-wrap gap-3">
                            {(['viajes', 'gastos', 'mantenimientos', 'pagos'] as const).map(tipo => (
                                <button key={tipo} onClick={() => exportar(tipo)} disabled={exportando !== null} className="btn btn-secondary text-sm capitalize">
                                    <Download className="h-4 w-4" />
                                    {exportando === tipo ? 'Generando…' : tipo === 'pagos' ? 'Pagos a choferes' : tipo}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}

function Kpi({ Icono, titulo, valor, detalle, claseValor = 'text-slate-900', alerta = false }: {
    Icono: typeof Truck; titulo: string; valor: string; detalle: string; claseValor?: string; alerta?: boolean;
}) {
    return (
        <div className="card">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                <Icono className="h-4 w-4" /> {titulo}
            </div>
            <p className={`text-2xl font-bold mt-2 ${claseValor}`}>{valor}</p>
            <p className={`text-xs mt-1 flex items-center gap-1 ${alerta ? 'text-amber-700 font-medium' : 'text-slate-500'}`}>
                {alerta && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
                {detalle}
            </p>
        </div>
    );
}

const SinDatos = () => (
    <p className="text-sm text-slate-400 text-center py-10">No hay viajes completados en el período seleccionado.</p>
);

function DiagnosticoCombustible({ v }: { v: IndicadoresVehiculo }) {
    if (v.diagnosticoCombustible === 'BAJO') {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5"
                title={`Rinde ${numero(v.rendimientoKmGal, 1)} km/gal; se esperan ${numero(v.rendimientoEsperadoKmGal, 1)}. Revise posibles fugas, robo de combustible o fallas en inyectores.`}>
                <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Consumo anómalo
            </span>
        );
    }
    if (v.diagnosticoCombustible === 'NORMAL') return <span className="text-xs text-emerald-700">Normal</span>;
    if (v.diagnosticoCombustible === 'SIN_REFERENCIA') return <span className="text-xs text-slate-400">Sin referencia</span>;
    return <span className="text-xs text-slate-400">Sin datos</span>;
}

function TablaVehiculos({ filas }: { filas: IndicadoresVehiculo[] }) {
    if (!filas.some(f => f.viajes > 0 || f.costoTotal > 0)) return <SinDatos />;
    return (
        <table className="table text-sm">
            <thead>
                <tr>
                    <th>Vehículo</th>
                    <th className="text-right">Viajes</th>
                    <th className="text-right">Km</th>
                    <th className="text-right">Ingresos</th>
                    <th className="text-right">Costo total</th>
                    <th className="text-right">Utilidad</th>
                    <th className="text-right">CPK</th>
                    <th className="text-right">km/gal</th>
                    <th>Combustible</th>
                    <th className="text-right">Utilización</th>
                </tr>
            </thead>
            <tbody>
                {filas.map(v => (
                    <tr key={v.vehiculoId}>
                        <td>
                            <p className="font-semibold text-slate-800">{v.placa}</p>
                            <p className="text-xs text-slate-500">{v.descripcion}{v.correctivos > 0 ? ` · ${v.correctivos} correctivo(s)` : ''}</p>
                        </td>
                        <td className="text-right">{v.viajes}</td>
                        <td className="text-right">{numero(v.kilometros)}</td>
                        <td className="text-right">{moneda(v.ingresos, 0)}</td>
                        <td className="text-right">{moneda(v.costoTotal, 0)}</td>
                        <td className={`text-right font-semibold ${claseUtilidad(v.utilidad)}`}>{moneda(v.utilidad, 0)}</td>
                        <td className="text-right">{opcional(v.costoPorKm, x => moneda(x))}</td>
                        <td className="text-right">{opcional(v.rendimientoKmGal, x => numero(x, 1))}</td>
                        <td><DiagnosticoCombustible v={v} /></td>
                        <td className="text-right">{porcentaje(v.utilizacion)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function TablaGrupos({ filas, titulo }: { filas: IndicadoresGrupo[]; titulo: string }) {
    if (filas.length === 0) return <SinDatos />;
    return (
        <table className="table text-sm">
            <thead>
                <tr>
                    <th>{titulo}</th>
                    <th className="text-right">Viajes</th>
                    <th className="text-right">Ingresos</th>
                    <th className="text-right">Costos directos</th>
                    <th className="text-right">Utilidad</th>
                    <th className="text-right">Margen</th>
                    <th className="text-right">Tarifa promedio</th>
                    <th className="text-right">Costo por km</th>
                </tr>
            </thead>
            <tbody>
                {filas.map(g => (
                    <tr key={g.clave}>
                        <td className="font-semibold text-slate-800">{g.nombre}</td>
                        <td className="text-right">{g.viajes}</td>
                        <td className="text-right">{moneda(g.ingresos, 0)}</td>
                        <td className="text-right">{moneda(g.costos, 0)}</td>
                        <td className={`text-right font-semibold ${claseUtilidad(g.utilidad)}`}>{moneda(g.utilidad, 0)}</td>
                        <td className="text-right">{porcentaje(g.margen)}</td>
                        <td className="text-right">{moneda(g.ticketPromedio, 0)}</td>
                        <td className="text-right">{opcional(g.costoPorKm, x => moneda(x))}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function TablaChoferes({ filas }: { filas: IndicadoresChofer[] }) {
    if (filas.length === 0) return <SinDatos />;
    return (
        <table className="table text-sm">
            <thead>
                <tr>
                    <th>Chofer</th>
                    <th className="text-right">Viajes</th>
                    <th className="text-right">Km</th>
                    <th className="text-right">Ingresos generados</th>
                    <th className="text-right">Gastos de ruta</th>
                    <th className="text-right">Gasto por km</th>
                    <th className="text-right">km/gal</th>
                    <th className="text-right">Pagos recibidos</th>
                </tr>
            </thead>
            <tbody>
                {filas.map(c => (
                    <tr key={c.choferId}>
                        <td className="font-semibold text-slate-800">{c.nombre}</td>
                        <td className="text-right">{c.viajes}</td>
                        <td className="text-right">{numero(c.kilometros)}</td>
                        <td className="text-right">{moneda(c.ingresosGenerados, 0)}</td>
                        <td className="text-right">{moneda(c.gastosRuta, 0)}</td>
                        <td className="text-right">{opcional(c.gastoPorKm, x => moneda(x))}</td>
                        <td className="text-right">{opcional(c.rendimientoKmGal, x => numero(x, 1))}</td>
                        <td className="text-right">{moneda(c.pagosRecibidos, 0)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
