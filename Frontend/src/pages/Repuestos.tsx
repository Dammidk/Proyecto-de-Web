// Inventario de repuestos con kardex de movimientos
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, History, ArrowLeftRight, Trash2 } from 'lucide-react';
import { repuestoService, vehiculoService, mensajeError } from '../services/api';
import { PageHeader, Kpi, Panel, Modal, Cargando, EstadoVacio } from '../components/ui';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { moneda, numero, fechaHora } from '../utils/formato';

const ETIQUETA_CATEGORIA: Record<string, string> = {
    FILTROS: 'Filtros', LUBRICANTES: 'Lubricantes', FRENOS: 'Frenos', SUSPENSION: 'Suspensión',
    NEUMATICOS: 'Neumáticos', ELECTRICO: 'Eléctrico', OTRO: 'Otro',
};
const ETIQUETA_NIVEL: Record<string, { texto: string; clase: string }> = {
    AGOTADO: { texto: 'Agotado', clase: 'badge-danger' },
    BAJO: { texto: 'Stock bajo', clase: 'badge-warning' },
    NORMAL: { texto: 'Normal', clase: 'badge-success' },
};
const ETIQUETA_TIPO: Record<string, string> = { ENTRADA: 'Entrada', SALIDA: 'Salida', AJUSTE: 'Ajuste' };

type Tipo = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

