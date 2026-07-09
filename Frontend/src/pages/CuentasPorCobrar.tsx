// Cuentas por cobrar: emisión de facturas, cobros, antigüedad de saldos y control de mora
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Wallet, FileX2, ChevronDown, ChevronRight } from 'lucide-react';
import { facturaService, clienteService, mensajeError } from '../services/api';
import { PageHeader, Kpi, Panel, Modal, Cargando, EstadoVacio } from '../components/ui';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { moneda, numero, fecha, fechaHora } from '../utils/formato';

const ETIQUETA_ESTADO: Record<string, string> = { PENDIENTE: 'Pendiente', PAGADA_PARCIAL: 'Pago parcial', PAGADA: 'Pagada', ANULADA: 'Anulada' };
const CLASE_ESTADO: Record<string, string> = { PENDIENTE: 'badge-info', PAGADA_PARCIAL: 'badge-warning', PAGADA: 'badge-success', ANULADA: 'badge-neutral' };
const ETIQUETA_METODO: Record<string, string> = { EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta' };
const ETIQUETA_ANTIGUEDAD: Record<string, string> = { CORRIENTE: 'Corriente', '1_A_30': '1 a 30 días', '31_A_60': '31 a 60 días', '61_A_90': '61 a 90 días', MAS_90: 'Más de 90 días' };

export default function CuentasPorCobrar() {
    const { isAdmin } = useAuth();
    const [facturas, setFacturas] = useState<any[]>([]);
    const [resumen, setResumen] = useState<any>(null);
    const [clientes, setClientes] = useState<any[]>([]);
    const [viajes, setViajes] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroCliente, setFiltroCliente] = useState('');
    const [expandida, setExpandida] = useState<number | null>(null);
    const [guardando, setGuardando] = useState(false);

    const [cobrando, setCobrando] = useState<any>(null);
    const [formCobro, setFormCobro] = useState({ monto: '', metodoPago: 'TRANSFERENCIA', referencia: '', observaciones: '' });
    const [anulando, setAnulando] = useState<any>(null);

    const [emitiendo, setEmitiendo] = useState(false);
    const [formNueva, setFormNueva] = useState({ clienteId: '', viajeId: '', numeroFactura: '', subtotal: '', ivaPorcentaje: '15', diasCredito: '30', observaciones: '' });

    const cargar = useCallback(async () => {
        const [f, r, v] = await Promise.all([
            facturaService.listar(),
            facturaService.obtenerResumenCartera(),
            facturaService.viajesFacturables(),
        ]);
        setFacturas(f.datos || []);
        setResumen(r.datos || null);
        setViajes(v.datos || []);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const [, c] = await Promise.all([cargar(), clienteService.listar()]);
                setClientes(c.clientes || []);
            } catch (e) {
                toast.error(mensajeError(e, 'No se pudo cargar la cartera'));
            } finally {
                setCargando(false);
            }
        })();
    }, [cargar]);

    const ejecutar = async (accion: () => Promise<unknown>, exito: string, cerrar: () => void) => {
        setGuardando(true);
        try {
            await accion();
            toast.success(exito);
            cerrar();
            await cargar();
        } catch (e) {
            toast.error(mensajeError(e));
        } finally {
            setGuardando(false);
        }
    };

    const visibles = useMemo(() => facturas.filter(f =>
        (!filtroEstado || f.estado === filtroEstado) && (!filtroCliente || String(f.clienteId) === filtroCliente)
    ), [facturas, filtroEstado, filtroCliente]);

    const viajesDelCliente = viajes.filter(v => String(v.clienteId) === formNueva.clienteId);
    const subtotalNum = Number(formNueva.subtotal) || 0;
    const ivaNum = Math.round(subtotalNum * (Number(formNueva.ivaPorcentaje) || 0)) / 100;

    const aging = resumen?.aging;
    const tramos = aging ? [
        { clave: 'corriente', etiqueta: 'Corriente', valor: aging.corriente },
        { clave: 'v1', etiqueta: '1 a 30 días', valor: aging.vencido1a30 },
        { clave: 'v2', etiqueta: '31 a 60 días', valor: aging.vencido31a60 },
        { clave: 'v3', etiqueta: '61 a 90 días', valor: aging.vencido61a90 },
        { clave: 'v4', etiqueta: 'Más de 90 días', valor: aging.vencidoMas90 },
    ] : [];
    const maxTramo = Math.max(1, ...tramos.map(t => t.valor));

    if (cargando) return <Cargando />;

    return (
        <div className="space-y-6">
            <PageHeader
                kicker="Finanzas"
                titulo="Cuentas por cobrar"
                descripcion="Facturación a clientes, registro de cobros, antigüedad de saldos y control de mora. Los clientes con deuda vencida mayor a 60 días no pueden recibir nuevos viajes."
                acciones={isAdmin && (
                    <button
                        id="cxc-emitir"
                        className="btn btn-primary"
                        onClick={() => {
                            setFormNueva({ clienteId: clientes[0] ? String(clientes[0].id) : '', viajeId: '', numeroFactura: '', subtotal: '', ivaPorcentaje: '15', diasCredito: '30', observaciones: '' });
                            setEmitiendo(true);
                        }}
                    >
                        <Plus /> Emitir factura
                    </button>
                )}
            />

            {aging && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Kpi etiqueta="Saldo por cobrar" valor={moneda(aging.totalPendiente)} tono="primary" nota={`${resumen.cantidadFacturas} facturas vigentes`} />
                    <Kpi etiqueta="Saldo vencido" valor={moneda(aging.totalVencido)} tono={aging.totalVencido > 0 ? 'danger' : 'success'} nota={aging.totalPendiente ? `${numero((aging.totalVencido / aging.totalPendiente) * 100, 1)} % de la cartera` : 'Sin cartera pendiente'} />
                    <Kpi etiqueta="Total facturado" valor={moneda(resumen.totalFacturado)} nota="Facturas no anuladas" />
                    <Kpi etiqueta="Total cobrado" valor={moneda(resumen.totalCobrado)} tono="success" nota={resumen.totalFacturado ? `${numero((resumen.totalCobrado / resumen.totalFacturado) * 100, 1)} % de lo facturado` : undefined} />
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-3">
                    <Panel titulo="Antigüedad de saldos" sinRelleno>
                        <table className="table">
                            <thead>
                                <tr><th>Tramo</th><th style={{ width: '45%' }}>Distribución</th><th className="text-right">Saldo</th></tr>
                            </thead>
                            <tbody>
                                {tramos.map(t => (
                                    <tr key={t.clave}>
                                        <td className="font-medium text-slate-800">{t.etiqueta}</td>
                                        <td>
                                            <div className="h-2 bg-slate-100 rounded-sm">
                                                <div
                                                    className={`h-full rounded-sm ${t.clave === 'corriente' ? 'bg-indigo-600' : t.clave === 'v1' ? 'bg-amber-500' : 'bg-rose-600'}`}
                                                    style={{ width: `${(t.valor / maxTramo) * 100}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="num">{moneda(t.valor)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Panel>
                </div>

                <div className="xl:col-span-2">
                    <Panel titulo="Clientes en mora" sinRelleno>
                        {resumen?.morosos?.length ? (
                            <table className="table">
                                <thead><tr><th>Cliente</th><th className="text-right">Deuda vencida</th><th className="text-right">Días</th><th>Situación</th></tr></thead>
                                <tbody>
                                    {resumen.morosos.map((m: any) => (
                                        <tr key={m.clienteId}>
                                            <td className="font-medium text-slate-800">{m.nombre}</td>
                                            <td className="num">{moneda(m.deudaVencida)}</td>
                                            <td className="num">{m.diasMoraMaxima}</td>
                                            <td>{m.bloqueado ? <span className="badge badge-danger">Bloqueado</span> : <span className="badge badge-warning">En mora</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <EstadoVacio titulo="Sin clientes en mora" texto="Todas las facturas están al día." />}
                    </Panel>
                </div>
            </div>

            <Panel titulo="Facturas" sinRelleno acciones={
                <div className="flex gap-2">
                    <select className="filter-select" style={{ minWidth: 150 }} value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} aria-label="Filtrar por cliente">
                        <option value="">Todos los clientes</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nombreRazonSocial}</option>)}
                    </select>
                    <select className="filter-select" style={{ minWidth: 150 }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} aria-label="Filtrar por estado">
                        <option value="">Todos los estados</option>
                        {Object.entries(ETIQUETA_ESTADO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </div>
            }>
                {visibles.length === 0 ? <EstadoVacio titulo="No hay facturas para los filtros seleccionados" /> : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: 28 }} />
                                    <th>Número</th><th>Cliente</th><th>Emisión</th><th>Vencimiento</th>
                                    <th className="text-right">Total</th><th className="text-right">Saldo</th><th>Estado</th>
                                    {isAdmin && <th className="text-right">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {visibles.map(f => (
                                    <Fragment key={f.id}>
                                        <tr>
                                            <td>
                                                <button className="action-btn" onClick={() => setExpandida(expandida === f.id ? null : f.id)} aria-label="Ver detalle">
                                                    {expandida === f.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </button>
                                            </td>
                                            <td className="font-mono text-xs">{f.numeroFactura}</td>
                                            <td>{f.cliente?.nombreRazonSocial}</td>
                                            <td>{fecha(f.fechaEmision)}</td>
                                            <td>
                                                {fecha(f.fechaVencimiento)}
                                                {f.esVencida && <span className="block text-xs text-rose-700">Vencida hace {f.diasVencido} días</span>}
                                            </td>
                                            <td className="num">{moneda(f.total)}</td>
                                            <td className="num">{moneda(f.saldoPendiente)}</td>
                                            <td><span className={`badge ${CLASE_ESTADO[f.estado]}`}>{ETIQUETA_ESTADO[f.estado]}</span></td>
                                            {isAdmin && (
                                                <td className="text-right whitespace-nowrap">
                                                    {(f.estado === 'PENDIENTE' || f.estado === 'PAGADA_PARCIAL') && (
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => { setCobrando(f); setFormCobro({ monto: String(f.saldoPendiente), metodoPago: 'TRANSFERENCIA', referencia: '', observaciones: '' }); }}
                                                        ><Wallet /> Cobrar</button>
                                                    )}
                                                    {f.estado === 'PENDIENTE' && f.cobros.length === 0 && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => setAnulando(f)}><FileX2 /> Anular</button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                        {expandida === f.id && (
                                            <tr className="bg-slate-50">
                                                <td />
                                                <td colSpan={isAdmin ? 8 : 7}>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
                                                        <dl className="dl">
                                                            <dt>Subtotal</dt><dd className="font-mono">{moneda(f.subtotal)}</dd>
                                                            <dt>IVA</dt><dd className="font-mono">{moneda(f.iva)}</dd>
                                                            <dt>Crédito</dt><dd>{f.diasCredito} días</dd>
                                                            <dt>Viaje</dt><dd>{f.viaje ? `#${f.viaje.id}, ${f.viaje.origen} a ${f.viaje.destino}` : 'No asociado'}</dd>
                                                            {f.antiguedad && <><dt>Antigüedad</dt><dd>{ETIQUETA_ANTIGUEDAD[f.antiguedad]}</dd></>}
                                                            {f.observaciones && <><dt>Observaciones</dt><dd>{f.observaciones}</dd></>}
                                                        </dl>
                                                        <div>
                                                            <p className="form-label">Cobros registrados</p>
                                                            {f.cobros.length === 0 ? <p className="text-sm text-slate-500">Sin cobros.</p> : (
                                                                <ul className="text-sm divide-y divide-slate-200 border border-slate-200 rounded-md bg-white">
                                                                    {f.cobros.map((c: any) => (
                                                                        <li key={c.id} className="flex justify-between gap-4 px-3 py-2">
                                                                            <span>{fechaHora(c.fecha)}, {ETIQUETA_METODO[c.metodoPago]}{c.referencia ? ` (${c.referencia})` : ''}</span>
                                                                            <span className="font-mono">{moneda(c.monto)}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            {cobrando && (
                <Modal
                    titulo={`Registrar cobro: ${cobrando.numeroFactura}`}
                    onCerrar={() => setCobrando(null)}
                    pie={<>
                        <button className="btn btn-secondary" onClick={() => setCobrando(null)}>Cancelar</button>
                        <button form="form-cobro" type="submit" className="btn btn-primary" disabled={guardando}>Registrar cobro</button>
                    </>}
                >
                    <form
                        id="form-cobro"
                        onSubmit={e => {
                            e.preventDefault();
                            ejecutar(() => facturaService.registrarCobro(cobrando.id, {
                                monto: Number(formCobro.monto),
                                metodoPago: formCobro.metodoPago,
                                referencia: formCobro.referencia || undefined,
                                observaciones: formCobro.observaciones || undefined,
                            }), 'Cobro registrado', () => setCobrando(null));
                        }}
                    >
                        <dl className="dl mb-5">
                            <dt>Cliente</dt><dd>{cobrando.cliente?.nombreRazonSocial}</dd>
                            <dt>Total</dt><dd className="font-mono">{moneda(cobrando.total)}</dd>
                            <dt>Saldo pendiente</dt><dd className="font-mono">{moneda(cobrando.saldoPendiente)}</dd>
                        </dl>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group"><label className="form-label">Monto (USD)</label><input type="number" step="0.01" min="0.01" max={cobrando.saldoPendiente} className="form-input" required value={formCobro.monto} onChange={e => setFormCobro({ ...formCobro, monto: e.target.value })} /></div>
                            <div className="form-group">
                                <label className="form-label">Método de pago</label>
                                <select className="form-select" value={formCobro.metodoPago} onChange={e => setFormCobro({ ...formCobro, metodoPago: e.target.value })}>
                                    {Object.entries(ETIQUETA_METODO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-group"><label className="form-label">Referencia</label><input className="form-input" placeholder="Número de transferencia o comprobante" value={formCobro.referencia} onChange={e => setFormCobro({ ...formCobro, referencia: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">Observaciones</label><textarea className="form-input" rows={2} value={formCobro.observaciones} onChange={e => setFormCobro({ ...formCobro, observaciones: e.target.value })} /></div>
                    </form>
                </Modal>
            )}

            {emitiendo && (
                <Modal
                    titulo="Emitir factura"
                    onCerrar={() => setEmitiendo(false)}
                    pie={<>
                        <button className="btn btn-secondary" onClick={() => setEmitiendo(false)}>Cancelar</button>
                        <button form="form-factura" type="submit" className="btn btn-primary" disabled={guardando}>Emitir</button>
                    </>}
                >
                    <form
                        id="form-factura"
                        onSubmit={e => {
                            e.preventDefault();
                            ejecutar(() => facturaService.crear({
                                clienteId: Number(formNueva.clienteId),
                                viajeId: formNueva.viajeId ? Number(formNueva.viajeId) : null,
                                numeroFactura: formNueva.numeroFactura || undefined,
                                subtotal: formNueva.subtotal ? Number(formNueva.subtotal) : null,
                                ivaPorcentaje: Number(formNueva.ivaPorcentaje),
                                diasCredito: Number(formNueva.diasCredito),
                                observaciones: formNueva.observaciones || undefined,
                            }), 'Factura emitida', () => setEmitiendo(false));
                        }}
                    >
                        <div className="form-group">
                            <label className="form-label">Cliente</label>
                            <select className="form-select" required value={formNueva.clienteId} onChange={e => setFormNueva({ ...formNueva, clienteId: e.target.value, viajeId: '', subtotal: '' })}>
                                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombreRazonSocial}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Viaje completado (opcional)</label>
                            <select
                                className="form-select"
                                value={formNueva.viajeId}
                                onChange={e => {
                                    const v = viajes.find(x => String(x.id) === e.target.value);
                                    setFormNueva({ ...formNueva, viajeId: e.target.value, subtotal: v ? String(v.tarifa) : formNueva.subtotal });
                                }}
                            >
                                <option value="">Factura sin viaje asociado</option>
                                {viajesDelCliente.map(v => <option key={v.id} value={v.id}>#{v.id}, {v.origen} a {v.destino} ({moneda(v.tarifa)})</option>)}
                            </select>
                            <p className="form-hint">{viajesDelCliente.length ? 'Al elegir un viaje se toma su tarifa como subtotal.' : 'El cliente no tiene viajes completados pendientes de facturar.'}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="form-group"><label className="form-label">Subtotal (USD)</label><input type="number" step="0.01" min="0.01" className="form-input" required value={formNueva.subtotal} onChange={e => setFormNueva({ ...formNueva, subtotal: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">IVA (%)</label><input type="number" step="0.01" min="0" max="100" className="form-input" required value={formNueva.ivaPorcentaje} onChange={e => setFormNueva({ ...formNueva, ivaPorcentaje: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Crédito (días)</label><input type="number" min="0" className="form-input" required value={formNueva.diasCredito} onChange={e => setFormNueva({ ...formNueva, diasCredito: e.target.value })} /></div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Número de factura (opcional)</label>
                            <input className="form-input font-mono" placeholder="Se asigna automáticamente (001-001-000000000)" value={formNueva.numeroFactura} onChange={e => setFormNueva({ ...formNueva, numeroFactura: e.target.value })} />
                        </div>
                        <div className="form-group"><label className="form-label">Observaciones</label><textarea className="form-input" rows={2} value={formNueva.observaciones} onChange={e => setFormNueva({ ...formNueva, observaciones: e.target.value })} /></div>
                        <dl className="dl border-t border-slate-200 pt-3">
                            <dt>Subtotal</dt><dd className="font-mono">{moneda(subtotalNum)}</dd>
                            <dt>IVA</dt><dd className="font-mono">{moneda(ivaNum)}</dd>
                            <dt>Total</dt><dd className="font-mono">{moneda(subtotalNum + ivaNum)}</dd>
                        </dl>
                    </form>
                </Modal>
            )}

            <ConfirmModal
                isOpen={!!anulando}
                onClose={() => setAnulando(null)}
                onConfirm={() => anulando && ejecutar(() => facturaService.anular(anulando.id), 'Factura anulada', () => setAnulando(null))}
                title="Anular factura"
                message={`La factura ${anulando?.numeroFactura ?? ''} quedará anulada y su saldo en cero. Solo se pueden anular facturas sin cobros registrados.`}
                confirmText="Anular factura"
                type="danger"
            />
        </div>
    );
}
