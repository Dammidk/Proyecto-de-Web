import { useState, useEffect } from 'react';
import axios from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import {
    Plus, Search, Edit2, Trash2, X, BriefcaseBusiness, MapPin
} from 'lucide-react';

const Clientes = () => {
    const { usuario } = useAuth();
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({ busqueda: '', estado: '' });
    const [modalOpen, setModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [clienteToDelete, setClienteToDelete] = useState<number | null>(null);

    const formInicial = {
        nombreRazonSocial: '', documentoId: '',
        telefono: '', correo: '', direccion: '', sector: '', estado: 'ACTIVO'
    };
    const [formData, setFormData] = useState(formInicial);

    useEffect(() => { cargarClientes(); }, [filtros]);

    const cargarClientes = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
            const { data } = await axios.get(`/clientes?${params.toString()}`);
            setClientes(data.clientes);
        } catch { toast.error('Error al cargar clientes'); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modoEdicion && clienteSeleccionado) {
                await axios.put(`/clientes/${clienteSeleccionado.id}`, formData);
                toast.success('Cliente actualizado');
            } else {
                await axios.post('/clientes', formData);
                toast.success('Cliente creado');
            }
            setModalOpen(false);
            cargarClientes();
        } catch (error: any) { toast.error(error.response?.data?.error || 'Error al guardar'); }
    };

    const confirmarEliminacion = (id: number) => {
        setClienteToDelete(id);
        setShowDeleteModal(true);
    };

    const eliminarCliente = async () => {
        if (!clienteToDelete) return;
        try {
            await axios.delete(`/clientes/${clienteToDelete}`);
            toast.success('Cliente eliminado');
            cargarClientes();
        } catch { toast.error('Error al eliminar'); }
        finally { setClienteToDelete(null); }
    };

    const abrirModal = (cliente?: any) => {
        if (cliente) {
            setModoEdicion(true);
            setClienteSeleccionado(cliente);
            setFormData(cliente);
        } else {
            setModoEdicion(false);
            setClienteSeleccionado(null);
            setFormData(formInicial);
        }
        setModalOpen(true);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2 className="page-title">Cartera de Clientes</h2>
                    <p className="page-subtitle">Gestiona información de tus clientes y puntos de llegada.</p>
                </div>
                {usuario?.rol === 'ADMIN' && (
                    <button onClick={() => abrirModal()} className="btn btn-primary"><Plus /> Nuevo Cliente</button>
                )}
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o RUC..."
                        className="pl-10 pr-4 py-2 w-full rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                        value={filtros.busqueda}
                        onChange={e => setFiltros({ ...filtros, busqueda: e.target.value })}
                    />
                </div>
            </div>

            <div className="table-container">
                {loading ? <div className="p-12 flex justify-center"><div className="spinner"></div></div> : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Cliente / Razón Social</th>
                                <th>Documento</th>
                                <th>Ubicación</th>
                                <th>Estado</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientes.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-12 text-slate-500">No hay clientes registrados</td></tr>
                            ) : (
                                clientes.map((c: any) => (
                                    <tr key={c.id} className="group">
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-indigo-50 p-2 rounded-lg"><BriefcaseBusiness className="h-4 w-4 text-indigo-600" /></div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{c.nombreRazonSocial}</p>
                                                    <p className="text-xs text-slate-500">{c.sector || 'Sector no especificado'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="font-mono text-xs">{c.documentoId}</td>
                                        <td>
                                            {c.direccion ? (
                                                <div className="flex items-start gap-1 text-xs text-slate-600 max-w-[200px] truncate">
                                                    <MapPin className="h-3 w-3 mt-0.5 text-slate-400" /> {c.direccion}
                                                </div>
                                            ) : <span className="text-xs text-slate-400">--</span>}
                                        </td>
                                        <td>
                                            <span className={`badge ${c.estado === 'ACTIVO' ? 'badge-success' : 'badge-neutral'}`}>{c.estado}</span>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {usuario?.rol === 'ADMIN' && (
                                                    <>
                                                        <button onClick={() => abrirModal(c)} className="btn-ghost p-2 rounded-lg"><Edit2 className="text-slate-400 hover:text-amber-600" /></button>
                                                        <button onClick={() => confirmarEliminacion(c.id)} className="btn-ghost p-2 rounded-lg"><Trash2 className="text-slate-400 hover:text-rose-600" /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 className="modal-title">{modoEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                            <button onClick={() => setModalOpen(false)}><X className="text-slate-400 hover:text-rose-500" /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body grid grid-cols-1 gap-4">
                                <div><label className="form-label">Nombre / Razón Social</label><input required className="form-input" value={formData.nombreRazonSocial} onChange={e => setFormData({ ...formData, nombreRazonSocial: e.target.value })} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="form-label">Documento ID</label><input required className="form-input" value={formData.documentoId} onChange={e => setFormData({ ...formData, documentoId: e.target.value })} /></div>
                                    <div><label className="form-label">Teléfono</label><input className="form-input" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} /></div>
                                </div>
                                <div><label className="form-label">Dirección</label><input className="form-input" value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="form-label">Sector</label><input className="form-input" value={formData.sector} onChange={e => setFormData({ ...formData, sector: e.target.value })} /></div>
                                    <div>
                                        <label className="form-label">Estado</label>
                                        <select className="form-select" value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })}>
                                            <option value="ACTIVO">Activo</option>
                                            <option value="INACTIVO">Inactivo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancelar</button>
                                <button type="submit" className="btn btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de confirmación */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={eliminarCliente}
                title="Eliminar Cliente"
                message="¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

export default Clientes;
