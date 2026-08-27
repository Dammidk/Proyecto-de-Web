// Panel de control: indicadores operativos, alertas consolidadas y balance del mes
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios, { analiticaService, facturaService, neumaticoService, repuestoService } from '../services/api';
import { GraficoIngresosCostos, PuntoMensual } from '../components/Graficos';
import Semaforo, { NivelAlerta } from '../components/Semaforo';
import { PageHeader, Kpi, Panel, Cargando, EstadoVacio } from '../components/ui';
import { haceMeses, isoDia, moneda, numero } from '../utils/formato';

interface DashboardStats {
    vehiculos: { activos: number; total: number };
    choferes: { activos: number; total: number };
    clientes: { activos: number; total: number };
    materiales: { total: number };
    viajesMes?: {
        total: number;
        completados: number;
        ingresosTotal: number;
        gastosTotales: number;
        costosMantenimiento?: number;
        pagosChoferes?: number;
        gananciaEstimada: number;
        gananciaNeta?: number;
        margenNetoPorcentaje?: number;
        kilometrosRecorridos?: number;
        costoPorKm?: number | null;
    };
    cumplimiento?: {
        resumen: { vencidos: number; criticos: number; urgentes: number; proximos: number; vehiculosBloqueados: number; choferesBloqueados: number };
        alertas: Array<{ tipoEntidad: string; entidadId: number; nombre: string; documento: string; nivel: NivelAlerta; diasRestantes: number | null }>;
    };
    alertasMantenimiento?: Array<{ vehiculoId: number; placa: string; marca: string; modelo: string; kilometrajeActual: number; tipoAlerta: string; mensaje: string }>;
}

interface Pendiente {
    severidad: 'alta' | 'media';
    area: string;
    detalle: string;
    ruta: string;
}

