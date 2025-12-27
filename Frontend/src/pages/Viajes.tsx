import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { viajeService, gastoService, vehiculoService, choferService, clienteService, materialService } from '../services/api';
import toast from 'react-hot-toast';
import {
    Plus,
    Search,
    Filter,
    Calendar,
    MapPin,
    User,
    Briefcase,
    Package,
    DollarSign,
    Clock,
    ArrowRight,
    FileText,
    Upload,
    X,
    Check,
    CheckCircle,
    Ban,
    Play,
    Truck,
    Eye,
    ChevronLeft
} from 'lucide-react';

// Mapeo de estados para badges
const ESTADOS_VIAJE: any = {
    PLANIFICADO: { label: 'Planificado', class: 'badge-neutral' },
    EN_CURSO: { label: 'En Curso', class: 'badge-info' },
    COMPLETADO: { label: 'Completado', class: 'badge-success' },
    CANCELADO: { label: 'Cancelado', class: 'badge-danger' },
};

const TIPOS_GASTO = ['COMBUSTIBLE', 'PEAJE', 'ALIMENTACION', 'HOSPEDAJE', 'MULTA', 'OTRO'];
const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];

interface Viaje {
    id: number;
    origen: string;
    destino: string;
    fechaSalida: string;
    fechaLlegadaEstimada?: string;
    fechaLlegadaReal?: string;
    kilometrosEstimados?: number;
    kilometrosReales?: number;
    tarifa: number;
    estado: string;
    observaciones?: string;
    vehiculo: { id: number; placa: string; marca: string; modelo: string };
    chofer: { id: number; nombres: string; apellidos: string; telefono?: string };
    cliente: { id: number; nombreRazonSocial: string };
    material: { id: number; nombre: string };
    gastos?: any[];
}

interface FormViaje {
    vehiculoId: string;
    choferId: string;
    clienteId: string;
    materialId: string;
    origen: string;
    destino: string;
    fechaSalida: string;
    fechaLlegadaEstimada: string;
    kilometrosEstimados: string;
    tarifa: string;
    observaciones: string;
}

interface FormGasto {
    tipoGasto: string;
    monto: string;
    fecha: string;
    metodoPago: string;
    descripcion: string;
}

