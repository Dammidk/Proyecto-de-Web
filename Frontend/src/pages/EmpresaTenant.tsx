// Perfil de la organización y límites de su plan
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { empresaService, mensajeError } from '../services/api';
import { PageHeader, Kpi, Panel, Cargando, Campo } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { numero, fecha } from '../utils/formato';

const ETIQUETA_PLAN: Record<string, string> = { STARTER: 'Starter', PRO: 'Profesional', ENTERPRISE: 'Enterprise' };

export default function EmpresaTenant() {
    const { isAdmin } = useAuth();
    const [empresa, setEmpresa] = useState<any>(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [form, setForm] = useState({ nombre: '', ruc: '', email: '', telefono: '', direccion: '', plan: 'PRO', limiteVehiculos: '20' });

    const aplicar = (e: any) => {
        setEmpresa(e);
        setForm({
            nombre: e.nombre || '', ruc: e.ruc || '', email: e.email || '', telefono: e.telefono || '',
            direccion: e.direccion || '', plan: e.plan, limiteVehiculos: String(e.limiteVehiculos),
        });
    };

    useEffect(() => {
        empresaService.obtenerActual()
            .then(r => aplicar(r.datos))
            .catch(e => toast.error(mensajeError(e, 'No se pudo cargar la organización')))
            .finally(() => setCargando(false));
    }, []);

    const guardar = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setGuardando(true);
        try {
            await empresaService.actualizarActual({ ...form, limiteVehiculos: Number(form.limiteVehiculos) });
            const r = await empresaService.obtenerActual();
            aplicar(r.datos);
            toast.success('Perfil actualizado');
        } catch (e) {
            toast.error(mensajeError(e));
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) return <Cargando />;
    if (!empresa) return <div className="panel p-8 text-center text-sm text-slate-600">No hay una organización configurada en esta instalación.</div>;

    const uso = empresa.uso;
    const tonoUso = uso.porcentaje >= 90 ? 'danger' : uso.porcentaje >= 75 ? 'warning' : 'success';

    return (
        <div className="space-y-6">
            <PageHeader
                kicker="Administración"
                titulo="Organización y plan"
                descripcion="Datos corporativos de la empresa operadora y límites del plan contratado. Esta instalación opera para una única organización."
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi etiqueta="Plan" valor={ETIQUETA_PLAN[empresa.plan]} tono="primary" />
                <Kpi etiqueta="Vehículos registrados" valor={`${uso.vehiculos} / ${uso.limiteVehiculos}`} tono={tonoUso} nota={`${uso.porcentaje} % del cupo utilizado`} />
                <Kpi etiqueta="Usuarios" valor={numero(empresa._count.usuarios)} />
                <Kpi etiqueta="Clientes" valor={numero(empresa._count.clientes)} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    <Panel titulo="Datos de la organización">
                        <form onSubmit={guardar}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                <div className="form-group md:col-span-2">
                                    <label className="form-label">Razón social</label>
                                    <input className="form-input" required disabled={!isAdmin} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">RUC</label>
                                    <input className="form-input font-mono" required pattern="\d{13}" title="13 dígitos" disabled={!isAdmin} value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Correo corporativo</label>
                                    <input type="email" className="form-input" disabled={!isAdmin} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Teléfono</label>
                                    <input className="form-input" disabled={!isAdmin} value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Plan</label>
                                    <select className="form-select" disabled={!isAdmin} value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>
                                        {Object.entries(ETIQUETA_PLAN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div className="form-group md:col-span-2">
                                    <label className="form-label">Dirección</label>
                                    <input className="form-input" disabled={!isAdmin} value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Límite de vehículos</label>
                                    <input type="number" min={uso.vehiculos || 1} className="form-input" required disabled={!isAdmin} value={form.limiteVehiculos} onChange={e => setForm({ ...form, limiteVehiculos: e.target.value })} />
                                    <p className="form-hint">No puede ser menor a la flota registrada ({uso.vehiculos}).</p>
                                </div>
                            </div>
                            {isAdmin && (
                                <div className="pt-4 mt-2 border-t border-slate-200 flex justify-end">
                                    <button id="empresa-guardar" type="submit" className="btn btn-primary" disabled={guardando}><Save /> Guardar cambios</button>
                                </div>
                            )}
                        </form>
                    </Panel>
                </div>

                <Panel titulo="Uso del plan">
                    <div className="mb-5">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>Cupo de vehículos</span>
                            <span className="font-mono">{uso.vehiculos} de {uso.limiteVehiculos}</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-sm overflow-hidden">
                            <div className={`h-full ${uso.porcentaje >= 90 ? 'bg-rose-600' : uso.porcentaje >= 75 ? 'bg-amber-500' : 'bg-indigo-700'}`} style={{ width: `${uso.porcentaje}%` }} />
                        </div>
                    </div>
                    <dl className="dl">
                        <Campo etiqueta="Estado">{empresa.activo ? 'Activa' : 'Inactiva'}</Campo>
                        <Campo etiqueta="Alta">{fecha(empresa.creadoEn)}</Campo>
                        <Campo etiqueta="Actualizada">{fecha(empresa.actualizadoEn)}</Campo>
                    </dl>
                    <p className="mt-5 text-xs text-slate-500 leading-relaxed">
                        El sistema rechaza el registro de nuevos vehículos cuando se alcanza el límite del plan.
                        Todo cambio en estos datos queda registrado en la auditoría.
                    </p>
                </Panel>
            </div>
        </div>
    );
}
