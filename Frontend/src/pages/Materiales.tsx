import { useState, useEffect } from 'react';
import axios from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import {
    Plus, Search, Edit2, Trash2, X, Package, AlertTriangle
} from 'lucide-react';

const Materiales = () => {
    const { usuario } = useAuth();
    const [materiales, setMateriales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [seleccionado, setSeleccionado] = useState<any>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [materialToDelete, setMaterialToDelete] = useState<number | null>(null);

    const formInicial = { nombre: '', unidadMedida: '', esPeligroso: false, descripcion: '' };
    const [formData, setFormData] = useState(formInicial);

    useEffect(() => { cargarMateriales(); }, [busqueda]);

    const cargarMateriales = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (busqueda) params.append('busqueda', busqueda);
            const { data } = await axios.get(`/materiales?${params.toString()}`);
            setMateriales(data.materiales);
        } catch { toast.error('Error al cargar materiales'); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modoEdicion && seleccionado) {
                await axios.put(`/materiales/${seleccionado.id}`, formData);
                toast.success('Material actualizado');
            } else {
                await axios.post('/materiales', formData);
                toast.success('Material creado');
            }
            setModalOpen(false);
            cargarMateriales();
        } catch (error: any) { toast.error(error.response?.data?.error || 'Error'); }
    };

    const confirmarEliminacion = (id: number) => {
        setMaterialToDelete(id);
        setShowDeleteModal(true);
    };

    const eliminar = async () => {
        if (!materialToDelete) return;
        try {
            await axios.delete(`/materiales/${materialToDelete}`);
            toast.success('Eliminado');
            cargarMateriales();
        } catch { toast.error('Error al eliminar'); }
        finally { setMaterialToDelete(null); }
    };

    const abrirModal = (item?: any) => {
        if (item) {
            setModoEdicion(true);
            setSeleccionado(item);
            setFormData(item);
        } else {
            setModoEdicion(false);
            setSeleccionado(null);
            setFormData(formInicial);
        }
        setModalOpen(true);
    };

    return (
        <div>
            {/* Header & Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="page-title">Catálogo de Materiales</h2>
                    <p className="page-subtitle">Define los tipos de carga y sus características.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-center w-full md:w-auto">
                    <div className="table-toolbar w-full md:w-auto mb-0">
                        <div className="search-input-compact">
                            <Search />
                            <input
                                type="text"
                                placeholder="Buscar material..."
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                            />
                        </div>
                    </div>

                    {usuario?.rol === 'ADMIN' && (
                        <button onClick={() => abrirModal()} className="btn btn-primary whitespace-nowrap">
                            <Plus className="h-4 w-4 mr-2" /> Agregar Material
                        </button>
                    )}
                </div>
            </div>

            <div className="table-container">
                {loading ? <div className="p-12 flex justify-center"><div className="spinner"></div></div> : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Unidad</th>
                                <th>Tipo Carga</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materiales.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-12 text-slate-500">No hay materiales</td></tr>
                            ) : (
                                materiales.map((m: any) => (
                                    <tr key={m.id} className="group">
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-amber-50 p-2 rounded-lg"><Package className="h-4 w-4 text-amber-600" /></div>
                                                <span className="font-semibold text-slate-800">{m.nombre}</span>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-neutral lowercase">{m.unidadMedida}</span></td>
                                        <td>
                                            {m.esPeligroso ? (
                                                <span className="badge badge-danger flex w-fit"><AlertTriangle className="h-3 w-3" /> Peligroso</span>
                                            ) : (
                                                <span className="badge badge-success">Estándar</span>
                                            )}
                                        </td>
                                        <td className="text-right">
                                            {usuario?.rol === 'ADMIN' && (
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => abrirModal(m)} className="btn-ghost p-2 rounded-lg"><Edit2 className="text-slate-400 hover:text-amber-600" /></button>
                                                    <button onClick={() => confirmarEliminacion(m.id)} className="btn-ghost p-2 rounded-lg"><Trash2 className="text-slate-400 hover:text-rose-600" /></button>
                                                </div>
                                            )}
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
                            <h3 className="modal-title">{modoEdicion ? 'Editar Material' : 'Nuevo Material'}</h3>
                            <button onClick={() => setModalOpen(false)}><X className="text-slate-400 hover:text-rose-500" /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body space-y-4">
                                <div><label className="form-label">Nombre del Material</label><input required className="form-input" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} /></div>
                                <div><label className="form-label">Unidad de Medida</label><input required className="form-input" placeholder="Ej. Litros, Kg, Toneladas" value={formData.unidadMedida} onChange={e => setFormData({ ...formData, unidadMedida: e.target.value })} /></div>

                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <input
                                        type="checkbox"
                                        id="peligroso"
                                        className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={formData.esPeligroso}
                                        onChange={e => setFormData({ ...formData, esPeligroso: e.target.checked })}
                                    />
                                    <label htmlFor="peligroso" className="text-sm font-medium text-slate-700 cursor-pointer select-none flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" /> Material Peligroso / Riesgoso
                                    </label>
                                </div>

                                <div><label className="form-label">Descripción (Opcional)</label><textarea className="form-input" rows={2} value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} /></div>
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
                onConfirm={eliminar}
                title="Eliminar Material"
                message="¿Estás seguro de que deseas eliminar este material? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

export default Materiales;
