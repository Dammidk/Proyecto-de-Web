import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Eye,
    X,
    User,
    Phone,
    CreditCard,
    Truck
} from 'lucide-react';

const Choferes = () => {
    const { usuario } = useAuth();
    const [choferes, setChoferes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({ busqueda: '', estado: '' });
    const [modalOpen, setModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [choferSeleccionado, setChoferSeleccionado] = useState<any>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [choferToDelete, setChoferToDelete] = useState<number | null>(null);
    const navigate = useNavigate();

    const formInicial = {
        nombres: '', apellidos: '', documentoId: '',
        telefono: '', correo: '', estado: 'ACTIVO',
        modalidadPago: 'POR_VIAJE', metodoPago: 'EFECTIVO',
        banco: '', numeroCuenta: '', sueldoMensual: 0
    };
    const [formData, setFormData] = useState(formInicial);

    useEffect(() => { cargarChoferes(); }, [filtros]);

    const cargarChoferes = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
            if (filtros.estado) params.append('estado', filtros.estado);
            const { data } = await axios.get(`/choferes?${params.toString()}`);
            setChoferes(data.choferes);
        } catch (error) { toast.error('Error al cargar choferes'); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modoEdicion && choferSeleccionado) {
                await axios.put(`/choferes/${choferSeleccionado.id}`, formData);
                toast.success('Chofer actualizado');
            } else {
                await axios.post('/choferes', formData);
                toast.success('Chofer creado');
            }
            setModalOpen(false);
            cargarChoferes();
        } catch (error: any) { toast.error(error.response?.data?.error || 'Error al guardar'); }
    };

    const confirmarEliminacion = (id: number) => {
        setChoferToDelete(id);
        setShowDeleteModal(true);
    };

    const eliminarChofer = async () => {
        if (!choferToDelete) return;
        try {
            await axios.delete(`/choferes/${choferToDelete}`);
            toast.success('Chofer eliminado');
            cargarChoferes();
        } catch (error) { toast.error('Error al eliminar'); }
        finally { setChoferToDelete(null); }
    };

    const abrirModal = (chofer?: any) => {
        if (chofer) {
            setModoEdicion(true);
            setChoferSeleccionado(chofer);
            setFormData(chofer);
        } else {
            setModoEdicion(false);
            setChoferSeleccionado(null);
            setFormData(formInicial);
        }
        setModalOpen(true);
    };

    return (
        <div>

            {/* Header & Actions Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="page-title">Gestión de Choferes</h2>
                    <p className="page-subtitle">Administra tu equipo de conductores y sus pagos.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-center w-full md:w-auto">
                    {/* Integrated Search Toolbar */}
                    <div className="table-toolbar w-full md:w-auto">
                        <div className="search-input-compact">
                            <Search />
                            <input
                                type="text"
                                placeholder="Nombre o documento..."
                                value={filtros.busqueda}
                                onChange={e => setFiltros({ ...filtros, busqueda: e.target.value })}
                            />
                        </div>
                        <select
                            className="pl-3 pr-8 py-2 rounded-lg border border-slate-200 outline-none text-sm bg-slate-50 focus:bg-white hover:border-slate-300 transition-all cursor-pointer"
                            value={filtros.estado}
                            onChange={e => setFiltros({ ...filtros, estado: e.target.value })}
                        >
                            <option value="">Estado: Todos</option>
                            <option value="ACTIVO">Activo</option>
                            <option value="INACTIVO">Inactivo</option>
                        </select>
                    </div>

                    {usuario?.rol === 'ADMIN' && (
                        <button onClick={() => abrirModal()} className="btn btn-primary whitespace-nowrap">
                            <Plus className="h-4 w-4 mr-2" /> Nuevo Chofer
                        </button>
                    )}
                </div>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="p-12 flex justify-center"><div className="spinner"></div></div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Chofer</th>
                                <th>Documento</th>
                                <th>Contacto</th>
                                <th>Pago</th>
                                <th>Estado</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {choferes.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-slate-500">No hay choferes registrados</td></tr>
                            ) : (
                                choferes.map((c: any) => (
                                    <tr key={c.id} className="group">
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-100 p-2 rounded-full"><User className="h-4 w-4 text-slate-500" /></div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{c.nombres} {c.apellidos}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="font-mono text-xs">{c.documentoId}</td>
                                        <td>
                                            <div className="flex flex-col text-xs text-slate-500">
                                                {c.telefono && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.telefono}</span>}
                                                {c.correo && <span>{c.correo}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="badge badge-neutral text-[10px] mb-1 w-fit">{c.modalidadPago.replace('_', ' ')}</span>
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <CreditCard className="h-3 w-3" /> {c.metodoPago}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${c.estado === 'ACTIVO' ? 'badge-success' : 'badge-neutral'}`}>
                                                {c.estado}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => navigate(`/viajes?choferId=${c.id}`)} className="btn-ghost p-2 rounded-lg" title="Ver Viajes">
                                                    <Truck className="h-4 w-4 text-slate-400 hover:text-indigo-600" />
                                                </button>
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

            {
                modalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3 className="modal-title">{modoEdicion ? 'Editar Chofer' : 'Nuevo Chofer'}</h3>
                                <button onClick={() => setModalOpen(false)}><X className="text-slate-400 hover:text-rose-500" /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="form-label">Nombres</label><input required className="form-input" value={formData.nombres} onChange={e => setFormData({ ...formData, nombres: e.target.value })} /></div>
                                    <div><label className="form-label">Apellidos</label><input required className="form-input" value={formData.apellidos} onChange={e => setFormData({ ...formData, apellidos: e.target.value })} /></div>
                                    <div><label className="form-label">Documento ID</label><input required className="form-input" value={formData.documentoId} onChange={e => setFormData({ ...formData, documentoId: e.target.value })} /></div>
                                    <div><label className="form-label">Teléfono</label><input className="form-input" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} /></div>
                                    <div><label className="form-label">Correo (Opcional)</label><input type="email" className="form-input" value={formData.correo} onChange={e => setFormData({ ...formData, correo: e.target.value })} /></div>
                                    <div>
                                        <label className="form-label">Estado</label>
                                        <select className="form-select" value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })}>
                                            <option value="ACTIVO">Activo</option>
                                            <option value="INACTIVO">Inactivo</option>
                                        </select>
                                    </div>

                                    <div className="col-span-2 border-t border-slate-100 pt-2"><h4 className="text-sm font-semibold text-slate-700">Información de Pago</h4></div>

                                    <div>
                                        <label className="form-label">Modalidad</label>
                                        <select className="form-select" value={formData.modalidadPago} onChange={e => setFormData({ ...formData, modalidadPago: e.target.value })}>
                                            <option value="POR_VIAJE">Por Viaje</option>
                                            <option value="MENSUAL">Mensual</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Método</label>
                                        <select className="form-select" value={formData.metodoPago} onChange={e => setFormData({ ...formData, metodoPago: e.target.value })}>
                                            <option value="EFECTIVO">Efectivo</option>
                                            <option value="TRANSFERENCIA">Transferencia</option>
                                        </select>
                                    </div>

                                    {formData.metodoPago === 'TRANSFERENCIA' && (
                                        <>
                                            <div><label className="form-label">Banco</label><input className="form-input" value={formData.banco} onChange={e => setFormData({ ...formData, banco: e.target.value })} /></div>
                                            <div><label className="form-label">N° Cuenta</label><input className="form-input" value={formData.numeroCuenta} onChange={e => setFormData({ ...formData, numeroCuenta: e.target.value })} /></div>
                                        </>
                                    )}

                                    {formData.modalidadPago === 'MENSUAL' && (
                                        <div><label className="form-label">Sueldo Mensual</label><input type="number" className="form-input" value={formData.sueldoMensual} onChange={e => setFormData({ ...formData, sueldoMensual: parseFloat(e.target.value) })} /></div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancelar</button>
                                    <button type="submit" className="btn btn-primary">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Modal de confirmación */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={eliminarChofer}
                title="Eliminar Chofer"
                message="¿Estás seguro de que deseas eliminar este chofer? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div >
    );
};

export default Choferes;