export default function Repuestos() {
    const { isAdmin } = useAuth();
    const [repuestos, setRepuestos] = useState<any[]>([]);
    const [resumen, setResumen] = useState<any>(null);
    const [recientes, setRecientes] = useState<any[]>([]);
    const [vehiculos, setVehiculos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [categoria, setCategoria] = useState('');
    const [guardando, setGuardando] = useState(false);

    const [kardex, setKardex] = useState<any>(null);
    const [movimiento, setMovimiento] = useState<any>(null);
    const [formMov, setFormMov] = useState({ tipo: 'ENTRADA' as Tipo, cantidad: '1', costoUnitario: '', motivo: '', referencia: '', vehiculoId: '' });
    const [nuevo, setNuevo] = useState(false);
    const [formNuevo, setFormNuevo] = useState({ codigo: '', nombre: '', categoria: 'FILTROS', unidadMedida: 'UNIDAD', stockActual: '0', stockMinimo: '2', costoUnitario: '', ubicacion: '' });
    const [eliminando, setEliminando] = useState<any>(null);

    const cargar = useCallback(async () => {
        const [lista, res, mov] = await Promise.all([
            repuestoService.listar({ categoria: categoria || undefined }),
            repuestoService.obtenerResumen(),
            repuestoService.movimientosRecientes(),
        ]);
        setRepuestos(lista.datos || []);
        setResumen(res.datos);
        setRecientes(mov.datos || []);
    }, [categoria]);

    useEffect(() => {
        cargar().catch(e => toast.error(mensajeError(e, 'No se pudo cargar el inventario'))).finally(() => setCargando(false));
    }, [cargar]);

    useEffect(() => {
        vehiculoService.listar().then(d => setVehiculos(d.vehiculos || [])).catch(() => undefined);
    }, []);

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

    const abrirKardex = async (id: number) => {
        try {
            const r = await repuestoService.obtener(id);
            setKardex(r.datos);
        } catch (e) {
            toast.error(mensajeError(e));
        }
    };

    const filtrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return repuestos.filter(r => !q || r.nombre.toLowerCase().includes(q) || r.codigo.toLowerCase().includes(q));
    }, [repuestos, busqueda]);

    const stockContado = formMov.tipo === 'AJUSTE';

    if (cargando) return <Cargando />;

    return (
        <div className="space-y-6">
            <PageHeader
                kicker="Flota y taller"
                titulo="Repuestos e inventario"
                descripcion="Existencias de bodega con kardex valorizado a costo promedio ponderado. Toda entrada, salida o ajuste queda registrada con usuario y saldo resultante."
                acciones={isAdmin && (
                    <button id="repuestos-nuevo" className="btn btn-primary" onClick={() => { setFormNuevo({ codigo: '', nombre: '', categoria: 'FILTROS', unidadMedida: 'UNIDAD', stockActual: '0', stockMinimo: '2', costoUnitario: '', ubicacion: '' }); setNuevo(true); }}>
                        <Plus /> Nuevo repuesto
                    </button>
                )}
            />

            {resumen && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Kpi etiqueta="Referencias" valor={numero(resumen.totalItems)} nota="Ítems en catálogo" />
                    <Kpi etiqueta="Valor del inventario" valor={moneda(resumen.valorInventario)} tono="primary" nota="A costo promedio" />
                    <Kpi etiqueta="Stock bajo" valor={resumen.bajoStock} tono={resumen.bajoStock ? 'warning' : 'success'} nota="En o bajo el mínimo" />
                    <Kpi etiqueta="Agotados" valor={resumen.agotados} tono={resumen.agotados ? 'danger' : 'success'} nota="Sin existencias" />
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Panel titulo="Reposición sugerida" sinRelleno>
                    {resumen?.reposicion?.length ? (
                        <table className="table">
                            <thead><tr><th>Código</th><th>Repuesto</th><th className="text-right">Stock</th><th className="text-right">Mínimo</th><th className="text-right">Sugerido</th></tr></thead>
                            <tbody>
                                {resumen.reposicion.map((r: any) => (
                                    <tr key={r.id}>
                                        <td className="font-mono text-xs">{r.codigo}</td>
                                        <td>{r.nombre}</td>
                                        <td className="num">{r.stockActual}</td>
                                        <td className="num">{r.stockMinimo}</td>
                                        <td className="num font-semibold text-slate-900">{r.sugerido}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <EstadoVacio titulo="Sin reposiciones pendientes" texto="Todas las referencias están sobre su mínimo." />}
                </Panel>

                <Panel titulo="Últimos movimientos" sinRelleno>
                    {recientes.length ? (
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Repuesto</th><th>Tipo</th><th className="text-right">Cant.</th><th>Usuario</th></tr></thead>
                            <tbody>
                                {recientes.map(m => (
                                    <tr key={m.id}>
                                        <td className="whitespace-nowrap text-xs">{fechaHora(m.fecha)}</td>
                                        <td>{m.repuesto.nombre}</td>
                                        <td>{ETIQUETA_TIPO[m.tipo]}</td>
                                        <td className="num">{m.cantidad > 0 && m.tipo === 'AJUSTE' ? '+' : ''}{m.cantidad}</td>
                                        <td className="text-xs text-slate-500">{m.usuario?.nombreCompleto}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <EstadoVacio titulo="Sin movimientos registrados" />}
                </Panel>
            </div>

            <div>
                <div className="search-bar mb-3">
                    <div className="search-input-group">
                        <Search />
                        <input placeholder="Buscar por código o nombre" value={busqueda} onChange={e => setBusqueda(e.target.value)} aria-label="Buscar repuesto" />
                    </div>
                    <select className="filter-select" value={categoria} onChange={e => setCategoria(e.target.value)} aria-label="Filtrar por categoría">
                        <option value="">Todas las categorías</option>
                        {Object.entries(ETIQUETA_CATEGORIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </div>

                <div className="table-container">
                    {filtrados.length === 0 ? <EstadoVacio titulo="No se encontraron repuestos" /> : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Código</th><th>Descripción</th><th>Categoría</th><th>Ubicación</th>
                                    <th className="text-right">Existencias</th><th className="text-right">Mínimo</th>
                                    <th className="text-right">Costo unit.</th><th className="text-right">Valor</th><th>Nivel</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.map(r => (
                                    <tr key={r.id}>
                                        <td className="font-mono text-xs">{r.codigo}</td>
                                        <td className="font-medium text-slate-800">{r.nombre}</td>
                                        <td>{ETIQUETA_CATEGORIA[r.categoria]}</td>
                                        <td>{r.ubicacion || '—'}</td>
                                        <td className="num">{r.stockActual} <span className="text-xs text-slate-500 font-sans">{r.unidadMedida.toLowerCase()}</span></td>
                                        <td className="num">{r.stockMinimo}</td>
                                        <td className="num">{moneda(r.costoUnitario)}</td>
                                        <td className="num">{moneda(r.valorTotal)}</td>
                                        <td><span className={`badge ${ETIQUETA_NIVEL[r.nivel].clase}`}>{ETIQUETA_NIVEL[r.nivel].texto}</span></td>
                                        <td className="text-right whitespace-nowrap">
                                            <button className="btn btn-ghost btn-sm" onClick={() => abrirKardex(r.id)}><History /> Kardex</button>
                                            {isAdmin && (
                                                <>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => { setMovimiento(r); setFormMov({ tipo: 'ENTRADA', cantidad: '1', costoUnitario: '', motivo: '', referencia: '', vehiculoId: '' }); }}><ArrowLeftRight /> Movimiento</button>
                                                    <button className="action-btn action-btn-danger" onClick={() => setEliminando(r)} aria-label={`Eliminar ${r.nombre}`}><Trash2 className="h-4 w-4" /></button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {kardex && (
                <Modal titulo={`Kardex: ${kardex.codigo}, ${kardex.nombre}`} ancho="lg" onCerrar={() => setKardex(null)} pie={<button className="btn btn-secondary" onClick={() => setKardex(null)}>Cerrar</button>}>
                    <div className="grid grid-cols-3 gap-4 mb-5">
                        <Kpi etiqueta="Existencias" valor={kardex.stockActual} />
                        <Kpi etiqueta="Costo promedio" valor={moneda(kardex.costoUnitario)} />
                        <Kpi etiqueta="Valor" valor={moneda(kardex.valorTotal)} tono="primary" />
                    </div>
                    {kardex.movimientos.length === 0 ? <EstadoVacio titulo="Sin movimientos" /> : (
                        <div className="table-container">
                            <table className="table">
                                <thead><tr><th>Fecha</th><th>Tipo</th><th className="text-right">Cantidad</th><th className="text-right">Costo unit.</th><th className="text-right">Saldo</th><th>Detalle</th><th>Usuario</th></tr></thead>
                                <tbody>
                                    {kardex.movimientos.map((m: any) => (
                                        <tr key={m.id}>
                                            <td className="whitespace-nowrap text-xs">{fechaHora(m.fecha)}</td>
                                            <td>{ETIQUETA_TIPO[m.tipo]}</td>
                                            <td className="num">{m.cantidad}</td>
                                            <td className="num">{moneda(m.costoUnitario)}</td>
                                            <td className="num">{m.stockResultante}</td>
                                            <td className="text-xs">{[m.vehiculo?.placa, m.motivo, m.referencia].filter(Boolean).join(' | ') || '—'}</td>
                                            <td className="text-xs text-slate-500">{m.usuario?.nombreCompleto}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Modal>
            )}

            {movimiento && (
                <Modal
                    titulo={`Registrar movimiento: ${movimiento.codigo}`}
                    onCerrar={() => setMovimiento(null)}
                    pie={<>
                        <button className="btn btn-secondary" onClick={() => setMovimiento(null)}>Cancelar</button>
                        <button form="form-movimiento" type="submit" className="btn btn-primary" disabled={guardando}>Registrar</button>
                    </>}
                >
                    <form
                        id="form-movimiento"
                        onSubmit={e => {
                            e.preventDefault();
                            ejecutar(() => repuestoService.registrarMovimiento(movimiento.id, {
                                tipo: formMov.tipo,
                                cantidad: Number(formMov.cantidad),
                                costoUnitario: formMov.tipo === 'ENTRADA' && formMov.costoUnitario ? Number(formMov.costoUnitario) : null,
                                motivo: formMov.motivo || undefined,
                                referencia: formMov.referencia || undefined,
                                vehiculoId: formMov.tipo === 'SALIDA' && formMov.vehiculoId ? Number(formMov.vehiculoId) : null,
                            }), 'Movimiento registrado', () => setMovimiento(null));
                        }}
                    >
                        <p className="text-sm text-slate-600 mb-4">Existencias actuales: <span className="font-mono font-medium text-slate-900">{movimiento.stockActual}</span> {movimiento.unidadMedida.toLowerCase()}</p>
                        <div className="form-group">
                            <label className="form-label">Tipo de movimiento</label>
                            <select className="form-select" value={formMov.tipo} onChange={e => setFormMov({ ...formMov, tipo: e.target.value as Tipo })}>
                                <option value="ENTRADA">Entrada (compra o reingreso)</option>
                                <option value="SALIDA">Salida (consumo en taller)</option>
                                <option value="AJUSTE">Ajuste por conteo físico</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="form-label">{stockContado ? 'Stock contado' : 'Cantidad'}</label>
                                <input type="number" min={stockContado ? 0 : 1} className="form-input" required value={formMov.cantidad} onChange={e => setFormMov({ ...formMov, cantidad: e.target.value })} />
                            </div>
                            {formMov.tipo === 'ENTRADA' && (
                                <div className="form-group">
                                    <label className="form-label">Costo unitario (USD)</label>
                                    <input type="number" step="0.01" min="0" className="form-input" placeholder={String(movimiento.costoUnitario)} value={formMov.costoUnitario} onChange={e => setFormMov({ ...formMov, costoUnitario: e.target.value })} />
                                </div>
                            )}
                        </div>
                        {formMov.tipo === 'SALIDA' && (
                            <div className="form-group">
                                <label className="form-label">Vehículo destino</label>
                                <select className="form-select" value={formMov.vehiculoId} onChange={e => setFormMov({ ...formMov, vehiculoId: e.target.value })}>
                                    <option value="">Sin vehículo (indicar motivo)</option>
                                    {vehiculos.map(v => <option key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Motivo{formMov.tipo === 'ENTRADA' ? ' (opcional)' : ''}</label>
                            <input className="form-input" required={formMov.tipo === 'AJUSTE' || (formMov.tipo === 'SALIDA' && !formMov.vehiculoId)} value={formMov.motivo} onChange={e => setFormMov({ ...formMov, motivo: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Referencia (factura, orden de trabajo)</label>
                            <input className="form-input" value={formMov.referencia} onChange={e => setFormMov({ ...formMov, referencia: e.target.value })} />
                        </div>
                    </form>
                </Modal>
            )}

            {nuevo && (
                <Modal
                    titulo="Nuevo repuesto"
                    onCerrar={() => setNuevo(false)}
                    pie={<>
                        <button className="btn btn-secondary" onClick={() => setNuevo(false)}>Cancelar</button>
                        <button form="form-repuesto" type="submit" className="btn btn-primary" disabled={guardando}>Registrar</button>
                    </>}
                >
                    <form
                        id="form-repuesto"
                        onSubmit={e => {
                            e.preventDefault();
                            ejecutar(() => repuestoService.crear({
                                ...formNuevo,
                                stockActual: Number(formNuevo.stockActual),
                                stockMinimo: Number(formNuevo.stockMinimo),
                                costoUnitario: Number(formNuevo.costoUnitario),
                            }), 'Repuesto registrado', () => setNuevo(false));
                        }}
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group"><label className="form-label">Código</label><input className="form-input font-mono" required value={formNuevo.codigo} onChange={e => setFormNuevo({ ...formNuevo, codigo: e.target.value })} /></div>
                            <div className="form-group">
                                <label className="form-label">Categoría</label>
                                <select className="form-select" value={formNuevo.categoria} onChange={e => setFormNuevo({ ...formNuevo, categoria: e.target.value })}>
                                    {Object.entries(ETIQUETA_CATEGORIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-group"><label className="form-label">Descripción</label><input className="form-input" required value={formNuevo.nombre} onChange={e => setFormNuevo({ ...formNuevo, nombre: e.target.value })} /></div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="form-group"><label className="form-label">Stock inicial</label><input type="number" min="0" className="form-input" required value={formNuevo.stockActual} onChange={e => setFormNuevo({ ...formNuevo, stockActual: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Stock mínimo</label><input type="number" min="0" className="form-input" required value={formNuevo.stockMinimo} onChange={e => setFormNuevo({ ...formNuevo, stockMinimo: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Costo (USD)</label><input type="number" step="0.01" min="0" className="form-input" required value={formNuevo.costoUnitario} onChange={e => setFormNuevo({ ...formNuevo, costoUnitario: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group"><label className="form-label">Unidad de medida</label><input className="form-input" required value={formNuevo.unidadMedida} onChange={e => setFormNuevo({ ...formNuevo, unidadMedida: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Ubicación</label><input className="form-input" placeholder="Estante A-3" value={formNuevo.ubicacion} onChange={e => setFormNuevo({ ...formNuevo, ubicacion: e.target.value })} /></div>
                        </div>
                    </form>
                </Modal>
            )}

            <ConfirmModal
                isOpen={!!eliminando}
                onClose={() => setEliminando(null)}
                onConfirm={() => eliminando && ejecutar(() => repuestoService.eliminar(eliminando.id), 'Repuesto eliminado', () => setEliminando(null))}
                title="Eliminar repuesto"
                message={`Se eliminará ${eliminando?.nombre ?? ''} del catálogo. Solo es posible si no tiene movimientos en el kardex distintos del inventario inicial.`}
                confirmText="Eliminar"
                type="danger"
            />
        </div>
    );
}
