import { useState, useEffect } from 'react';
import axios, { mantenimientoService, mensajeError } from '../services/api';
import SelectorComprobante from '../components/SelectorComprobante';
import { conArchivo } from '../utils/comprobante';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import {
    Plus,
    Search,
    Wrench,
    AlertTriangle,
    CheckCircle2,
    Clock,
    DollarSign,
    Calendar,
    Gauge,
    Edit2,
    Trash2,
    Eye,
    X,
    Building2,
    Truck,
    ShieldAlert,
    ExternalLink
} from 'lucide-react';

interface Mantenimiento {
    id: number;
    vehiculoId: number;
    vehiculo: {
        id: number;
        placa: string;
        marca: string;
        modelo: string;
        kilometrajeActual: number;
        estado: string;
    };
    tipo: 'PREVENTIVO' | 'CORRECTIVO';
    estado: 'PROGRAMADO' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO';
    descripcion: string;
    taller: string;
    esExterno: boolean;
    costoManoObra: number;
    costoRepuestos: number;
    costoTotal: number;
    fecha: string;
    kilometrajeAlMomento?: number;
    proximaFecha?: string;
    proximoKilometraje?: number;
    observaciones?: string;
    urlComprobante?: string;
}

interface AlertaMantenimiento {
    vehiculoId: number;
    placa: string;
    marca: string;
    modelo: string;
    kilometrajeActual: number;
    tipoAlerta: 'VENCIDO_FECHA' | 'PROXIMO_FECHA' | 'VENCIDO_KM' | 'PROXIMO_KM';
    mensaje: string;
    fechaProgramada?: string;
    kmProgramado?: number;
}

