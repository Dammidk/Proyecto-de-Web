// Control de neumáticos: visor 3D por posición, ficha técnica, inspecciones, reencauche y rotación
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, ClipboardCheck, RefreshCcw, ArrowLeftRight, Ban } from 'lucide-react';
import { neumaticoService, vehiculoService, mensajeError } from '../services/api';
import Camion3DNeumaticos, { Neumatico3D, POSICIONES_EJES } from '../components/Camion3DNeumaticos';
import { PageHeader, Kpi, Panel, Modal, Campo, Cargando, EstadoVacio } from '../components/ui';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { moneda, numero, fecha, opcional } from '../utils/formato';

interface NeumaticoDetalle extends Neumatico3D {
    estado: string;
    profundidadInicialMm: number;
    costoCompra: number;
    kilometrosRecorridos: number;
    numeroReencauches: number;
    fechaInstalacion: string | null;
    vehiculoId: number | null;
    vehiculo?: { placa: string } | null;
    alertas: string[];
    vidaUtilConsumida: number;
    observaciones?: string | null;
    inspecciones?: Array<{ id: number; fecha: string; profundidadMm: number; presionPsi: number; observaciones: string | null }>;
}

const ETIQUETA_SALUD: Record<string, string> = { OPTIMO: 'Óptimo', ADVERTENCIA: 'Advertencia', CRITICO: 'Crítico' };
const CLASE_SALUD: Record<string, string> = { OPTIMO: 'badge-success', ADVERTENCIA: 'badge-warning', CRITICO: 'badge-danger' };
const ETIQUETA_ESTADO: Record<string, string> = { NUEVO: 'Nuevo', EN_USO: 'En uso', EN_REPARACION: 'En bodega', DESECHO: 'Dado de baja' };

const POSICIONES = [...Object.keys(POSICIONES_EJES), 'REPUESTO'];
const nombrePosicion = (p: string | null) => (p ? (POSICIONES_EJES[p]?.etiqueta ?? (p === 'REPUESTO' ? 'Neumático de repuesto' : p)) : 'Sin posición');

const BadgeSalud = ({ salud }: { salud: string }) => (
    <span className={`badge ${CLASE_SALUD[salud]}`}>{ETIQUETA_SALUD[salud]}</span>
);

type Dialogo = null | 'nuevo' | 'inspeccion' | 'reencauche' | 'reubicar' | 'baja';

