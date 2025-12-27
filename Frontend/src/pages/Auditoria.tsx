import { useState, useEffect } from 'react';
import axios from '../services/api';
import { toast } from 'react-hot-toast';
import { Clock, Shield, X, FileText } from 'lucide-react';

const Auditoria = () => {
    const [registros, setRegistros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({ entidad: '', accion: '' });
    const [modalOpen, setModalOpen] = useState(false);
    const [seleccionado, setSeleccionado] = useState<any>(null);

    useEffect(() => { cargarAuditoria(); }, [filtros]);

    const cargarAuditoria = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filtros.entidad) params.append('entidad', filtros.entidad);
            if (filtros.accion) params.append('accion', filtros.accion);
            const { data } = await axios.get(`/auditoria?${params.toString()}`);
            setRegistros(data.registros);
        } catch { toast.error('Error al cargar auditoría'); }
        finally { setLoading(false); }
    };

    const verDetalle = (registro: any) => {
        setSeleccionado(registro);
        setModalOpen(true);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2 className="page-title">Registro de Auditoría</h2>
                    <p className="page-subtitle">Historial completo de acciones realizadas en el sistema.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex gap-4">
                <select className="form-select text-sm" value={filtros.entidad} onChange={e => setFiltros({ ...filtros, entidad: e.target.value })}>
                    <option value="">Todas las Entidades</option>
                    <option value="Vehiculo">Vehículos</option>
                    <option value="Chofer">Choferes</option>
                    <option value="Cliente">Clientes</option>
                    <option value="Material">Materiales</option>
                    <option value="Viaje">Viajes</option>
                    <option value="GastoViaje">Gastos de Viaje</option>
                    <option value="Comprobante">Comprobantes</option>
                </select>
                <select className="form-select text-sm" value={filtros.accion} onChange={e => setFiltros({ ...filtros, accion: e.target.value })}>
                    <option value="">Todas las Acciones</option>
                    <option value="CREAR">Creación</option>
                    <option value="EDITAR">Edición</option>
                    <option value="ELIMINAR">Eliminación</option>
                </select>
            </div>

            <div className="table-container">
                {loading ? <div className="p-12 flex justify-center"><div className="spinner"></div></div> : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Fecha / Hora</th>
                                <th>Usuario</th>
                                <th>Acción</th>
                                <th>Entidad</th>
                                <th className="text-right">Detalle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registros.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-12 text-slate-500">No hay registros de auditoría</td></tr>
                            ) : (
                                registros.map((r: any) => (
                                    <tr key={r.id}>
                                        <td>
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Clock className="h-3 w-3" />
                                                <span className="font-mono text-xs">{new Date(r.fechaHora).toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="font-medium text-slate-800">{r.usuario?.nombreCompleto || 'Sistema'}</span>
                                        </td>
                                        <td>
                                            <span className={`badge ${r.accion === 'CREAR' ? 'badge-success' :
                                                r.accion === 'EDITAR' ? 'badge-info' : 'badge-danger'
                                                }`}>{r.accion}</span>
                                        </td>
                                        <td>
                                            <span className="badge badge-neutral">{r.entidad} #{r.entidadId}</span>
                                        </td>
                                        <td className="text-right">
                                            <button onClick={() => verDetalle(r)} className="btn-ghost p-1.5 rounded-lg" title="Ver cambios">
                                                <FileText className="h-4 w-4 text-slate-400 hover:text-indigo-600" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {modalOpen && seleccionado && (
                <div className="modal-overlay">
                    <div className="modal-content max-w-3xl">
                        <div className="modal-header">
                            <h3 className="modal-title flex items-center gap-2">
                                <Shield className="h-5 w-5 text-indigo-600" /> Detalle de Auditoría
                            </h3>
                            <button onClick={() => setModalOpen(false)}><X className="text-slate-400 hover:text-rose-500" /></button>
                        </div>
                        <div className="modal-body grid grid-cols-2 gap-6 bg-slate-50/50">
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 border-b border-slate-200 pb-2">Datos Anteriores</h4>
                                {seleccionado.datosAnteriores ? (
                                    <pre className="text-xs bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-100 overflow-auto max-h-80 font-mono">
                                        {JSON.stringify(seleccionado.datosAnteriores, null, 2)}
                                    </pre>
                                ) : <p className="text-sm text-slate-400 italic">No hay datos previos (Creación)</p>}
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 border-b border-slate-200 pb-2">Datos Nuevos</h4>
                                {seleccionado.datosNuevos ? (
                                    <pre className="text-xs bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 overflow-auto max-h-80 font-mono">
                                        {JSON.stringify(seleccionado.datosNuevos, null, 2)}
                                    </pre>
                                ) : <p className="text-sm text-slate-400 italic">No hay datos nuevos (Eliminación)</p>}
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-white border-t border-slate-100 text-xs text-slate-400 flex justify-between">
                            <span>IP: {seleccionado.ipAddress || 'Desconocida'}</span>
                            <span>ID Registro: {seleccionado.id}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Auditoria;
