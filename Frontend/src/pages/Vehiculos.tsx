import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import {
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    Eye,
    X,
    CheckCircle,
    AlertTriangle,
    Calendar,
    Truck
} from 'lucide-react';

const Vehiculos = () => {
    const { usuario } = useAuth();
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({ busqueda: '', estado: '' });
    const [modalOpen, setModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<any>(null);
    const [detalleOpen, setDetalleOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [vehiculoToDelete, setVehiculoToDelete] = useState<number | null>(null);
    const navigate = useNavigate();

    // Formulario inicial
    const formInicial = {
        placa: '', marca: '', modelo: '', anio: new Date().getFullYear(),
        tipo: '', capacidad: '', estado: 'ACTIVO', kilometrajeActual: 0,
        observaciones: '',
        fechaUltimoMantenimiento: '', fechaProximoMantenimiento: '',
        fechaVencimientoSoat: '', fechaVencimientoSeguro: '', fechaVencimientoMatricula: ''
    };
    const [formData, setFormData] = useState(formInicial);

    useEffect(() => {
        cargarVehiculos();
    }, [filtros]);

    const cargarVehiculos = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
            if (filtros.estado) params.append('estado', filtros.estado);

            const { data } = await axios.get(`/vehiculos?${params.toString()}`);
            setVehiculos(data.vehiculos);
        } catch (error) {
            toast.error('Error al cargar vehículos');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modoEdicion && vehiculoSeleccionado) {
                await axios.put(`/vehiculos/${vehiculoSeleccionado.id}`, formData);
                toast.success('Vehículo actualizado');
            } else {
                await axios.post('/vehiculos', formData);
                toast.success('Vehículo creado');
            }
            setModalOpen(false);
            cargarVehiculos();
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Error al guardar';
            toast.error(msg);
        }
    };

    const confirmarEliminacion = (id: number) => {
        setVehiculoToDelete(id);
        setShowDeleteModal(true);
    };

    const eliminarVehiculo = async () => {
        if (!vehiculoToDelete) return;
        try {
            await axios.delete(`/vehiculos/${vehiculoToDelete}`);
            toast.success('Vehículo eliminado');
            cargarVehiculos();
        } catch (error) {
            toast.error('Error al eliminar');
        } finally {
            setVehiculoToDelete(null);
        }
    };

    const abrirModal = (vehiculo?: any) => {
        if (vehiculo) {
            setModoEdicion(true);
            setVehiculoSeleccionado(vehiculo);
            setFormData({
                ...vehiculo,
                fechaUltimoMantenimiento: vehiculo.fechaUltimoMantenimiento?.split('T')[0] || '',
                fechaProximoMantenimiento: vehiculo.fechaProximoMantenimiento?.split('T')[0] || '',
                fechaVencimientoSoat: vehiculo.fechaVencimientoSoat?.split('T')[0] || '',
                fechaVencimientoSeguro: vehiculo.fechaVencimientoSeguro?.split('T')[0] || '',
                fechaVencimientoMatricula: vehiculo.fechaVencimientoMatricula?.split('T')[0] || ''
            });
        } else {
            setModoEdicion(false);
            setVehiculoSeleccionado(null);
            setFormData(formInicial);
        }
        setModalOpen(true);
    };

    const abrirDetalle = (vehiculo: any) => {
        setVehiculoSeleccionado(vehiculo);
        setDetalleOpen(true);
    };

    return (
        <div>

            {/* Header */}
            <div className="page-header">
                <div>
                    <h2 className="page-title">Gestión de Vehículos</h2>
                    <p className="page-subtitle">Administra la flota de transporte de la empresa.</p>
                </div>
                {usuario?.rol === 'ADMIN' && (
                    <button onClick={() => abrirModal()} className="btn btn-primary">
                        <Plus /> Nuevo Vehículo
                    </button>
                )}
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Buscar placa, marca o modelo..."
                        className="pl-10 pr-4 py-2 w-full rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none text-sm"
                        value={filtros.busqueda}
                        onChange={e => setFiltros({ ...filtros, busqueda: e.target.value })}
                    />
                </div>
                <select
                    className="px-4 py-2 rounded-xl border border-slate-200 outline-none text-sm bg-white min-w-[180px]"
                    value={filtros.estado}
                    onChange={e => setFiltros({ ...filtros, estado: e.target.value })}
                >
                    <option value="">Todos los estados</option>
                    <option value="ACTIVO">Activo</option>
                    <option value="EN_RUTA">En Ruta</option>
                    <option value="EN_MANTENIMIENTO">En Mantenimiento</option>
                    <option value="INACTIVO">Inactivo</option>
                </select>
            </div>

            {/* Tabla */}
            <div className="table-container">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="spinner h-8 w-8 border-4 border-t-indigo-600"></div>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Placa</th>
                                <th>Vehículo</th>
                                <th>Tipo/Capacidad</th>
                                <th>Estado</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vehiculos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-slate-500">
                                        No se encontraron vehículos registrados.
                                    </td>
                                </tr>
                            ) : (
                                vehiculos.map((v: any) => (
                                    <tr key={v.id} className="group">
                                        <td className="font-semibold text-slate-800">{v.placa}</td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="text-slate-900 font-medium">{v.marca} {v.modelo}</span>
                                                <span className="text-xs text-slate-400">{v.anio}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="capitalize">{v.tipo}</span>
                                                <span className="text-xs text-slate-400">{v.capacidad}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${v.estado === 'ACTIVO' ? 'badge-success' :
                                                v.estado === 'EN_RUTA' ? 'badge-info' :
                                                    v.estado === 'EN_MANTENIMIENTO' ? 'badge-warning' : 'badge-neutral'
                                                }`}>
                                                {v.estado.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => abrirDetalle(v)} className="btn-ghost p-2 rounded-lg" title="Ver detalles">
                                                    <Eye className="text-slate-400 group-hover:text-indigo-600" />
                                                </button>
                                                {usuario?.rol === 'ADMIN' && (
                                                    <>
                                                        <button onClick={() => abrirModal(v)} className="btn-ghost p-2 rounded-lg" title="Editar">
                                                            <Edit2 className="text-slate-400 group-hover:text-amber-600" />
                                                        </button>
                                                        <button onClick={() => confirmarEliminacion(v.id)} className="btn-ghost p-2 rounded-lg" title="Eliminar">
                                                            <Trash2 className="text-slate-400 group-hover:text-rose-600" />
                                                        </button>
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

            {/* Modal Formulario (Solo Admin) */}
            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 className="modal-title">{modoEdicion ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-rose-500">
                                <X />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Placa</label>
                                    <input required className="form-input uppercase" value={formData.placa} onChange={e => setFormData({ ...formData, placa: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Marca</label>
                                    <input required className="form-input" value={formData.marca} onChange={e => setFormData({ ...formData, marca: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Modelo</label>
                                    <input required className="form-input" value={formData.modelo} onChange={e => setFormData({ ...formData, modelo: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Año</label>
                                    <input required type="number" className="form-input" value={formData.anio} onChange={e => setFormData({ ...formData, anio: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="form-label">Tipo</label>
                                    <input required className="form-input" placeholder="Ej. Camión, Tracto" value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Capacidad</label>
                                    <input required className="form-input" placeholder="Ej. 30 Toneladas" value={formData.capacidad} onChange={e => setFormData({ ...formData, capacidad: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Estado</label>
                                    <select className="form-select" value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })}>
                                        <option value="ACTIVO">Activo</option>
                                        <option value="EN_RUTA">En Ruta</option>
                                        <option value="EN_MANTENIMIENTO">En Mantenimiento</option>
                                        <option value="INACTIVO">Inactivo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Kilometraje Actual</label>
                                    <input type="number" className="form-input" value={formData.kilometrajeActual} onChange={e => setFormData({ ...formData, kilometrajeActual: parseInt(e.target.value) || 0 })} />
                                </div>

                                <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                                    <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" /> Vencimientos y Mantenimiento
                                    </h4>
                                </div>

                                <div>
                                    <label className="form-label">Venc. SOAT</label>
                                    <input type="date" className="form-input text-sm" value={formData.fechaVencimientoSoat} onChange={e => setFormData({ ...formData, fechaVencimientoSoat: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Venc. Seguro</label>
                                    <input type="date" className="form-input text-sm" value={formData.fechaVencimientoSeguro} onChange={e => setFormData({ ...formData, fechaVencimientoSeguro: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Venc. Matrícula</label>
                                    <input type="date" className="form-input text-sm" value={formData.fechaVencimientoMatricula} onChange={e => setFormData({ ...formData, fechaVencimientoMatricula: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Próximo Mantenimiento</label>
                                    <input type="date" className="form-input text-sm" value={formData.fechaProximoMantenimiento} onChange={e => setFormData({ ...formData, fechaProximoMantenimiento: e.target.value })} />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="form-label">Observaciones</label>
                                    <textarea className="form-input" rows={2} value={formData.observaciones} onChange={e => setFormData({ ...formData, observaciones: e.target.value })} placeholder="Notas adicionales..." />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancelar</button>
                                <button type="submit" className="btn btn-primary">{modoEdicion ? 'Guardar Cambios' : 'Crear Vehículo'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Detalle */}
            {detalleOpen && vehiculoSeleccionado && (
                <div className="modal-overlay">
                    <div className="modal-content max-w-2xl">
                        <div className="modal-header">
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-100 p-2 rounded-lg">
                                    <Truck className="h-6 w-6 text-slate-600" />
                                </div>
                                <div>
                                    <h3 className="modal-title font-bold text-xl">{vehiculoSeleccionado.placa}</h3>
                                    <p className="text-sm text-slate-500">{vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo} ({vehiculoSeleccionado.anio})</p>
                                </div>
                            </div>
                            <button onClick={() => setDetalleOpen(false)} className="text-slate-400 hover:text-rose-500"><X /></button>
                        </div>
                        <div className="modal-body space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-xs uppercase text-slate-400 font-semibold mb-2">Información General</h4>
                                    <ul className="space-y-2 text-sm text-slate-700">
                                        <li className="flex justify-between border-b border-slate-50 pb-1">
                                            <span>Tipo:</span> <span className="font-medium">{vehiculoSeleccionado.tipo}</span>
                                        </li>
                                        <li className="flex justify-between border-b border-slate-50 pb-1">
                                            <span>Capacidad:</span> <span className="font-medium">{vehiculoSeleccionado.capacidad}</span>
                                        </li>
                                        <li className="flex justify-between border-b border-slate-50 pb-1">
                                            <span>Km Actual:</span> <span className="font-medium">{vehiculoSeleccionado.kilometrajeActual} km</span>
                                        </li>
                                        <li className="flex justify-between pt-1">
                                            <span>Estado:</span>
                                            <span className={`badge ${vehiculoSeleccionado.estado === 'ACTIVO' ? 'badge-success' : 'badge-neutral'
                                                }`}>{vehiculoSeleccionado.estado}</span>
                                        </li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase text-slate-400 font-semibold mb-2">Documentación</h4>
                                    <ul className="space-y-2 text-sm text-slate-700">
                                        <li className="flex justify-between border-b border-slate-50 pb-1">
                                            <span>SOAT:</span>
                                            <span className={!vehiculoSeleccionado.fechaVencimientoSoat ? 'text-slate-400' : ''}>
                                                {vehiculoSeleccionado.fechaVencimientoSoat ? new Date(vehiculoSeleccionado.fechaVencimientoSoat).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </li>
                                        <li className="flex justify-between border-b border-slate-50 pb-1">
                                            <span>Seguro:</span>
                                            <span className={!vehiculoSeleccionado.fechaVencimientoSeguro ? 'text-slate-400' : ''}>
                                                {vehiculoSeleccionado.fechaVencimientoSeguro ? new Date(vehiculoSeleccionado.fechaVencimientoSeguro).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </li>
                                        <li className="flex justify-between pt-1">
                                            <span>Matrícula:</span>
                                            <span className={!vehiculoSeleccionado.fechaVencimientoMatricula ? 'text-slate-400' : ''}>
                                                {vehiculoSeleccionado.fechaVencimientoMatricula ? new Date(vehiculoSeleccionado.fechaVencimientoMatricula).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {vehiculoSeleccionado.observaciones && (
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                    <h5 className="text-xs font-bold text-amber-700 uppercase mb-1">Observaciones</h5>
                                    <p className="text-sm text-amber-800">{vehiculoSeleccionado.observaciones}</p>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => {
                                        setDetalleOpen(false);
                                        navigate(`/viajes?vehiculoId=${vehiculoSeleccionado.id}`);
                                    }}
                                    className="btn btn-outline flex items-center gap-2"
                                >
                                    Ver Historial de Viajes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación de eliminación */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={eliminarVehiculo}
                title="Eliminar Veh\u00edculo"
                message={`¿Estás seguro de que deseas eliminar este vehículo? Esta acción no se puede deshacer y se registrará en la auditoría del sistema.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

export default Vehiculos;