const Dashboard = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [serie, setSerie] = useState<PuntoMensual[]>([]);
    const [pendientes, setPendientes] = useState<Pendiente[]>([]);
    const [cartera, setCartera] = useState<any>(null);

    const cargar = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await axios.get('/dashboard');
            setStats(data.resumen);

            // Los módulos secundarios no bloquean el panel si alguno falla
            analiticaService.obtener({ desde: haceMeses(6), hasta: isoDia(new Date()) })
                .then(r => setSerie(r.datos.serieMensual)).catch(() => setSerie([]));

            const [neum, rep, car] = await Promise.allSettled([
                neumaticoService.obtenerResumen(), repuestoService.obtenerResumen(), facturaService.obtenerResumenCartera(),
            ]);
            const lista: Pendiente[] = [];
            if (neum.status === 'fulfilled' && neum.value.datos.criticos > 0) {
                lista.push({ severidad: 'alta', area: 'Neumáticos', detalle: `${neum.value.datos.criticos} neumático(s) en estado crítico requieren cambio o reencauche`, ruta: '/neumaticos' });
            }
            if (rep.status === 'fulfilled') {
                const r = rep.value.datos;
                if (r.agotados > 0) lista.push({ severidad: 'alta', area: 'Repuestos', detalle: `${r.agotados} referencia(s) agotada(s) en bodega`, ruta: '/repuestos' });
                if (r.bajoStock > 0) lista.push({ severidad: 'media', area: 'Repuestos', detalle: `${r.bajoStock} referencia(s) con stock en o bajo el mínimo`, ruta: '/repuestos' });
            }
            if (car.status === 'fulfilled') {
                const c = car.value.datos;
                setCartera(c);
                const bloqueados = c.morosos.filter((m: any) => m.bloqueado);
                if (bloqueados.length > 0) {
                    lista.push({ severidad: 'alta', area: 'Cartera', detalle: `${bloqueados.length} cliente(s) bloqueado(s) por mora mayor a ${c.diasBloqueoPorMora} días: ${bloqueados.map((m: any) => m.nombre).join(', ')}`, ruta: '/cuentas-cobrar' });
                }
                const enMora = c.morosos.length - bloqueados.length;
                if (enMora > 0) lista.push({ severidad: 'media', area: 'Cartera', detalle: `${enMora} cliente(s) con facturas vencidas`, ruta: '/cuentas-cobrar' });
            }
            if (data.resumen.alertasMantenimiento?.length) {
                lista.push({ severidad: 'media', area: 'Mantenimiento', detalle: `${data.resumen.alertasMantenimiento.length} vehículo(s) con mantenimiento preventivo o correctivo pendiente`, ruta: '/mantenimientos' });
            }
            setPendientes(lista);
        } catch (err) {
            setError('No se pudo cargar la información del panel de control.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    if (loading) return <Cargando />;

    if (error) {
        return (
            <div className="panel max-w-lg mx-auto mt-16 p-8 text-center">
                <h3 className="text-base font-semibold text-slate-900">Error de conexión</h3>
                <p className="text-sm text-slate-600 mt-2">{error}</p>
                <button onClick={cargar} className="mt-5 btn btn-secondary">Reintentar</button>
            </div>
        );
    }

    const m = stats?.viajesMes;
    const neta = m ? (m.gananciaNeta ?? m.gananciaEstimada) : 0;

    return (
        <div className="space-y-6">
            <PageHeader
                kicker="Resumen"
                titulo="Panel de control"
                descripcion="Estado operativo de la flota, alertas que requieren atención y resultado económico del mes en curso."
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi etiqueta="Vehículos activos" valor={stats?.vehiculos.activos ?? 0} nota={`${stats?.vehiculos.total ?? 0} registrados`} tono="primary" />
                <Kpi etiqueta="Conductores activos" valor={stats?.choferes.activos ?? 0} nota={`${stats?.choferes.total ?? 0} registrados`} tono="primary" />
                <Kpi etiqueta="Clientes activos" valor={stats?.clientes.activos ?? 0} nota={`${stats?.clientes.total ?? 0} registrados`} tono="primary" />
                <Kpi
                    etiqueta="Saldo por cobrar"
                    valor={cartera ? moneda(cartera.aging.totalPendiente, 0) : '—'}
                    tono={cartera?.aging.totalVencido > 0 ? 'warning' : 'primary'}
                    nota={cartera ? `${moneda(cartera.aging.totalVencido, 0)} vencido` : 'No disponible'}
                />
            </div>

            <Panel titulo="Atención requerida" sinRelleno acciones={<span className="text-xs text-slate-500">{pendientes.length} asunto(s)</span>}>
                {pendientes.length === 0 ? (
                    <EstadoVacio titulo="Sin asuntos pendientes" texto="No hay alertas operativas, de inventario ni de cartera." />
                ) : (
                    <table className="table">
                        <thead><tr><th style={{ width: 90 }}>Prioridad</th><th style={{ width: 150 }}>Área</th><th>Detalle</th><th /></tr></thead>
                        <tbody>
                            {pendientes.map(p => (
                                <tr key={`${p.area}-${p.detalle}`}>
                                    <td><span className={`badge ${p.severidad === 'alta' ? 'badge-danger' : 'badge-warning'}`}>{p.severidad === 'alta' ? 'Alta' : 'Media'}</span></td>
                                    <td className="font-medium text-slate-800">{p.area}</td>
                                    <td>{p.detalle}</td>
                                    <td className="text-right"><Link to={p.ruta} className="text-sm font-medium text-indigo-700 hover:underline">Revisar</Link></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Panel>

            {stats?.cumplimiento && stats.cumplimiento.alertas.length > 0 && (
                <Panel
                    titulo="Documentos vencidos o por vencer"
                    sinRelleno
                    acciones={<Link to="/documentos" className="text-sm font-medium text-indigo-700 hover:underline">Ver todos</Link>}
                >
                    <div className="px-5 py-3 text-sm text-slate-600 border-b border-slate-100">
                        {stats.cumplimiento.resumen.vencidos} vencido(s). {stats.cumplimiento.resumen.vehiculosBloqueados + stats.cumplimiento.resumen.choferesBloqueados} unidad(es) o conductor(es) bloqueado(s) para nuevos viajes.
                    </div>
                    <ul className="divide-y divide-slate-100">
                        {stats.cumplimiento.alertas.slice(0, 5).map(a => (
                            <li key={`${a.tipoEntidad}-${a.entidadId}-${a.documento}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                                <span>
                                    <span className="font-medium text-slate-800">{a.nombre}</span>
                                    <span className="text-slate-500">, {a.documento}</span>
                                </span>
                                <Semaforo nivel={a.nivel} dias={a.diasRestantes} />
                            </li>
                        ))}
                    </ul>
                </Panel>
            )}

            {m && (
                <section>
                    <div className="flex items-baseline justify-between mb-3">
                        <h2 className="text-base font-semibold text-slate-900">Balance operativo del mes</h2>
                        <span className="text-xs text-slate-500">Consolidado al {new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long' })}</span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <Kpi etiqueta="Viajes" valor={m.total} nota={`${m.completados} completados`} />
                        <Kpi etiqueta="Ingresos (tarifas)" valor={moneda(m.ingresosTotal, 0)} tono="success" nota="Viajes del mes" />
                        <Kpi etiqueta="Gastos de ruta" valor={moneda(m.gastosTotales, 0)} tono="danger" nota="Combustible, peajes y otros" />
                        <Kpi etiqueta="Mantenimiento" valor={moneda(m.costosMantenimiento || 0, 0)} tono="warning" nota="Taller y repuestos" />
                        <Kpi etiqueta="Pago a conductores" valor={moneda(m.pagosChoferes || 0, 0)} nota="Excluye anticipos" />
                        <Kpi
                            etiqueta="Resultado neto"
                            valor={moneda(neta, 0)}
                            tono={neta >= 0 ? 'success' : 'danger'}
                            nota={m.ingresosTotal > 0 ? `${numero(m.margenNetoPorcentaje ?? (neta / m.ingresosTotal) * 100, 1)} % de margen` : 'Sin operaciones'}
                        />
                    </div>
                    {(m.kilometrosRecorridos ?? 0) > 0 && (
                        <p className="mt-3 text-sm text-slate-600">
                            {numero(m.kilometrosRecorridos)} km recorridos en el mes. Costo por kilómetro: <span className="font-mono">{m.costoPorKm != null ? moneda(m.costoPorKm) : '—'}</span>
                        </p>
                    )}
                </section>
            )}

            {serie.length > 0 && (
                <Panel
                    titulo="Tendencia de los últimos 6 meses"
                    acciones={<Link to="/analitica" className="text-sm font-medium text-indigo-700 hover:underline">Analítica completa</Link>}
                >
                    <p className="text-xs text-slate-500 mb-4">Ingresos de viajes completados frente a costos operativos.</p>
                    <GraficoIngresosCostos datos={serie} alto={240} />
                </Panel>
            )}
        </div>
    );
};

export default Dashboard;