const Mantenimientos = () => {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'ADMIN';

    const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
    const [vehiculos, setVehiculos] = useState<any[]>([]);
    const [alertas, setAlertas] = useState<AlertaMantenimiento[]>([]);
    const [loading, setLoading] = useState(true);

    const [filtros, setFiltros] = useState({
        busqueda: '',
        vehiculoId: '',
        tipo: '',
        estado: ''
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [mantenimientoSeleccionado, setMantenimientoSeleccionado] = useState<Mantenimiento | null>(null);

    const [detalleOpen, setDetalleOpen] = useState(false);
    const [mantenimientoDetalle, setMantenimientoDetalle] = useState<Mantenimiento | null>(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [mantenimientoToDelete, setMantenimientoToDelete] = useState<number | null>(null);

    // Formulario inicial
    const hoyStr = new Date().toISOString().split('T')[0];
    const formInicial = {
        vehiculoId: '',
        tipo: 'PREVENTIVO',
        estado: 'COMPLETADO',
        descripcion: '',
        taller: '',
        esExterno: true,
        costoManoObra: 0,
        costoRepuestos: 0,
        costoTotal: 0,
        fecha: hoyStr,
        kilometrajeAlMomento: 0,
        proximaFecha: '',
        proximoKilometraje: 0,
        observaciones: '',
        urlComprobante: ''
    };
    const [formData, setFormData] = useState(formInicial);

    useEffect(() => {
        cargarDatos();
    }, [filtros]);

    useEffect(() => {
        cargarAlertas();
        cargarVehiculos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
            if (filtros.vehiculoId) params.append('vehiculoId', filtros.vehiculoId);
            if (filtros.tipo) params.append('tipo', filtros.tipo);
            if (filtros.estado) params.append('estado', filtros.estado);

            const { data } = await axios.get(`/mantenimientos?${params.toString()}`);
            setMantenimientos(data.mantenimientos || []);
        } catch (error) {
            toast.error('Error al cargar lista de mantenimientos');
        } finally {
            setLoading(false);
        }
    };

    const cargarVehiculos = async () => {
        try {
            const { data } = await axios.get('/vehiculos');
            setVehiculos(data.vehiculos || []);
        } catch (error) {
            console.error('Error cargando vehículos', error);
        }
    };

    const cargarAlertas = async () => {
        try {
            const { data } = await axios.get('/mantenimientos/alertas');
            setAlertas(data.alertas || []);
        } catch (error) {
            console.error('Error cargando alertas', error);
        }
    };

    // Auto-actualizar costo total en el formulario
    const handleCostoChange = (campo: 'costoManoObra' | 'costoRepuestos', valor: number) => {
        const manoObra = campo === 'costoManoObra' ? valor : Number(formData.costoManoObra || 0);
        const repuestos = campo === 'costoRepuestos' ? valor : Number(formData.costoRepuestos || 0);
        setFormData(prev => ({
            ...prev,
            [campo]: valor,
            costoTotal: manoObra + repuestos
        }));
    };

    const handleVehiculoChange = (vehiculoIdStr: string) => {
        const vId = Number(vehiculoIdStr);
        const veh = vehiculos.find(v => v.id === vId);
        const kmActual = veh?.kilometrajeActual || 0;

        setFormData(prev => ({
            ...prev,
            vehiculoId: vehiculoIdStr,
            kilometrajeAlMomento: kmActual,
            proximoKilometraje: kmActual + 5000 // Sugerencia de 5,000 km por defecto
        }));
    };

    const abrirModal = (mantenimiento?: Mantenimiento) => {
        if (mantenimiento) {
            setModoEdicion(true);
            setMantenimientoSeleccionado(mantenimiento);
            setFormData({
                vehiculoId: mantenimiento.vehiculoId.toString(),
                tipo: mantenimiento.tipo,
                estado: mantenimiento.estado,
                descripcion: mantenimiento.descripcion,
                taller: mantenimiento.taller,
                esExterno: mantenimiento.esExterno,
                costoManoObra: Number(mantenimiento.costoManoObra),
                costoRepuestos: Number(mantenimiento.costoRepuestos),
                costoTotal: Number(mantenimiento.costoTotal),
                fecha: mantenimiento.fecha ? mantenimiento.fecha.split('T')[0] : hoyStr,
                kilometrajeAlMomento: mantenimiento.kilometrajeAlMomento || 0,
                proximaFecha: mantenimiento.proximaFecha ? mantenimiento.proximaFecha.split('T')[0] : '',
                proximoKilometraje: mantenimiento.proximoKilometraje || 0,
                observaciones: mantenimiento.observaciones || '',
                urlComprobante: mantenimiento.urlComprobante || ''
            });
        } else {
            setModoEdicion(false);
            setMantenimientoSeleccionado(null);
            const primerVehiculo = vehiculos[0];
            const km = primerVehiculo?.kilometrajeActual || 0;
            setFormData({
                ...formInicial,
                vehiculoId: primerVehiculo ? primerVehiculo.id.toString() : '',
                kilometrajeAlMomento: km,
                proximoKilometraje: km + 5000
            });
        }
        setArchivoComprobante(null);
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!formData.vehiculoId) {
                toast.error('Selecciona un vehículo');
                return;
            }

            const payload = {
                ...formData,
                vehiculoId: Number(formData.vehiculoId),
                costoManoObra: Number(formData.costoManoObra),
                costoRepuestos: Number(formData.costoRepuestos),
                costoTotal: Number(formData.costoTotal),
                kilometrajeAlMomento: Number(formData.kilometrajeAlMomento),
                proximoKilometraje: formData.proximoKilometraje ? Number(formData.proximoKilometraje) : undefined,
                proximaFecha: formData.proximaFecha || undefined,
            };

            const cuerpo = conArchivo(payload, archivoComprobante);
            if (modoEdicion && mantenimientoSeleccionado) {
                await mantenimientoService.actualizar(mantenimientoSeleccionado.id, cuerpo);
                toast.success('Mantenimiento actualizado');
            } else {
                await mantenimientoService.crear(cuerpo);
                toast.success('Mantenimiento registrado y kilometraje actualizado');
            }

            setArchivoComprobante(null);
            setModalOpen(false);
            cargarDatos();
            cargarAlertas();
            cargarVehiculos();
        } catch (error: any) {
            toast.error(mensajeError(error, 'Error al guardar el mantenimiento'));
        }
    };

    const confirmarEliminacion = (id: number) => {
        setMantenimientoToDelete(id);
        setShowDeleteModal(true);
    };

    const eliminarMantenimiento = async () => {
        if (!mantenimientoToDelete) return;
        try {
            await axios.delete(`/mantenimientos/${mantenimientoToDelete}`);
            toast.success('Mantenimiento eliminado');
            cargarDatos();
            cargarAlertas();
        } catch (error: any) {
            toast.error(mensajeError(error, 'Error al eliminar'));
        } finally {
            setMantenimientoToDelete(null);
        }
    };

    const verDetalle = (m: Mantenimiento) => {
        setMantenimientoDetalle(m);
        setDetalleOpen(true);
    };

    const formatearMoneda = (valor: number) => {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(valor);
    };

    // Resumen estadístico local
    const totalGasto = mantenimientos.reduce((acc, m) => acc + Number(m.costoTotal || 0), 0);
    const preventivosCount = mantenimientos.filter(m => m.tipo === 'PREVENTIVO').length;
    const correctivosCount = mantenimientos.filter(m => m.tipo === 'CORRECTIVO').length;
    const enTallerCount = mantenimientos.filter(m => m.estado === 'EN_PROCESO' || m.estado === 'PROGRAMADO').length;

    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case 'COMPLETADO':
                return <span className="badge badge-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Completado</span>;
            case 'EN_PROCESO':
                return <span className="badge badge-warning flex items-center gap-1"><Wrench className="h-3 w-3" /> En Taller</span>;
            case 'PROGRAMADO':
                return <span className="badge badge-info flex items-center gap-1"><Clock className="h-3 w-3" /> Programado</span>;
            case 'CANCELADO':
                return <span className="badge badge-danger flex items-center gap-1"><X className="h-3 w-3" /> Cancelado</span>;
            default:
                return <span className="badge">{estado}</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md">
                            <Wrench className="h-7 w-7" />
                        </div>
                        Control de Mantenimientos
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Gestión técnica de la flota, control de talleres, costos operativos y prevención de fallas.
                    </p>
                </div>
                {esAdmin && (
                    <button
                        onClick={() => abrirModal()}
                        className="btn btn-primary"
                    >
                        <Plus className="h-5 w-5" />
                        Registrar Mantenimiento
                    </button>
                )}
            </div>

            {/* Banner de Alertas si existen */}
            {alertas.length > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md shadow-sm">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wide">
                                Alertas de Mantenimiento Requeridas ({alertas.length})
                            </h4>
                            <p className="text-xs text-amber-700 mt-0.5">
                                Los siguientes vehículos requieren atención preventiva inmediata por fecha o límite de kilometraje alcanzado:
                            </p>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {alertas.map((alerta, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white border border-amber-200 rounded-lg p-2.5 flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900 text-xs px-2 py-0.5 bg-slate-100 rounded">
                                                    {alerta.placa}
                                                </span>
                                                <span className="text-xs text-slate-600 font-medium">
                                                    {alerta.marca} {alerta.modelo}
                                                </span>
                                            </div>
                                            <p className="text-xs font-semibold text-rose-600 mt-1">
                                                {alerta.mensaje}
                                            </p>
                                        </div>
                                        {esAdmin && (
                                            <button
                                                onClick={() => {
                                                    const veh = vehiculos.find(v => v.id === alerta.vehiculoId);
                                                    setFormData({
                                                        ...formInicial,
                                                        vehiculoId: alerta.vehiculoId.toString(),
                                                        kilometrajeAlMomento: alerta.kilometrajeActual,
                                                        proximoKilometraje: alerta.kilometrajeActual + 5000,
                                                        tipo: 'PREVENTIVO',
                                                        estado: 'PROGRAMADO',
                                                        descripcion: `Mantenimiento preventivo por alerta: ${alerta.mensaje}`
                                                    });
                                                    setModoEdicion(false);
                                                    setModalOpen(true);
                                                }}
                                                className="btn btn-secondary px-2.5 py-1 text-xs"
                                                title="Programar Mantenimiento"
                                            >
                                                Agendar
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card-stat card-stat-blue">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-500 text-sm font-medium">Total Registros</span>
                        <div className="card-stat-icon card-stat-icon-blue">
                            <Wrench className="h-5 w-5" />
                        </div>
                    </div>
                    <span className="card-stat-value">{mantenimientos.length}</span>
                    <span className="text-xs text-slate-400 mt-1 block">Historial completo</span>
                </div>

                <div className="card-stat card-stat-emerald">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-500 text-sm font-medium">Inversión Total</span>
                        <div className="card-stat-icon card-stat-icon-emerald">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </div>
                    <span className="card-stat-value">{formatearMoneda(totalGasto)}</span>
                    <span className="text-xs text-slate-400 mt-1 block">Mano de obra + Repuestos</span>
                </div>

                <div className="card-stat card-stat-violet">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-500 text-sm font-medium">Preventivo / Correctivo</span>
                        <div className="card-stat-icon card-stat-icon-violet">
                            <Gauge className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="card-stat-value text-indigo-600">{preventivosCount}</span>
                        <span className="text-slate-400 text-sm">/ {correctivosCount} corr.</span>
                    </div>
                    <span className="text-xs text-slate-400 mt-1 block">
                        {preventivosCount + correctivosCount > 0
                            ? `${Math.round((preventivosCount / (preventivosCount + correctivosCount)) * 100)}% preventivos`
                            : 'Sin registros'}
                    </span>
                </div>

                <div className="card-stat card-stat-amber">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-500 text-sm font-medium">En Taller / Activos</span>
                        <div className="card-stat-icon card-stat-icon-amber">
                            <Clock className="h-5 w-5" />
                        </div>
                    </div>
                    <span className="card-stat-value text-amber-600">{enTallerCount}</span>
                    <span className="text-xs text-slate-400 mt-1 block">Vehículos en intervención</span>
                </div>
            </div>

            {/* Filtros */}
            <div className="card p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Búsqueda */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por placa, taller, descripción..."
                            value={filtros.busqueda}
                            onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                            className="form-input pl-9 text-sm"
                        />
                    </div>

                    {/* Filtro por Vehículo */}
                    <div>
                        <select
                            value={filtros.vehiculoId}
                            onChange={(e) => setFiltros({ ...filtros, vehiculoId: e.target.value })}
                            className="form-select text-sm"
                        >
                            <option value="">Todos los Vehículos</option>
                            {vehiculos.map(v => (
                                <option key={v.id} value={v.id}>
                                    {v.placa} - {v.marca} {v.modelo}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro por Tipo */}
                    <div>
                        <select
                            value={filtros.tipo}
                            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                            className="form-select text-sm"
                        >
                            <option value="">Todos los Tipos</option>
                            <option value="PREVENTIVO">Preventivo</option>
                            <option value="CORRECTIVO">Correctivo</option>
                        </select>
                    </div>

                    {/* Filtro por Estado */}
                    <div>
                        <select
                            value={filtros.estado}
                            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                            className="form-select text-sm"
                        >
                            <option value="">Todos los Estados</option>
                            <option value="PROGRAMADO">Programado</option>
                            <option value="EN_PROCESO">En Proceso (Taller)</option>
                            <option value="COMPLETADO">Completado</option>
                            <option value="CANCELADO">Cancelado</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabla de Mantenimientos */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Vehículo</th>
                            <th>Tipo & Estado</th>
                            <th>Taller</th>
                            <th>Fecha & Odómetro</th>
                            <th>Costo Total</th>
                            <th>Próximo Servicio</th>
                            <th className="text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
                                    <p className="text-slate-500 text-sm mt-2">Cargando mantenimientos...</p>
                                </td>
                            </tr>
                        ) : mantenimientos.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12">
                                    <Wrench className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-600 font-medium">No se encontraron mantenimientos</p>
                                    <p className="text-slate-400 text-xs mt-1">Registra uno nuevo para iniciar el historial</p>
                                </td>
                            </tr>
                        ) : (
                            mantenimientos.map((m) => (
                                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td>
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                <Truck className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-900 block text-sm">
                                                    {m.vehiculo?.placa || `ID: ${m.vehiculoId}`}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {m.vehiculo?.marca} {m.vehiculo?.modelo}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="space-y-1">
                                            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md ${
                                                m.tipo === 'PREVENTIVO'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                            }`}>
                                                {m.tipo}
                                            </span>
                                            <div>{getEstadoBadge(m.estado)}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                            {m.taller}
                                        </div>
                                        <span className="text-xs text-slate-400">
                                            {m.esExterno ? 'Taller Externo' : 'Taller Interno'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            {new Date(m.fecha).toLocaleDateString('es-EC')}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                            <Gauge className="h-3 w-3" />
                                            {m.kilometrajeAlMomento ? `${m.kilometrajeAlMomento.toLocaleString()} km` : 'Sin registrar'}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-sm font-bold text-emerald-600">
                                            {formatearMoneda(Number(m.costoTotal))}
                                        </span>
                                        <span className="text-xs text-slate-400 block">
                                            MO: ${Number(m.costoManoObra).toFixed(0)} | Rep: ${Number(m.costoRepuestos).toFixed(0)}
                                        </span>
                                    </td>
                                    <td>
                                        {m.proximaFecha ? (
                                            <div className="text-xs text-slate-700 font-medium">
                                                {new Date(m.proximaFecha).toLocaleDateString('es-EC')}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">Sin fecha prox.</span>
                                        )}
                                        {m.proximoKilometraje ? (
                                            <span className="text-xs text-indigo-600 font-semibold block">
                                                a los {m.proximoKilometraje.toLocaleString()} km
                                            </span>
                                        ) : null}
                                    </td>
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => verDetalle(m)}
                                                className="btn-ghost p-1.5 text-slate-500 hover:text-indigo-600"
                                                title="Ver Detalle"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            {esAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => abrirModal(m)}
                                                        className="btn-ghost p-1.5 text-slate-500 hover:text-amber-600"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmarEliminacion(m.id)}
                                                        className="btn-ghost p-1.5 text-slate-500 hover:text-rose-600"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
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
            </div>

            {/* Modal de Crear / Editar */}
            {modalOpen && (
                <div className="modal-overlay" onClick={() => setModalOpen(false)}>
                    <div
                        className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Wrench className="h-5 w-5" />
                                </div>
                                <h3 className="modal-title">
                                    {modoEdicion ? 'Editar Mantenimiento' : 'Registrar Mantenimiento de Vehículo'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body space-y-4">
                                {/* Vehículo y Tipo */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="form-label">Vehículo *</label>
                                        <select
                                            value={formData.vehiculoId}
                                            onChange={(e) => handleVehiculoChange(e.target.value)}
                                            required
                                            className="form-select"
                                        >
                                            <option value="">Selecciona un vehículo</option>
                                            {vehiculos.map(v => (
                                                <option key={v.id} value={v.id}>
                                                    {v.placa} ({v.marca} {v.modelo}) - Odómetro: {v.kilometrajeActual} km
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Tipo de Servicio *</label>
                                        <select
                                            value={formData.tipo}
                                            onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                                            className="form-select"
                                        >
                                            <option value="PREVENTIVO">Preventivo (Cambio de aceite, filtros, etc.)</option>
                                            <option value="CORRECTIVO">Correctivo (Reparación mecánica, frenos, etc.)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Estado y Taller */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="form-label">Estado del Mantenimiento *</label>
                                        <select
                                            value={formData.estado}
                                            onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                                            className="form-select"
                                        >
                                            <option value="COMPLETADO">Completado</option>
                                            <option value="EN_PROCESO">En Proceso (Vehículo entra a taller)</option>
                                            <option value="PROGRAMADO">Programado (Cita futura)</option>
                                            <option value="CANCELADO">Cancelado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Taller / Proveedor *</label>
                                        <input
                                            type="text"
                                            value={formData.taller}
                                            onChange={(e) => setFormData({ ...formData, taller: e.target.value })}
                                            placeholder="Ej: Taller Diesel Hermanos / Taller Interno"
                                            required
                                            className="form-input"
                                        />
                                        <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-slate-600 font-medium">
                                            <input
                                                type="checkbox"
                                                checked={formData.esExterno}
                                                onChange={(e) => setFormData({ ...formData, esExterno: e.target.checked })}
                                                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                            />
                                            Es Taller Externo (Tercerizado)
                                        </label>
                                    </div>
                                </div>

                                {/* Fecha y Kilometraje */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="form-label">Fecha de Realización *</label>
                                        <input
                                            type="date"
                                            value={formData.fecha}
                                            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                            required
                                            className="form-input"
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Kilometraje al Momento (km) *</label>
                                        <input
                                            type="number"
                                            value={formData.kilometrajeAlMomento}
                                            onChange={(e) => setFormData({ ...formData, kilometrajeAlMomento: Number(e.target.value) })}
                                            min={0}
                                            required
                                            className="form-input"
                                        />
                                        <p className="text-xs text-indigo-600 mt-1">
                                            Si es superior al odómetro actual, el vehículo se actualizará automáticamente.
                                        </p>
                                    </div>
                                </div>

                                {/* Desglose Financiero */}
                                <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-emerald-600" />
                                        Desglose de Costos
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 block mb-1">Mano de Obra ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min={0}
                                                value={formData.costoManoObra}
                                                onChange={(e) => handleCostoChange('costoManoObra', Number(e.target.value))}
                                                className="form-input text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 block mb-1">Repuestos ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min={0}
                                                value={formData.costoRepuestos}
                                                onChange={(e) => handleCostoChange('costoRepuestos', Number(e.target.value))}
                                                className="form-input text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 block mb-1">Costo Total ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min={0}
                                                value={formData.costoTotal}
                                                onChange={(e) => setFormData({ ...formData, costoTotal: Number(e.target.value) })}
                                                className="form-input text-sm font-bold text-emerald-700 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Próximo Mantenimiento Programado */}
                                <div className="bg-indigo-50/50 p-4 rounded-md border border-indigo-100">
                                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-indigo-600" />
                                        Programar Próximo Mantenimiento (Opcional)
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha Próximo Servicio</label>
                                            <input
                                                type="date"
                                                value={formData.proximaFecha}
                                                onChange={(e) => setFormData({ ...formData, proximaFecha: e.target.value })}
                                                className="form-input text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 block mb-1">Próximo Kilometraje (km)</label>
                                            <input
                                                type="number"
                                                value={formData.proximoKilometraje || ''}
                                                onChange={(e) => setFormData({ ...formData, proximoKilometraje: Number(e.target.value) })}
                                                placeholder="Ej: 85000"
                                                className="form-input text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Descripción y Observaciones */}
                                <div>
                                    <label className="form-label">Descripción del Trabajo Realizado *</label>
                                    <textarea
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                        placeholder="Detalla los trabajos: cambio de aceite sintético 15W40, cambio de filtro de aire y combustible..."
                                        rows={2}
                                        required
                                        className="form-input"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Observaciones Adicionales / Diagnóstico</label>
                                    <textarea
                                        value={formData.observaciones}
                                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                        placeholder="Notas para el conductor o alertas sobre neumáticos, frenos futuros..."
                                        rows={2}
                                        className="form-input"
                                    />
                                </div>

                                <SelectorComprobante
                                    archivo={archivoComprobante}
                                    onChange={setArchivoComprobante}
                                    urlActual={modoEdicion ? formData.urlComprobante : null}
                                />
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                >
                                    {modoEdicion ? 'Actualizar Mantenimiento' : 'Guardar Mantenimiento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Detalle */}
            {detalleOpen && mantenimientoDetalle && (
                <div className="modal-overlay" onClick={() => setDetalleOpen(false)}>
                    <div
                        className="modal-content max-w-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-md">
                                    <Wrench className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="modal-title">Detalle del Mantenimiento</h3>
                                    <p className="text-xs text-slate-500">
                                        ID #{mantenimientoDetalle.id} • {mantenimientoDetalle.vehiculo?.placa} ({mantenimientoDetalle.vehiculo?.marca} {mantenimientoDetalle.vehiculo?.modelo})
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setDetalleOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="modal-body space-y-4">
                            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-md border border-slate-200">
                                <div>
                                    <span className="text-xs text-slate-500 block">Tipo & Estado</span>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="font-semibold text-sm text-slate-800">{mantenimientoDetalle.tipo}</span>
                                        {getEstadoBadge(mantenimientoDetalle.estado)}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 block">Taller</span>
                                    <span className="font-semibold text-sm text-slate-800">
                                        {mantenimientoDetalle.taller} ({mantenimientoDetalle.esExterno ? 'Externo' : 'Interno'})
                                    </span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 block">Fecha Realización</span>
                                    <span className="font-semibold text-sm text-slate-800">
                                        {new Date(mantenimientoDetalle.fecha).toLocaleDateString('es-EC')}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 block">Odómetro del Servicio</span>
                                    <span className="font-semibold text-sm text-slate-800">
                                        {mantenimientoDetalle.kilometrajeAlMomento ? `${mantenimientoDetalle.kilometrajeAlMomento.toLocaleString()} km` : 'No registrado'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Descripción</h5>
                                <p className="text-sm text-slate-800 bg-white p-3 rounded-lg border border-slate-100">
                                    {mantenimientoDetalle.descripcion}
                                </p>
                            </div>

                            {mantenimientoDetalle.urlComprobante && (
                                <a href={mantenimientoDetalle.urlComprobante} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm w-full justify-center">
                                    Ver factura / comprobante del taller
                                </a>
                            )}

                            {mantenimientoDetalle.observaciones && (
                                <div>
                                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Observaciones</h5>
                                    <p className="text-sm text-slate-700 bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                                        {mantenimientoDetalle.observaciones}
                                    </p>
                                </div>
                            )}

                            <div className="bg-emerald-50 p-4 rounded-md border border-emerald-100">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="text-xs text-emerald-800 font-semibold block">Costo Total Facturado</span>
                                        <span className="text-2xl font-bold text-emerald-700">
                                            {formatearMoneda(Number(mantenimientoDetalle.costoTotal))}
                                        </span>
                                    </div>
                                    <div className="text-right text-xs text-emerald-800">
                                        <p>Mano de Obra: ${Number(mantenimientoDetalle.costoManoObra).toFixed(2)}</p>
                                        <p>Repuestos: ${Number(mantenimientoDetalle.costoRepuestos).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            {(mantenimientoDetalle.proximaFecha || mantenimientoDetalle.proximoKilometraje) && (
                                <div className="bg-indigo-50 p-3 rounded-md border border-indigo-100 text-xs text-indigo-900">
                                    <span className="font-bold block mb-1">Próximo Mantenimiento Programado:</span>
                                    {mantenimientoDetalle.proximaFecha && (
                                        <p>Fecha estimada: {new Date(mantenimientoDetalle.proximaFecha).toLocaleDateString('es-EC')}</p>
                                    )}
                                    {mantenimientoDetalle.proximoKilometraje && (
                                        <p>Al alcanzar: {mantenimientoDetalle.proximoKilometraje.toLocaleString()} km</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                onClick={() => setDetalleOpen(false)}
                                className="btn btn-secondary w-full"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Confirmación Eliminación */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={eliminarMantenimiento}
                title="Eliminar Mantenimiento"
                message="¿Estás seguro de que deseas eliminar este registro de mantenimiento? Esta acción se registrará en la auditoría del sistema."
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

export default Mantenimientos;