export default function Neumaticos() {
    const { isAdmin } = useAuth();
    const [vehiculos, setVehiculos] = useState<any[]>([]);
    const [vehiculoId, setVehiculoId] = useState<number | null>(null);
    const [neumaticos, setNeumaticos] = useState<NeumaticoDetalle[]>([]);
    const [bodega, setBodega] = useState<NeumaticoDetalle[]>([]);
    const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
    const [resumen, setResumen] = useState<any>(null);
    const [cargando, setCargando] = useState(true);
    const [dialogo, setDialogo] = useState<Dialogo>(null);
    const [guardando, setGuardando] = useState(false);

    const [formInspeccion, setFormInspeccion] = useState({ profundidadMm: '', presionPsi: '', kilometrajeVehiculo: '', desgasteIrregular: false, observaciones: '' });
    const [formReencauche, setFormReencauche] = useState({ costo: '', profundidadMm: '16', observaciones: '' });
    const [formReubicar, setFormReubicar] = useState({ vehiculoId: '', posicionActual: '1DI' });
    const [formNuevo, setFormNuevo] = useState({
        codigoSerie: '', marca: '', modelo: '', medida: '295/80R22.5', profundidadInicialMm: '16',
        presionRecomendadaPsi: '110', costoCompra: '', posicionActual: '', montar: true,
    });

    const seleccionado = useMemo(
        () => [...neumaticos, ...bodega].find(n => n.id === seleccionadoId) ?? null,
        [neumaticos, bodega, seleccionadoId]
    );
    const vehiculo = vehiculos.find(v => v.id === vehiculoId);

    const cargarResumenYBodega = useCallback(async () => {
        const [r, b] = await Promise.all([neumaticoService.obtenerResumen(), neumaticoService.listar()]);
        setResumen(r.datos);
        setBodega((b.datos as NeumaticoDetalle[]).filter(n => n.vehiculoId === null && n.estado !== 'DESECHO'));
    }, []);

    const cargarNeumaticos = useCallback(async (id: number) => {
        const res = await neumaticoService.listar({ vehiculoId: id });
        setNeumaticos(res.datos);
        return res.datos as NeumaticoDetalle[];
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const data = await vehiculoService.listar();
                const lista = data.vehiculos || [];
                setVehiculos(lista);
                if (lista.length > 0) setVehiculoId(lista[0].id);
                await cargarResumenYBodega();
            } catch (e) {
                toast.error(mensajeError(e, 'No se pudo cargar la información de neumáticos'));
            } finally {
                setCargando(false);
            }
        })();
    }, [cargarResumenYBodega]);

    useEffect(() => {
        if (!vehiculoId) return;
        cargarNeumaticos(vehiculoId)
            .then(lista => setSeleccionadoId(prev => (prev && lista.some(n => n.id === prev) ? prev : lista[0]?.id ?? null)))
            .catch(e => toast.error(mensajeError(e, 'No se pudieron cargar los neumáticos del vehículo')));
    }, [vehiculoId, cargarNeumaticos]);

    const refrescar = async () => {
        if (vehiculoId) await cargarNeumaticos(vehiculoId);
        await cargarResumenYBodega();
    };

    const ejecutar = async (accion: () => Promise<unknown>, exito: string) => {
        setGuardando(true);
        try {
            await accion();
            toast.success(exito);
            setDialogo(null);
            await refrescar();
        } catch (e) {
            toast.error(mensajeError(e));
        } finally {
            setGuardando(false);
        }
    };

    const abrirInspeccion = () => {
        if (!seleccionado) return;
        setFormInspeccion({
            profundidadMm: String(seleccionado.profundidadActualMm),
            presionPsi: String(seleccionado.presionActualPsi ?? seleccionado.presionRecomendadaPsi),
            kilometrajeVehiculo: '', desgasteIrregular: false, observaciones: '',
        });
        setDialogo('inspeccion');
    };

    const abrirReubicar = () => {
        if (!seleccionado) return;
        setFormReubicar({ vehiculoId: seleccionado.vehiculoId ? String(seleccionado.vehiculoId) : String(vehiculoId ?? ''), posicionActual: seleccionado.posicionActual ?? '1DI' });
        setDialogo('reubicar');
    };

    const kpis = resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Kpi etiqueta="Neumáticos activos" valor={resumen.total} nota={`${resumen.montados} montados, ${resumen.enBodega} en bodega`} />
            <Kpi etiqueta="Estado crítico" valor={resumen.criticos} tono={resumen.criticos ? 'danger' : 'success'} nota="Requieren cambio o reencauche" />
            <Kpi etiqueta="En advertencia" valor={resumen.advertencias} tono={resumen.advertencias ? 'warning' : 'success'} nota="Desgaste medio o presión" />
            <Kpi etiqueta="Inversión acumulada" valor={moneda(resumen.inversionTotal, 0)} tono="primary" nota="Compra y reencauches" />
            <Kpi etiqueta="Costo por km promedio" valor={opcional(resumen.costoPorKmPromedio, v => moneda(v, 4))} nota="Sobre neumáticos con recorrido" />
        </div>
    );

    if (cargando) return <Cargando />;

    return (
        <div className="space-y-6">
            <PageHeader
                kicker="Flota y taller"
                titulo="Control de neumáticos"
                descripcion="Estado de cada neumático por posición de eje, mediciones de labrado y presión, reencauches y costo por kilómetro."
                acciones={isAdmin && (
                    <button
                        id="neumaticos-nuevo"
                        className="btn btn-primary"
                        onClick={() => {
                            setFormNuevo(f => ({ ...f, montar: !!vehiculoId, posicionActual: '' }));
                            setDialogo('nuevo');
                        }}
                    >
                        <Plus /> Registrar neumático
                    </button>
                )}
            />

            {kpis}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <label htmlFor="neumaticos-vehiculo" className="form-label mb-0">Unidad</label>
                        <select
                            id="neumaticos-vehiculo"
                            className="filter-select"
                            value={vehiculoId ?? ''}
                            onChange={e => setVehiculoId(Number(e.target.value))}
                        >
                            {vehiculos.map(v => (
                                <option key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo}</option>
                            ))}
                        </select>
                        {vehiculo && <span className="text-xs text-slate-500 font-mono">{numero(vehiculo.kilometrajeActual)} km de odómetro</span>}
                    </div>
                    <Camion3DNeumaticos
                        neumaticos={neumaticos}
                        neumaticoSeleccionadoId={seleccionadoId}
                        onSeleccionarNeumatico={n => setSeleccionadoId(n.id)}
                    />
                </div>

                <Panel titulo="Ficha del neumático" sinRelleno>
                    {!seleccionado ? (
                        <EstadoVacio titulo="Sin neumático seleccionado" texto="Seleccione una rueda en el visor o una fila de las tablas." />
                    ) : (
                        <div className="p-5 space-y-5">
                            <div>
                                <p className="font-mono text-sm font-medium text-slate-900">{seleccionado.codigoSerie}</p>
                                <p className="text-sm text-slate-500">{seleccionado.marca} {seleccionado.modelo}, {seleccionado.medida}</p>
                                <div className="mt-2 flex gap-2 flex-wrap">
                                    <BadgeSalud salud={seleccionado.salud} />
                                    <span className="badge badge-neutral">{ETIQUETA_ESTADO[seleccionado.estado] ?? seleccionado.estado}</span>
                                </div>
                            </div>

                            <dl className="dl">
                                <Campo etiqueta="Posición">{nombrePosicion(seleccionado.posicionActual)}</Campo>
                                <Campo etiqueta="Vehículo">{seleccionado.vehiculo?.placa ?? 'En bodega'}</Campo>
                                <Campo etiqueta="Labrado">
                                    <span className="font-mono">{seleccionado.profundidadActualMm.toFixed(1)} mm</span>
                                    <span className="text-slate-500 font-normal"> de {seleccionado.profundidadInicialMm.toFixed(1)} mm</span>
                                </Campo>
                                <Campo etiqueta="Presión">
                                    <span className="font-mono">{seleccionado.presionActualPsi ?? '—'} psi</span>
                                    <span className="text-slate-500 font-normal"> (recomendada {seleccionado.presionRecomendadaPsi})</span>
                                </Campo>
                                <Campo etiqueta="Recorrido"><span className="font-mono">{numero(seleccionado.kilometrosRecorridos)} km</span></Campo>
                                <Campo etiqueta="Reencauches"><span className="font-mono">{seleccionado.numeroReencauches}</span></Campo>
                                <Campo etiqueta="Inversión"><span className="font-mono">{moneda(seleccionado.costoCompra)}</span></Campo>
                                <Campo etiqueta="Costo por km"><span className="font-mono">{opcional(seleccionado.costoPorKm, v => moneda(v, 4))}</span></Campo>
                                <Campo etiqueta="Instalado">{fecha(seleccionado.fechaInstalacion)}</Campo>
                            </dl>

                            <div>
                                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                    <span>Vida útil consumida hasta reencauche</span>
                                    <span className="font-mono">{seleccionado.vidaUtilConsumida}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-200 rounded-sm overflow-hidden">
                                    <div
                                        className={`h-full ${seleccionado.vidaUtilConsumida >= 90 ? 'bg-rose-600' : seleccionado.vidaUtilConsumida >= 65 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                                        style={{ width: `${seleccionado.vidaUtilConsumida}%` }}
                                    />
                                </div>
                            </div>

                            {seleccionado.alertas.length > 0 && (
                                <div className="border border-amber-200 bg-amber-50 rounded-md px-3 py-2">
                                    <p className="text-xs font-semibold uppercase text-amber-800 mb-1" style={{ letterSpacing: '0.05em' }}>Alertas</p>
                                    <ul className="text-sm text-amber-900 space-y-1 list-disc pl-4">
                                        {seleccionado.alertas.map(a => <li key={a}>{a}</li>)}
                                    </ul>
                                </div>
                            )}

                            {seleccionado.inspecciones && seleccionado.inspecciones.length > 0 && (
                                <div>
                                    <p className="form-label">Última inspección</p>
                                    <p className="text-sm text-slate-700">
                                        {fecha(seleccionado.inspecciones[0].fecha)}: {Number(seleccionado.inspecciones[0].profundidadMm).toFixed(1)} mm, {seleccionado.inspecciones[0].presionPsi} psi
                                    </p>
                                    {seleccionado.inspecciones[0].observaciones && (
                                        <p className="text-xs text-slate-500 mt-0.5">{seleccionado.inspecciones[0].observaciones}</p>
                                    )}
                                </div>
                            )}

                            {isAdmin && seleccionado.estado !== 'DESECHO' && (
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <button className="btn btn-secondary btn-sm" onClick={abrirInspeccion}><ClipboardCheck /> Inspección</button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => { setFormReencauche({ costo: '', profundidadMm: String(seleccionado.profundidadInicialMm), observaciones: '' }); setDialogo('reencauche'); }}><RefreshCcw /> Reencauche</button>
                                    <button className="btn btn-secondary btn-sm" onClick={abrirReubicar}><ArrowLeftRight /> Reubicar</button>
                                    <button className="btn btn-secondary btn-sm text-rose-700" onClick={() => setDialogo('baja')}><Ban /> Dar de baja</button>
                                </div>
                            )}
                        </div>
                    )}
                </Panel>
            </div>

            <Panel titulo={`Neumáticos montados${vehiculo ? ` en ${vehiculo.placa}` : ''}`} sinRelleno>
                <TablaNeumaticos lista={neumaticos} seleccionadoId={seleccionadoId} onSeleccionar={setSeleccionadoId} vacio="La unidad no tiene neumáticos montados." mostrarPosicion />
            </Panel>

            <Panel titulo="Neumáticos en bodega" sinRelleno>
                <TablaNeumaticos lista={bodega} seleccionadoId={seleccionadoId} onSeleccionar={setSeleccionadoId} vacio="No hay neumáticos disponibles en bodega." />
            </Panel>

            {dialogo === 'nuevo' && (
                <Modal
                    titulo="Registrar neumático"
                    onCerrar={() => setDialogo(null)}
                    pie={<>
                        <button className="btn btn-secondary" onClick={() => setDialogo(null)}>Cancelar</button>
                        <button
                            form="form-neumatico-nuevo" type="submit" className="btn btn-primary" disabled={guardando}
                        >Registrar</button>
                    </>}
                >
                    <form
                        id="form-neumatico-nuevo"
                        onSubmit={e => {
                            e.preventDefault();
                            const montar = formNuevo.montar && vehiculoId;
                            ejecutar(() => neumaticoService.crear({
                                codigoSerie: formNuevo.codigoSerie,
                                marca: formNuevo.marca,
                                modelo: formNuevo.modelo,
                                medida: formNuevo.medida,
                                profundidadInicialMm: Number(formNuevo.profundidadInicialMm),
                                presionRecomendadaPsi: Number(formNuevo.presionRecomendadaPsi),
                                presionActualPsi: Number(formNuevo.presionRecomendadaPsi),
                                costoCompra: Number(formNuevo.costoCompra),
                                vehiculoId: montar ? vehiculoId : null,
                                posicionActual: montar ? formNuevo.posicionActual : null,
                            }), 'Neumático registrado');
                        }}
                    >
                        <div className="form-group">
                            <label className="form-label">Código de serie (DOT)</label>
                            <input className="form-input font-mono" required value={formNuevo.codigoSerie} onChange={e => setFormNuevo({ ...formNuevo, codigoSerie: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group"><label className="form-label">Marca</label><input className="form-input" required value={formNuevo.marca} onChange={e => setFormNuevo({ ...formNuevo, marca: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Modelo</label><input className="form-input" required value={formNuevo.modelo} onChange={e => setFormNuevo({ ...formNuevo, modelo: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Medida</label><input className="form-input font-mono" required value={formNuevo.medida} onChange={e => setFormNuevo({ ...formNuevo, medida: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Costo de compra (USD)</label><input type="number" step="0.01" min="0" className="form-input" required value={formNuevo.costoCompra} onChange={e => setFormNuevo({ ...formNuevo, costoCompra: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Labrado inicial (mm)</label><input type="number" step="0.1" min="1" className="form-input" required value={formNuevo.profundidadInicialMm} onChange={e => setFormNuevo({ ...formNuevo, profundidadInicialMm: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Presión recomendada (psi)</label><input type="number" min="40" className="form-input" required value={formNuevo.presionRecomendadaPsi} onChange={e => setFormNuevo({ ...formNuevo, presionRecomendadaPsi: e.target.value })} /></div>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-700 mb-3">
                            <input type="checkbox" checked={formNuevo.montar} onChange={e => setFormNuevo({ ...formNuevo, montar: e.target.checked })} />
                            Montar en {vehiculo?.placa ?? 'la unidad seleccionada'}
                        </label>
                        {formNuevo.montar && (
                            <div className="form-group">
                                <label className="form-label">Posición</label>
                                <select className="form-select" required value={formNuevo.posicionActual} onChange={e => setFormNuevo({ ...formNuevo, posicionActual: e.target.value })}>
                                    <option value="">Seleccione una posición libre</option>
                                    {POSICIONES.filter(p => !neumaticos.some(n => n.posicionActual === p)).map(p => <option key={p} value={p}>{nombrePosicion(p)}</option>)}
                                </select>
                            </div>
                        )}
                    </form>
                </Modal>
            )}

            {dialogo === 'inspeccion' && seleccionado && (
                <Modal
                    titulo={`Registrar inspección: ${seleccionado.codigoSerie}`}
                    onCerrar={() => setDialogo(null)}
                    pie={<>
                        <button className="btn btn-secondary" onClick={() => setDialogo(null)}>Cancelar</button>
                        <button form="form-inspeccion" type="submit" className="btn btn-primary" disabled={guardando}>Guardar inspección</button>
                    </>}
                >
                    <form
                        id="form-inspeccion"
                        onSubmit={e => {
                            e.preventDefault();
                            ejecutar(() => neumaticoService.registrarInspeccion(seleccionado.id, {
                                profundidadMm: Number(formInspeccion.profundidadMm),
                                presionPsi: Number(formInspeccion.presionPsi),
                                kilometrajeVehiculo: formInspeccion.kilometrajeVehiculo ? Number(formInspeccion.kilometrajeVehiculo) : undefined,
                                desgasteIrregular: formInspeccion.desgasteIrregular,
                                observaciones: formInspeccion.observaciones || undefined,
                            }), 'Inspección registrada');
                        }}
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group"><label className="form-label">Labrado medido (mm)</label><input type="number" step="0.1" min="0" className="form-input" required value={formInspeccion.profundidadMm} onChange={e => setFormInspeccion({ ...formInspeccion, profundidadMm: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Presión (psi)</label><input type="number" min="0" className="form-input" required value={formInspeccion.presionPsi} onChange={e => setFormInspeccion({ ...formInspeccion, presionPsi: e.target.value })} /></div>
                        </div>
                        <div className="form-group"><label className="form-label">Kilometraje del vehículo (opcional)</label><input type="number" min="0" className="form-input" value={formInspeccion.kilometrajeVehiculo} onChange={e => setFormInspeccion({ ...formInspeccion, kilometrajeVehiculo: e.target.value })} /></div>
                        <label className="flex items-center gap-2 text-sm text-slate-700 mb-4">
                            <input type="checkbox" checked={formInspeccion.desgasteIrregular} onChange={e => setFormInspeccion({ ...formInspeccion, desgasteIrregular: e.target.checked })} />
                            Se observa desgaste irregular
                        </label>
                        <div className="form-group"><label className="form-label">Observaciones</label><textarea className="form-input" rows={2} value={formInspeccion.observaciones} onChange={e => setFormInspeccion({ ...formInspeccion, observaciones: e.target.value })} /></div>
                    </form>
                </Modal>
            )}

            {dialogo === 'reencauche' && seleccionado && (
                <Modal
                    titulo={`Registrar reencauche: ${seleccionado.codigoSerie}`}
                    onCerrar={() => setDialogo(null)}
                    pie={<>
                        <button className="btn btn-secondary" onClick={() => setDialogo(null)}>Cancelar</button>
                        <button form="form-reencauche" type="submit" className="btn btn-primary" disabled={guardando}>Registrar reencauche</button>
                    </>}
                >
                    <form
                        id="form-reencauche"
                        onSubmit={e => {
                            e.preventDefault();
                            ejecutar(() => neumaticoService.reencauchar(seleccionado.id, {
                                costo: Number(formReencauche.costo),
                                profundidadMm: Number(formReencauche.profundidadMm),
                                observaciones: formReencauche.observaciones || undefined,
                            }), 'Reencauche registrado');
                        }}
                    >
                        <p className="text-sm text-slate-600 mb-4">El reencauche renueva la banda de rodamiento y suma su costo a la inversión del neumático, por lo que el costo por kilómetro se recalcula.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group"><label className="form-label">Costo (USD)</label><input type="number" step="0.01" min="0" className="form-input" required value={formReencauche.costo} onChange={e => setFormReencauche({ ...formReencauche, costo: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Nuevo labrado (mm)</label><input type="number" step="0.1" min="1" className="form-input" required value={formReencauche.profundidadMm} onChange={e => setFormReencauche({ ...formReencauche, profundidadMm: e.target.value })} /></div>
                        </div>
                        <div className="form-group"><label className="form-label">Observaciones</label><textarea className="form-input" rows={2} value={formReencauche.observaciones} onChange={e => setFormReencauche({ ...formReencauche, observaciones: e.target.value })} /></div>
                    </form>
                </Modal>
            )}

            {dialogo === 'reubicar' && seleccionado && (
                <Modal
                    titulo={`Reubicar neumático: ${seleccionado.codigoSerie}`}
                    onCerrar={() => setDialogo(null)}
                    pie={<>
                        <button className="btn btn-secondary" onClick={() => setDialogo(null)}>Cancelar</button>
                        <button form="form-reubicar" type="submit" className="btn btn-primary" disabled={guardando}>Aplicar</button>
                    </>}
                >
                    <form
                        id="form-reubicar"
                        onSubmit={e => {
                            e.preventDefault();
                            const aBodega = !formReubicar.vehiculoId;
                            ejecutar(() => neumaticoService.reubicar(seleccionado.id, {
                                vehiculoId: aBodega ? null : Number(formReubicar.vehiculoId),
                                posicionActual: aBodega ? null : formReubicar.posicionActual,
                            }), aBodega ? 'Neumático enviado a bodega' : 'Posición actualizada');
                        }}
                    >
                        <div className="form-group">
                            <label className="form-label">Destino</label>
                            <select className="form-select" value={formReubicar.vehiculoId} onChange={e => setFormReubicar({ ...formReubicar, vehiculoId: e.target.value })}>
                                <option value="">Bodega (desmontar)</option>
                                {vehiculos.map(v => <option key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo}</option>)}
                            </select>
                        </div>
                        {formReubicar.vehiculoId && (
                            <div className="form-group">
                                <label className="form-label">Posición</label>
                                <select className="form-select" value={formReubicar.posicionActual} onChange={e => setFormReubicar({ ...formReubicar, posicionActual: e.target.value })}>
                                    {POSICIONES.map(p => <option key={p} value={p}>{nombrePosicion(p)}</option>)}
                                </select>
                                <p className="form-hint">Si la posición está ocupada, ambos neumáticos intercambian lugar (rotación entre ejes).</p>
                            </div>
                        )}
                    </form>
                </Modal>
            )}

            <ConfirmModal
                isOpen={dialogo === 'baja'}
                onClose={() => setDialogo(null)}
                onConfirm={() => seleccionado && ejecutar(() => neumaticoService.actualizar(seleccionado.id, { estado: 'DESECHO' }), 'Neumático dado de baja')}
                title="Dar de baja el neumático"
                message={`El neumático ${seleccionado?.codigoSerie ?? ''} se retirará de su posición y quedará fuera de servicio. Esta acción queda registrada en la auditoría.`}
                confirmText="Dar de baja"
                type="danger"
            />
        </div>
    );
}

function TablaNeumaticos({ lista, seleccionadoId, onSeleccionar, vacio, mostrarPosicion }: {
    lista: NeumaticoDetalle[];
    seleccionadoId: number | null;
    onSeleccionar: (id: number) => void;
    vacio: string;
    mostrarPosicion?: boolean;
}) {
    if (lista.length === 0) return <EstadoVacio titulo={vacio} />;
    return (
        <div className="overflow-x-auto">
            <table className="table">
                <thead>
                    <tr>
                        {mostrarPosicion && <th>Posición</th>}
                        <th>Serie</th>
                        <th>Marca y modelo</th>
                        <th className="text-right">Labrado</th>
                        <th className="text-right">Presión</th>
                        <th className="text-right">Recorrido</th>
                        <th className="text-right">Costo por km</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {lista.map(n => (
                        <tr
                            key={n.id}
                            onClick={() => onSeleccionar(n.id)}
                            className={`cursor-pointer ${n.id === seleccionadoId ? 'bg-indigo-50' : ''}`}
                        >
                            {mostrarPosicion && <td className="font-mono text-xs">{n.posicionActual ?? '—'}</td>}
                            <td className="font-mono text-xs">{n.codigoSerie}</td>
                            <td>{n.marca} {n.modelo}</td>
                            <td className="num">{n.profundidadActualMm.toFixed(1)} mm</td>
                            <td className="num">{n.presionActualPsi ?? '—'} psi</td>
                            <td className="num">{numero(n.kilometrosRecorridos)} km</td>
                            <td className="num">{opcional(n.costoPorKm, v => moneda(v, 4))}</td>
                            <td><BadgeSalud salud={n.salud} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