export default function Viajes() {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'ADMIN';
    const [searchParams] = useSearchParams();

    // Estados del componente
    const [viajes, setViajes] = useState<Viaje[]>([]);
    const [loading, setLoading] = useState(true);
    const [vista, setVista] = useState<'lista' | 'formulario' | 'detalle'>('lista');
    const [viajeSeleccionado, setViajeSeleccionado] = useState<Viaje | null>(null);
    const [editando, setEditando] = useState(false);
    const [resumenEconomico, setResumenEconomico] = useState<{ ingreso: number; gastos: number; ganancia: number } | null>(null);

    // Datos para selects
    const [vehiculos, setVehiculos] = useState<any[]>([]);
    const [choferes, setChoferes] = useState<any[]>([]);
    const [clientes, setClientes] = useState<any[]>([]);
    const [materiales, setMateriales] = useState<any[]>([]);

    // Filtros
    const [filtros, setFiltros] = useState({
        estado: searchParams.get('estado') || '',
        vehiculoId: searchParams.get('vehiculoId') || '',
        choferId: searchParams.get('choferId') || '',
        clienteId: searchParams.get('clienteId') || '',
        fechaDesde: '',
        fechaHasta: '',
    });

    // Formulario de viaje
    const [formViaje, setFormViaje] = useState<FormViaje>({
        vehiculoId: '',
        choferId: '',
        clienteId: '',
        materialId: '',
        origen: '',
        destino: '',
        fechaSalida: '',
        fechaLlegadaEstimada: '',
        kilometrosEstimados: '',
        tarifa: '',
        observaciones: '',
    });

    // Modal de gasto
    const [mostrarModalGasto, setMostrarModalGasto] = useState(false);
    const [formGasto, setFormGasto] = useState<FormGasto>({
        tipoGasto: 'COMBUSTIBLE',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        metodoPago: 'EFECTIVO',
        descripcion: '',
    });
    const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);

    // Modal para completar viaje
    const [mostrarModalCompletar, setMostrarModalCompletar] = useState(false);
    const [datosComplecion, setDatosComplecion] = useState({
        kilometrosReales: '',
        fechaLlegadaReal: new Date().toISOString().slice(0, 16),
    });

    // Modal para ver imagen de comprobante
    const [imagenModalUrl, setImagenModalUrl] = useState<string | null>(null);

    // Cargar datos iniciales
    useEffect(() => {
        cargarViajes();
        cargarDatosSelects();
    }, []);

    const cargarViajes = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (filtros.estado) params.estado = filtros.estado;
            if (filtros.vehiculoId) params.vehiculoId = filtros.vehiculoId;
            if (filtros.choferId) params.choferId = filtros.choferId;
            if (filtros.clienteId) params.clienteId = filtros.clienteId;
            if (filtros.fechaDesde) params.fechaDesde = filtros.fechaDesde;
            if (filtros.fechaHasta) params.fechaHasta = filtros.fechaHasta;

            const response = await viajeService.listar(params);
            setViajes(response.datos || []);
        } catch (error: any) {
            toast.error(error.response?.data?.mensaje || 'Error al cargar viajes');
        } finally {
            setLoading(false);
        }
    };

    const cargarDatosSelects = async () => {
        try {
            const [vRes, cRes, clRes, mRes] = await Promise.all([
                vehiculoService.listar({ estado: 'ACTIVO' }),
                choferService.listar({ estado: 'ACTIVO' }),
                clienteService.listar({ estado: 'ACTIVO' }),
                materialService.listar(),
            ]);
            setVehiculos(vRes.vehiculos || []);
            setChoferes(cRes.choferes || []);
            setClientes(clRes.clientes || []);
            setMateriales(mRes.materiales || []);
        } catch (error) {
            console.error('Error al cargar datos para selects:', error);
        }
    };

    const cargarDetalleViaje = async (id: number) => {
        try {
            setLoading(true);
            const response = await viajeService.obtener(id);
            setViajeSeleccionado(response.datos.viaje);
            setResumenEconomico(response.datos.resumenEconomico);
            setVista('detalle');
        } catch (error: any) {
            toast.error(error.response?.data?.mensaje || 'Error al cargar detalle');
        } finally {
            setLoading(false);
        }
    };

    // Modal de creación/edición
    const [modalFormOpen, setModalFormOpen] = useState(false);

    // ... (keep existing state)

    const handleNuevoViaje = () => {
        setEditando(false);
        setFormViaje({
            vehiculoId: '',
            choferId: '',
            clienteId: '',
            materialId: '',
            origen: '',
            destino: '',
            fechaSalida: '',
            fechaLlegadaEstimada: '',
            kilometrosEstimados: '',
            tarifa: '',
            observaciones: '',
        });
        setModalFormOpen(true);
    };

    const handleGuardarViaje = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const datos = {
                vehiculoId: parseInt(formViaje.vehiculoId),
                choferId: parseInt(formViaje.choferId),
                clienteId: parseInt(formViaje.clienteId),
                materialId: parseInt(formViaje.materialId),
                origen: formViaje.origen,
                destino: formViaje.destino,
                fechaSalida: formViaje.fechaSalida,
                fechaLlegadaEstimada: formViaje.fechaLlegadaEstimada || undefined,
                kilometrosEstimados: formViaje.kilometrosEstimados ? parseInt(formViaje.kilometrosEstimados) : undefined,
                tarifa: parseFloat(formViaje.tarifa),
                observaciones: formViaje.observaciones || undefined,
            };

            if (editando && viajeSeleccionado) {
                await viajeService.actualizar(viajeSeleccionado.id, datos);
                toast.success('Viaje actualizado exitosamente');
            } else {
                await viajeService.crear(datos);
                toast.success('Viaje creado exitosamente');
            }

            setModalFormOpen(false);
            cargarViajes();
        } catch (error: any) {
            toast.error(error.response?.data?.mensaje || 'Error al guardar viaje');
        }
    };

    // ... (keep existing handlers)

    const handleCambiarEstado = async (nuevoEstado: string) => {
        if (!viajeSeleccionado) return;

        if (nuevoEstado === 'COMPLETADO') {
            setMostrarModalCompletar(true);
            return;
        }

        try {
            await viajeService.cambiarEstado(viajeSeleccionado.id, nuevoEstado);
            toast.success(`Estado del viaje actualizado`);
            cargarDetalleViaje(viajeSeleccionado.id);
        } catch (error: any) {
            toast.error(error.response?.data?.mensaje || 'Error al cambiar estado');
        }
    };

    const handleCompletarViaje = async () => {
        if (!viajeSeleccionado) return;

        try {
            await viajeService.cambiarEstado(viajeSeleccionado.id, 'COMPLETADO', {
                fechaLlegadaReal: datosComplecion.fechaLlegadaReal,
                kilometrosReales: datosComplecion.kilometrosReales ? parseInt(datosComplecion.kilometrosReales) : undefined,
            });
            toast.success('Viaje completado exitosamente');
            setMostrarModalCompletar(false);
            cargarDetalleViaje(viajeSeleccionado.id);
        } catch (error: any) {
            toast.error(error.response?.data?.mensaje || 'Error al completar viaje');
        }
    };

    const handleAgregarGasto = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!viajeSeleccionado) return;

        try {
            const formData = new FormData();
            formData.append('tipoGasto', formGasto.tipoGasto);
            formData.append('monto', formGasto.monto);
            formData.append('fecha', formGasto.fecha);
            formData.append('metodoPago', formGasto.metodoPago);
            if (formGasto.descripcion) formData.append('descripcion', formGasto.descripcion);
            if (archivoComprobante) formData.append('comprobante', archivoComprobante);

            await gastoService.crear(viajeSeleccionado.id, formData);
            toast.success('Gasto registrado exitosamente');
            setMostrarModalGasto(false);
            setFormGasto({
                tipoGasto: 'COMBUSTIBLE',
                monto: '',
                fecha: new Date().toISOString().split('T')[0],
                metodoPago: 'EFECTIVO',
                descripcion: '',
            });
            setArchivoComprobante(null);
            cargarDetalleViaje(viajeSeleccionado.id);
        } catch (error: any) {
            toast.error(error.response?.data?.mensaje || 'Error al registrar gasto');
        }
    };

    const formatearFecha = (fecha: string) => {
        if (!fecha) return '-';
        return new Date(fecha).toLocaleDateString('es-EC', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatearMoneda = (valor: number) => {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD',
        }).format(valor);
    };

    // =========== VISTA LISTA ===========
    if (vista === 'lista') {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h2 className="page-title">Gestión de Viajes</h2>
                        <p className="page-subtitle">Planificación, seguimiento y control de transporte.</p>
                    </div>
                    {esAdmin && (
                        <button onClick={handleNuevoViaje} className="btn btn-primary">
                            <Plus size={20} /> Nuevo Viaje
                        </button>
                    )}
                </div>

                {/* Filtros */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
                    {/* ... (Keep existing filters code exactly as is) ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <select
                            value={filtros.estado}
                            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                            className="form-select text-sm"
                        >
                            <option value="">Estado: Todos</option>
                            {Object.entries(ESTADOS_VIAJE).map(([key, val]: any) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>
                        <select
                            value={filtros.vehiculoId}
                            onChange={(e) => setFiltros({ ...filtros, vehiculoId: e.target.value })}
                            className="form-select text-sm"
                        >
                            <option value="">Vehículo: Todos</option>
                            {vehiculos.map((v) => (
                                <option key={v.id} value={v.id}>{v.placa} - {v.marca}</option>
                            ))}
                        </select>
                        <select
                            value={filtros.choferId}
                            onChange={(e) => setFiltros({ ...filtros, choferId: e.target.value })}
                            className="form-select text-sm"
                        >
                            <option value="">Chofer: Todos</option>
                            {choferes.map((c) => (
                                <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>
                            ))}
                        </select>
                        <select
                            value={filtros.clienteId}
                            onChange={(e) => setFiltros({ ...filtros, clienteId: e.target.value })}
                            className="form-select text-sm"
                        >
                            <option value="">Cliente: Todos</option>
                            {clientes.map((c) => (
                                <option key={c.id} value={c.id}>{c.nombreRazonSocial}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full">
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Desde</label>
                            <input
                                type="date"
                                className="form-input text-sm"
                                value={filtros.fechaDesde}
                                onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                            />
                        </div>
                        <div className="w-full">
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Hasta</label>
                            <input
                                type="date"
                                className="form-input text-sm"
                                value={filtros.fechaHasta}
                                onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                            />
                        </div>
                        <button onClick={cargarViajes} className="btn btn-secondary w-full md:w-auto">
                            <Search size={18} /> Buscar
                        </button>
                    </div>
                </div>

                {/* Tabla de viajes */}
                <div className="table-container">
                    {loading ? (
                        <div className="p-12 flex justify-center">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Ruta / Cliente</th>
                                    <th>Vehículo / Chofer</th>
                                    <th>Fecha Salida</th>
                                    <th>Tarifa</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viajes.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-slate-500">
                                            No se encontraron viajes registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    viajes.map((viaje) => (
                                        <tr key={viaje.id} className="group">
                                            <td className="font-mono text-xs text-slate-500">#{viaje.id}</td>
                                            <td>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1 text-slate-800 font-medium text-sm">
                                                        <MapPin size={14} className="text-indigo-500" />
                                                        {viaje.origen} <ArrowRight size={12} className="text-slate-400" /> {viaje.destino}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                        <Briefcase size={12} /> {viaje.cliente.nombreRazonSocial}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1 text-slate-800 text-sm">
                                                        <Truck size={14} className="text-slate-400" /> {viaje.vehiculo.placa}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                        <User size={12} /> {viaje.chofer.nombres} {viaje.chofer.apellidos}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                    <Calendar size={14} />
                                                    {new Date(viaje.fechaSalida).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="font-semibold text-slate-700">
                                                    {formatearMoneda(viaje.tarifa)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${ESTADOS_VIAJE[viaje.estado]?.class || 'badge-neutral'}`}>
                                                    {ESTADOS_VIAJE[viaje.estado]?.label || viaje.estado}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => cargarDetalleViaje(viaje.id)}
                                                    className="btn-ghost p-2 rounded-lg text-slate-400 hover:text-indigo-600"
                                                    title="Ver Detalle"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* MODAL FORMULARIO VIAJE */}
                {modalFormOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content-lg">
                            <div className="modal-header">
                                <h3 className="modal-title">
                                    {editando ? 'Editar Viaje' : 'Nuevo Viaje'}
                                </h3>
                                <button onClick={() => setModalFormOpen(false)} className="text-slate-400 hover:text-rose-500">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleGuardarViaje}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    {/* Sección: Recursos */}
                                    <div className="md:col-span-2">
                                        <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 border-b border-slate-100 pb-2">
                                            Recursos Asignados
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="form-label">Vehículo</label>
                                                <select
                                                    className="form-select"
                                                    value={formViaje.vehiculoId}
                                                    onChange={(e) => setFormViaje({ ...formViaje, vehiculoId: e.target.value })}
                                                    required
                                                >
                                                    <option value="">Seleccione...</option>
                                                    {vehiculos.map((v) => (
                                                        <option key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label">Chofer</label>
                                                <select
                                                    className="form-select"
                                                    value={formViaje.choferId}
                                                    onChange={(e) => setFormViaje({ ...formViaje, choferId: e.target.value })}
                                                    required
                                                >
                                                    <option value="">Seleccione...</option>
                                                    {choferes.map((c) => (
                                                        <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sección: Cliente y Carga */}
                                    <div className="md:col-span-2 mt-2">
                                        <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 border-b border-slate-100 pb-2">
                                            Cliente y Carga
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="form-label">Cliente</label>
                                                <select
                                                    className="form-select"
                                                    value={formViaje.clienteId}
                                                    onChange={(e) => setFormViaje({ ...formViaje, clienteId: e.target.value })}
                                                    required
                                                >
                                                    <option value="">Seleccione...</option>
                                                    {clientes.map((c) => (
                                                        <option key={c.id} value={c.id}>{c.nombreRazonSocial}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label">Material</label>
                                                <select
                                                    className="form-select"
                                                    value={formViaje.materialId}
                                                    onChange={(e) => setFormViaje({ ...formViaje, materialId: e.target.value })}
                                                    required
                                                >
                                                    <option value="">Seleccione...</option>
                                                    {materiales.map((m) => (
                                                        <option key={m.id} value={m.id}>{m.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sección: Ruta y Fechas */}
                                    <div className="md:col-span-2 mt-2">
                                        <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 border-b border-slate-100 pb-2">
                                            Detalles de Ruta
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="form-label">Origen</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formViaje.origen}
                                                    onChange={(e) => setFormViaje({ ...formViaje, origen: e.target.value })}
                                                    required
                                                    placeholder="Ciudad/Lugar de inicio"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label">Destino</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formViaje.destino}
                                                    onChange={(e) => setFormViaje({ ...formViaje, destino: e.target.value })}
                                                    required
                                                    placeholder="Ciudad/Lugar de llegada"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="form-label">Fecha y Hora de Salida</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input
                                                        type="date"
                                                        className="form-input"
                                                        value={formViaje.fechaSalida?.split('T')[0] || ''}
                                                        onChange={(e) => {
                                                            const time = formViaje.fechaSalida?.split('T')[1] || '08:00';
                                                            setFormViaje({ ...formViaje, fechaSalida: `${e.target.value}T${time}` });
                                                        }}
                                                        required
                                                    />
                                                    <input
                                                        type="time"
                                                        className="form-input"
                                                        value={formViaje.fechaSalida?.split('T')[1] || ''}
                                                        onChange={(e) => {
                                                            const date = formViaje.fechaSalida?.split('T')[0] || new Date().toISOString().split('T')[0];
                                                            setFormViaje({ ...formViaje, fechaSalida: `${date}T${e.target.value}` });
                                                        }}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="form-label">Fecha y Hora de Llegada Estimada</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input
                                                        type="date"
                                                        className="form-input"
                                                        value={formViaje.fechaLlegadaEstimada?.split('T')[0] || ''}
                                                        onChange={(e) => {
                                                            const time = formViaje.fechaLlegadaEstimada?.split('T')[1] || '18:00';
                                                            setFormViaje({ ...formViaje, fechaLlegadaEstimada: `${e.target.value}T${time}` });
                                                        }}
                                                        min={formViaje.fechaSalida?.split('T')[0] || undefined}
                                                    />
                                                    <input
                                                        type="time"
                                                        className="form-input"
                                                        value={formViaje.fechaLlegadaEstimada?.split('T')[1] || ''}
                                                        onChange={(e) => {
                                                            const date = formViaje.fechaLlegadaEstimada?.split('T')[0] || formViaje.fechaSalida?.split('T')[0] || new Date().toISOString().split('T')[0];
                                                            setFormViaje({ ...formViaje, fechaLlegadaEstimada: `${date}T${e.target.value}` });
                                                        }}
                                                    />
                                                </div>
                                                {formViaje.fechaSalida && formViaje.fechaLlegadaEstimada && (
                                                    <p className="text-xs text-slate-400 mt-2">
                                                        Duración estimada: {(() => {
                                                            const salida = new Date(formViaje.fechaSalida);
                                                            const llegada = new Date(formViaje.fechaLlegadaEstimada);
                                                            const diff = llegada.getTime() - salida.getTime();
                                                            if (diff <= 0) return 'Fecha inválida';
                                                            const horas = Math.floor(diff / (1000 * 60 * 60));
                                                            const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                            if (horas >= 24) {
                                                                const dias = Math.floor(horas / 24);
                                                                const horasRestantes = horas % 24;
                                                                return `${dias} día(s) ${horasRestantes}h`;
                                                            }
                                                            return `${horas}h ${minutos}m`;
                                                        })()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sección: Económica */}
                                    <div className="md:col-span-2 mt-2">
                                        <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 border-b border-slate-100 pb-2">
                                            Datos Económicos
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="form-label">Km. Estimados</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={formViaje.kilometrosEstimados}
                                                    onChange={(e) => setFormViaje({ ...formViaje, kilometrosEstimados: e.target.value })}
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label">Tarifa (USD)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={formViaje.tarifa}
                                                    onChange={(e) => setFormViaje({ ...formViaje, tarifa: e.target.value })}
                                                    required
                                                    step="0.01"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="form-label">Observaciones</label>
                                        <textarea
                                            className="form-input"
                                            rows={2}
                                            value={formViaje.observaciones}
                                            onChange={(e) => setFormViaje({ ...formViaje, observaciones: e.target.value })}
                                            placeholder="Notas adicionales..."
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        onClick={() => setModalFormOpen(false)}
                                        className="btn btn-secondary"
                                    >
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editando ? 'Guardar Cambios' : 'Crear Viaje'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // =========== VISTA DETALLE ===========
    if (vista === 'detalle' && viajeSeleccionado) {
        const estadoActual = viajeSeleccionado.estado;
        const puedeIniciar = estadoActual === 'PLANIFICADO';
        const puedeCompletar = estadoActual === 'EN_CURSO';
        const puedeCancelar = estadoActual === 'PLANIFICADO' || estadoActual === 'EN_CURSO';

        return (
            <div>
                <div className="page-header">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { cargarViajes(); setVista('lista'); }} className="btn-ghost p-2 rounded-full hover:bg-slate-100">
                            <ChevronLeft size={24} className="text-slate-600" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="page-title">Viaje #{viajeSeleccionado.id}</h2>
                                <span className={`badge ${ESTADOS_VIAJE[estadoActual]?.class || 'badge-neutral'}`}>
                                    {ESTADOS_VIAJE[estadoActual]?.label || estadoActual}
                                </span>
                            </div>
                            <p className="page-subtitle text-sm mt-1">
                                {viajeSeleccionado.origen} <ArrowRight size={12} className="inline mx-1" /> {viajeSeleccionado.destino}
                            </p>
                        </div>
                    </div>
                    {esAdmin && (
                        <div className="flex gap-2">
                            {puedeIniciar && (
                                <button onClick={() => handleCambiarEstado('EN_CURSO')} className="btn bg-indigo-600 hover:bg-indigo-700 text-white">
                                    <Play size={16} /> Iniciar
                                </button>
                            )}
                            {puedeCompletar && (
                                <button onClick={() => handleCambiarEstado('COMPLETADO')} className="btn bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <CheckCircle size={16} /> Completar
                                </button>
                            )}
                            {puedeCancelar && (
                                <button onClick={() => handleCambiarEstado('CANCELADO')} className="btn bg-rose-600 hover:bg-rose-700 text-white">
                                    <Ban size={16} /> Cancelar
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna Izquierda: Información General */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Tarjeta Info Principal */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 flex items-center gap-2">
                                <FileText size={16} className="text-indigo-500" /> Detalles del Servicio
                            </h3>
                            <div className="grid grid-cols-2 gap-6 text-sm">
                                <div>
                                    <span className="text-slate-400 text-xs uppercase block mb-1">Cliente</span>
                                    <p className="font-semibold text-slate-800">{viajeSeleccionado.cliente.nombreRazonSocial}</p>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs uppercase block mb-1">Material</span>
                                    <p className="font-semibold text-slate-800">{viajeSeleccionado.material.nombre}</p>
                                </div>
                                <div className="border-t border-slate-50 pt-2">
                                    <span className="text-slate-400 text-xs uppercase block mb-1">Vehículo</span>
                                    <div className="flex items-center gap-2">
                                        <Truck size={14} className="text-slate-400" />
                                        <p className="font-medium text-slate-700">{viajeSeleccionado.vehiculo.placa}</p>
                                    </div>
                                    <p className="text-xs text-slate-500">{viajeSeleccionado.vehiculo.marca} {viajeSeleccionado.vehiculo.modelo}</p>
                                </div>
                                <div className="border-t border-slate-50 pt-2">
                                    <span className="text-slate-400 text-xs uppercase block mb-1">Chofer</span>
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-slate-400" />
                                        <p className="font-medium text-slate-700">{viajeSeleccionado.chofer.nombres} {viajeSeleccionado.chofer.apellidos}</p>
                                    </div>
                                </div>
                                <div className="border-t border-slate-50 pt-2">
                                    <span className="text-slate-400 text-xs uppercase block mb-1">Salida Programada</span>
                                    <p className="font-medium text-slate-700">{formatearFecha(viajeSeleccionado.fechaSalida)}</p>
                                </div>
                                <div className="border-t border-slate-50 pt-2">
                                    <span className="text-slate-400 text-xs uppercase block mb-1">Llegada Estimada</span>
                                    <p className="font-medium text-slate-700">{formatearFecha(viajeSeleccionado.fechaLlegadaEstimada || '')}</p>
                                </div>
                                {viajeSeleccionado.fechaLlegadaReal && (
                                    <div className="col-span-2 bg-emerald-50 p-2 rounded-lg border border-emerald-100 mt-2">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-emerald-600 text-xs uppercase block">Llegada Real</span>
                                                <p className="font-semibold text-emerald-800">{formatearFecha(viajeSeleccionado.fechaLlegadaReal)}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-emerald-600 text-xs uppercase block">Km Reales</span>
                                                <p className="font-semibold text-emerald-800">{viajeSeleccionado.kilometrosReales} km</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tarjeta Gastos */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                                    <DollarSign size={16} className="text-amber-500" /> Gastos Operativos
                                </h3>
                                {esAdmin && (estadoActual === 'PLANIFICADO' || estadoActual === 'EN_CURSO') && (
                                    <button
                                        onClick={() => setMostrarModalGasto(true)}
                                        className="btn-ghost text-xs bg-slate-50 hover:bg-slate-100 text-indigo-600 font-medium px-3 py-1.5 rounded-lg border border-slate-200"
                                    >
                                        + Agregar Gasto
                                    </button>
                                )}
                            </div>

                            {viajeSeleccionado.gastos && viajeSeleccionado.gastos.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase">
                                                <th className="font-semibold text-left py-2">Concepto</th>
                                                <th className="font-semibold text-left py-2">Fecha</th>
                                                <th className="font-semibold text-left py-2">Monto</th>
                                                <th className="font-semibold text-right py-2">Comp.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {viajeSeleccionado.gastos.map((gasto: any) => (
                                                <tr key={gasto.id}>
                                                    <td className="py-3">
                                                        <div className="font-medium text-slate-700">{gasto.tipoGasto}</div>
                                                        <div className="text-xs text-slate-400">{gasto.descripcion || gasto.metodoPago}</div>
                                                    </td>
                                                    <td className="py-3 text-slate-600">{new Date(gasto.fecha).toLocaleDateString()}</td>
                                                    <td className="py-3 font-medium text-rose-600">{formatearMoneda(gasto.monto)}</td>
                                                    <td className="py-3 text-right">
                                                        {gasto.comprobante ? (
                                                            <button
                                                                onClick={() => setImagenModalUrl(gasto.comprobante.url)}
                                                                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline cursor-pointer"
                                                            >
                                                                <FileText size={12} /> Ver
                                                            </button>
                                                        ) : <span className="text-slate-300">-</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t border-slate-100 bg-slate-50/50">
                                            <tr>
                                                <td colSpan={2} className="py-3 font-semibold text-slate-700 text-right pr-4">Total Gastos:</td>
                                                <td className="py-3 font-bold text-rose-600">
                                                    {formatearMoneda(viajeSeleccionado.gastos.reduce((acc: number, g: any) => acc + Number(g.monto), 0))}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    <p className="text-slate-400 text-sm">No hay gastos registrados en este viaje.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Columna Derecha: Resumen Económico */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-6">
                            <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 text-center">Resumen Económico</h3>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-slate-600 text-sm font-medium">Ingresos Estimados</span>
                                    <span className="text-emerald-600 font-bold">{formatearMoneda(viajeSeleccionado.tarifa)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-slate-600 text-sm font-medium">Total Gastos</span>
                                    <span className="text-rose-600 font-bold">
                                        - {formatearMoneda(resumenEconomico?.gastos || 0)}
                                    </span>
                                </div>
                                <div className="border-t border-slate-100 pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-slate-800 font-bold">Margen Operativo</span>
                                        <span className={`font-bold text-lg ${(resumenEconomico?.ganancia || 0) >= 0 ? 'text-indigo-600' : 'text-rose-600'
                                            }`}>
                                            {formatearMoneda(resumenEconomico?.ganancia || 0)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${(resumenEconomico?.ganancia || 0) >= 0 ? 'bg-indigo-500' : 'bg-rose-500'
                                                }`}
                                            style={{
                                                width: `${Math.min(Math.max(
                                                    ((resumenEconomico?.ganancia || 0) / viajeSeleccionado.tarifa) * 100,
                                                    0), 100)}%`
                                            }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-center text-slate-400 mt-2">
                                        Margen: {((resumenEconomico?.ganancia || 0) / viajeSeleccionado.tarifa * 100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        {viajeSeleccionado.observaciones && (
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <h3 className="text-xs font-bold text-amber-700 uppercase mb-2">Observaciones</h3>
                                <p className="text-sm text-amber-800">{viajeSeleccionado.observaciones}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Agregar Gasto */}
                {mostrarModalGasto && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3 className="modal-title">Registrar Nuevo Gasto</h3>
                                <button onClick={() => setMostrarModalGasto(false)}><X className="text-slate-400 hover:text-rose-500" /></button>
                            </div>
                            <form onSubmit={handleAgregarGasto}>
                                <div className="modal-body grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="form-label">Tipo de Gasto</label>
                                        <select
                                            className="form-select"
                                            value={formGasto.tipoGasto}
                                            onChange={(e) => setFormGasto({ ...formGasto, tipoGasto: e.target.value })}
                                            required
                                        >
                                            {TIPOS_GASTO.map(type => <option key={type} value={type}>{type}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Fecha</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formGasto.fecha}
                                            onChange={(e) => setFormGasto({ ...formGasto, fecha: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Monto (USD)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-input"
                                            value={formGasto.monto}
                                            onChange={(e) => setFormGasto({ ...formGasto, monto: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Método Pago</label>
                                        <select
                                            className="form-select"
                                            value={formGasto.metodoPago}
                                            onChange={(e) => setFormGasto({ ...formGasto, metodoPago: e.target.value })}
                                        >
                                            {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="form-label">Descripción</label>
                                        <input
                                            className="form-input"
                                            value={formGasto.descripcion}
                                            onChange={(e) => setFormGasto({ ...formGasto, descripcion: e.target.value })}
                                            placeholder="Detalle opcional..."
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="form-label">Comprobante (Imagen)</label>
                                        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setArchivoComprobante(e.target.files ? e.target.files[0] : null)}
                                                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" onClick={() => setMostrarModalGasto(false)} className="btn btn-secondary">Cancelar</button>
                                    <button type="submit" className="btn btn-primary">Registrar Gasto</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal Completar Viaje */}
                {mostrarModalCompletar && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3 className="modal-title text-emerald-700">Finalizar Viaje</h3>
                                <button onClick={() => setMostrarModalCompletar(false)}><X className="text-slate-400 hover:text-rose-500" /></button>
                            </div>
                            <div className="modal-body space-y-4">
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-sm text-emerald-800 mb-4">
                                    <p>Ingrese los datos finales para cerrar el viaje y calcular la rentabilidad real.</p>
                                </div>
                                <div>
                                    <label className="form-label">Fecha y Hora Llegada</label>
                                    <input
                                        type="datetime-local"
                                        className="form-input"
                                        value={datosComplecion.fechaLlegadaReal}
                                        onChange={(e) => setDatosComplecion({ ...datosComplecion, fechaLlegadaReal: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Kilometraje Real</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="Lectura final del odómetro"
                                        value={datosComplecion.kilometrosReales}
                                        onChange={(e) => setDatosComplecion({ ...datosComplecion, kilometrosReales: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button onClick={() => setMostrarModalCompletar(false)} className="btn btn-secondary">Cancelar</button>
                                <button onClick={handleCompletarViaje} className="btn bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-lg shadow-emerald-200">
                                    Confirmar Finalización
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal para ver imagen de comprobante */}
                {imagenModalUrl && (
                    <div className="modal-overlay" onClick={() => setImagenModalUrl(null)}>
                        <div
                            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center p-4 border-b border-slate-100">
                                <h3 className="font-semibold text-slate-800">Comprobante de Gasto</h3>
                                <button
                                    onClick={() => setImagenModalUrl(null)}
                                    className="text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-4 bg-slate-50 flex items-center justify-center">
                                <img
                                    src={imagenModalUrl}
                                    alt="Comprobante de gasto"
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                                />
                            </div>
                            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
                                <a
                                    href={imagenModalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary"
                                >
                                    Abrir en Nueva Pestaña
                                </a>
                                <button onClick={() => setImagenModalUrl(null)} className="btn btn-primary">
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
    return null;
}
