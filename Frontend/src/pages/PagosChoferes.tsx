import { useState, useEffect } from 'react';
import axios, { pagoChoferService, mensajeError } from '../services/api';
import SelectorComprobante from '../components/SelectorComprobante';
import { conArchivo } from '../utils/comprobante';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import {
    Plus,
    Search,
    Banknote,
    DollarSign,
    Users,
    CreditCard,
    Calendar,
    Route,
    Edit2,
    Trash2,
    Eye,
    X,
    Building2,
    Wallet,
    FileText,
    CheckCircle,
    ArrowUpRight,
    BadgePercent
} from 'lucide-react';

interface PagoChofer {
    id: number;
    choferId: number;
    chofer: {
        id: number;
        nombres: string;
        apellidos: string;
        documentoId: string;
        modalidadPago: string;
        banco?: string;
        numeroCuenta?: string;
        sueldoMensual?: number;
    };
    viajeId?: number | null;
    viaje?: {
        id: number;
        origen: string;
        destino: string;
        tarifa: number;
        estado: string;
        fechaSalida: string;
    } | null;
    tipoPago: 'SUELDO_MENSUAL' | 'POR_VIAJE' | 'ANTICIPO' | 'LIQUIDACION';
    monto: number;
    fecha: string;
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
    descripcion?: string;
    urlComprobante?: string;
}

const PagosChoferes = () => {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'ADMIN';

    const [pagos, setPagos] = useState<PagoChofer[]>([]);
    const [choferes, setChoferes] = useState<any[]>([]);
    const [viajesChofer, setViajesChofer] = useState<any[]>([]);
    const [resumenChoferSeleccionado, setResumenChoferSeleccionado] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [filtros, setFiltros] = useState({
        busqueda: '',
        choferId: '',
        tipoPago: '',
        metodoPago: ''
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [pagoSeleccionado, setPagoSeleccionado] = useState<PagoChofer | null>(null);

    const [detalleOpen, setDetalleOpen] = useState(false);
    const [pagoDetalle, setPagoDetalle] = useState<PagoChofer | null>(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [pagoToDelete, setPagoToDelete] = useState<number | null>(null);

    const hoyStr = new Date().toISOString().split('T')[0];
    const formInicial = {
        choferId: '',
        viajeId: '',
        tipoPago: 'POR_VIAJE',
        monto: 0,
        fecha: hoyStr,
        metodoPago: 'TRANSFERENCIA',
        descripcion: '',
        urlComprobante: ''
    };
    const [formData, setFormData] = useState(formInicial);

    useEffect(() => {
        cargarPagos();
    }, [filtros]);

    useEffect(() => {
        cargarChoferes();
    }, []);

    const cargarPagos = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
            if (filtros.choferId) params.append('choferId', filtros.choferId);
            if (filtros.tipoPago) params.append('tipoPago', filtros.tipoPago);
            if (filtros.metodoPago) params.append('metodoPago', filtros.metodoPago);

            const { data } = await axios.get(`/pagos-choferes?${params.toString()}`);
            setPagos(data.pagos || []);
        } catch (error) {
            toast.error('Error al cargar la lista de pagos');
        } finally {
            setLoading(false);
        }
    };

    const cargarChoferes = async () => {
        try {
            const { data } = await axios.get('/choferes');
            setChoferes(data.choferes || []);
        } catch (error) {
            console.error('Error al cargar choferes', error);
        }
    };

    const handleChoferChange = async (choferIdStr: string) => {
        setFormData(prev => ({ ...prev, choferId: choferIdStr, viajeId: '' }));

        if (!choferIdStr) {
            setResumenChoferSeleccionado(null);
            setViajesChofer([]);
            return;
        }

        const chId = Number(choferIdStr);
        const ch = choferes.find(c => c.id === chId);

        // Preseleccionar tipo de pago según modalidad
        if (ch) {
            setFormData(prev => ({
                ...prev,
                tipoPago: ch.modalidadPago === 'MENSUAL' ? 'SUELDO_MENSUAL' : 'POR_VIAJE',
                metodoPago: ch.metodoPago || 'TRANSFERENCIA',
                monto: ch.modalidadPago === 'MENSUAL' ? Number(ch.sueldoMensual || 0) : prev.monto
            }));
        }

        // Cargar balance y viajes del chofer
        try {
            const [resResumen, resViajes] = await Promise.all([
                axios.get(`/pagos-choferes/chofer/${chId}/resumen`),
                axios.get(`/viajes?choferId=${chId}`)
            ]);
            setResumenChoferSeleccionado(resResumen.data.resumen);
            setViajesChofer(resViajes.data.viajes || []);
        } catch (error) {
            console.error('Error cargando balance del chofer', error);
        }
    };

    const abrirModal = (pago?: PagoChofer) => {
        if (pago) {
            setModoEdicion(true);
            setPagoSeleccionado(pago);
            setFormData({
                choferId: pago.choferId.toString(),
                viajeId: pago.viajeId ? pago.viajeId.toString() : '',
                tipoPago: pago.tipoPago,
                monto: Number(pago.monto),
                fecha: pago.fecha ? pago.fecha.split('T')[0] : hoyStr,
                metodoPago: pago.metodoPago,
                descripcion: pago.descripcion || '',
                urlComprobante: pago.urlComprobante || ''
            });
            handleChoferChange(pago.choferId.toString());
        } else {
            setModoEdicion(false);
            setPagoSeleccionado(null);
            setResumenChoferSeleccionado(null);
            setViajesChofer([]);
            const primerChofer = choferes[0];
            setFormData({
                ...formInicial,
                choferId: primerChofer ? primerChofer.id.toString() : ''
            });
            if (primerChofer) {
                handleChoferChange(primerChofer.id.toString());
            }
        }
        setArchivoComprobante(null);
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!formData.choferId) {
                toast.error('Selecciona un conductor');
                return;
            }

            const montoNum = Number(formData.monto);
            if (isNaN(montoNum) || montoNum <= 0) {
                toast.error('El monto debe ser mayor a 0');
                return;
            }

            const payload = {
                ...formData,
                choferId: Number(formData.choferId),
                viajeId: formData.viajeId ? Number(formData.viajeId) : null,
                monto: montoNum,
            };

            const cuerpo = conArchivo(payload, archivoComprobante);
            if (modoEdicion && pagoSeleccionado) {
                await pagoChoferService.actualizar(pagoSeleccionado.id, cuerpo);
                toast.success('Pago actualizado correctamente');
            } else {
                await pagoChoferService.crear(cuerpo);
                toast.success('Pago a chofer registrado exitosamente');
            }

            setArchivoComprobante(null);
            setModalOpen(false);
            cargarPagos();
        } catch (error: any) {
            toast.error(mensajeError(error, 'Error al procesar el pago'));
        }
    };

    const confirmarEliminacion = (id: number) => {
        setPagoToDelete(id);
        setShowDeleteModal(true);
    };

    const eliminarPago = async () => {
        if (!pagoToDelete) return;
        try {
            await axios.delete(`/pagos-choferes/${pagoToDelete}`);
            toast.success('Pago eliminado');
            cargarPagos();
        } catch (error: any) {
            toast.error(mensajeError(error, 'Error al eliminar'));
        } finally {
            setPagoToDelete(null);
        }
    };

    const verDetalle = (p: PagoChofer) => {
        setPagoDetalle(p);
        setDetalleOpen(true);
    };

    const formatearMoneda = (valor: number) => {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(valor);
    };

    // Resúmenes locales
    const totalPagado = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const totalAnticipos = pagos.filter(p => p.tipoPago === 'ANTICIPO').reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const totalSueldos = pagos.filter(p => p.tipoPago === 'SUELDO_MENSUAL').reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const totalPorViaje = pagos.filter(p => p.tipoPago === 'POR_VIAJE' || p.tipoPago === 'LIQUIDACION').reduce((acc, p) => acc + Number(p.monto || 0), 0);

    const getTipoPagoBadge = (tipo: string) => {
        switch (tipo) {
            case 'SUELDO_MENSUAL':
                return <span className="badge badge-info flex items-center gap-1 font-semibold">Sueldo Mensual</span>;
            case 'POR_VIAJE':
                return <span className="badge badge-success flex items-center gap-1 font-semibold">Pago por Viaje</span>;
            case 'ANTICIPO':
                return <span className="badge badge-warning flex items-center gap-1 font-semibold">Anticipo en Ruta</span>;
            case 'LIQUIDACION':
                return <span className="badge bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 font-semibold">Liquidación Final</span>;
            default:
                return <span className="badge">{tipo}</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
                            <Banknote className="h-7 w-7" />
                        </div>
                        Pagos a Choferes y Nómina
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Control de nómina, liquidación de viajes, anticipos de ruta y balances de cuenta corriente por conductor.
                    </p>
                </div>
                {esAdmin && (
                    <button
                        onClick={() => abrirModal()}
                        className="btn btn-primary"
                    >
                        <Plus className="h-5 w-5" />
                        Registrar Pago a Chofer
                    </button>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card-stat card-stat-emerald">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-500 text-sm font-medium">Nómina Total Desembolsada</span>
                        <div className="card-stat-icon card-stat-icon-emerald">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </div>
                    <span className="card-stat-value">{formatearMoneda(totalPagado)}</span>
                    <span className="text-xs text-slate-400 mt-1 block">Total acumulado en registros</span>
                </div>

                <div className="card-stat card-stat-amber">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-500 text-sm font-medium">Anticipos en Ruta</span>
                        <div className="card-stat-icon card-stat-icon-amber">
                            <Wallet className="h-5 w-5" />
                        </div>
                    </div>
                    <span className="card-stat-value text-amber-600">{formatearMoneda(totalAnticipos)}</span>
                    <span className="text-xs text-slate-400 mt-1 block">Adelantos pendientes de cuadre</span>
                </div>

                <div className="card-stat card-stat-blue">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-500 text-sm font-medium">Sueldos Mensuales Fijos</span>
                        <div className="card-stat-icon card-stat-icon-blue">
                            <CreditCard className="h-5 w-5" />
                        </div>
                    </div>
                    <span className="card-stat-value text-indigo-600">{formatearMoneda(totalSueldos)}</span>
                    <span className="text-xs text-slate-400 mt-1 block">Conductores bajo relación fija</span>
                </div>

                <div className="card-stat card-stat-violet">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-500 text-sm font-medium">Pagos por Viaje / Liq.</span>
                        <div className="card-stat-icon card-stat-icon-violet">
                            <Route className="h-5 w-5" />
                        </div>
                    </div>
                    <span className="card-stat-value text-purple-600">{formatearMoneda(totalPorViaje)}</span>
                    <span className="text-xs text-slate-400 mt-1 block">Fletes completados</span>
                </div>
            </div>

            {/* Filtros */}
            <div className="card p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por chofer, cédula, concepto..."
                            value={filtros.busqueda}
                            onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                            className="form-input pl-9 text-sm"
                        />
                    </div>

                    <div>
                        <select
                            value={filtros.choferId}
                            onChange={(e) => setFiltros({ ...filtros, choferId: e.target.value })}
                            className="form-select text-sm"
                        >
                            <option value="">Todos los Conductores</option>
                            {choferes.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.nombres} {c.apellidos} ({c.documentoId})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <select
                            value={filtros.tipoPago}
                            onChange={(e) => setFiltros({ ...filtros, tipoPago: e.target.value })}
                            className="form-select text-sm"
                        >
                            <option value="">Todos los Tipos de Pago</option>
                            <option value="SUELDO_MENSUAL">Sueldo Mensual</option>
                            <option value="POR_VIAJE">Pago por Viaje</option>
                            <option value="ANTICIPO">Anticipo</option>
                            <option value="LIQUIDACION">Liquidación Final</option>
                        </select>
                    </div>

                    <div>
                        <select
                            value={filtros.metodoPago}
                            onChange={(e) => setFiltros({ ...filtros, metodoPago: e.target.value })}
                            className="form-select text-sm"
                        >
                            <option value="">Todos los Métodos</option>
                            <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="TARJETA">Tarjeta</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabla de Pagos */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Conductor</th>
                            <th>Tipo de Pago</th>
                            <th>Viaje Vinculado</th>
                            <th>Fecha</th>
                            <th>Método de Pago</th>
                            <th>Monto</th>
                            <th className="text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
                                    <p className="text-slate-500 text-sm mt-2">Cargando pagos...</p>
                                </td>
                            </tr>
                        ) : pagos.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12">
                                    <Banknote className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-600 font-medium">No se encontraron pagos registrados</p>
                                    <p className="text-slate-400 text-xs mt-1">Registra desembolsos o anticipos para iniciar el control</p>
                                </td>
                            </tr>
                        ) : (
                            pagos.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td>
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                                                <Users className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-900 block text-sm">
                                                    {p.chofer?.nombres} {p.chofer?.apellidos}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    C.I: {p.chofer?.documentoId} • {p.chofer?.modalidadPago === 'MENSUAL' ? 'Mensual' : 'Por Viaje'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {getTipoPagoBadge(p.tipoPago)}
                                    </td>
                                    <td>
                                        {p.viaje ? (
                                            <div className="text-xs">
                                                <span className="font-semibold text-slate-800 flex items-center gap-1">
                                                    <Route className="h-3 w-3 text-indigo-500" />
                                                    {p.viaje.origen} → {p.viaje.destino}
                                                </span>
                                                <span className="text-slate-400 text-[11px]">
                                                    Viaje #{p.viaje.id} • Tarifa: {formatearMoneda(Number(p.viaje.tarifa))}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">Nómina General / Sin viaje</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            {new Date(p.fecha).toLocaleDateString('es-EC')}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="text-xs">
                                            <span className="font-medium text-slate-800 block">
                                                {p.metodoPago}
                                            </span>
                                            {p.metodoPago === 'TRANSFERENCIA' && p.chofer?.banco && (
                                                <span className="text-slate-500 text-[11px]">
                                                    {p.chofer.banco} ({p.chofer.numeroCuenta || 'S/N'})
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-base font-bold text-emerald-600 block">
                                            {formatearMoneda(Number(p.monto))}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => verDetalle(p)}
                                                className="btn-ghost p-1.5 text-slate-500 hover:text-indigo-600"
                                                title="Ver Comprobante / Detalle"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            {esAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => abrirModal(p)}
                                                        className="btn-ghost p-1.5 text-slate-500 hover:text-amber-600"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmarEliminacion(p.id)}
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
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <Banknote className="h-5 w-5" />
                                </div>
                                <h3 className="modal-title">
                                    {modoEdicion ? 'Editar Registro de Pago' : 'Nuevo Pago a Conductor'}
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
                                {/* Conductor */}
                                <div>
                                    <label className="form-label">Conductor / Chofer *</label>
                                    <select
                                        value={formData.choferId}
                                        onChange={(e) => handleChoferChange(e.target.value)}
                                        required
                                        className="form-select"
                                    >
                                        <option value="">Selecciona un chofer</option>
                                        {choferes.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.nombres} {c.apellidos} - Cédula: {c.documentoId} ({c.modalidadPago === 'MENSUAL' ? `Sueldo: $${Number(c.sueldoMensual || 0)}` : 'Por Viaje'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Tarjeta Informativa de Balance del Chofer */}
                                {resumenChoferSeleccionado && (
                                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-md">
                                        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                            <Wallet className="h-4 w-4 text-emerald-600" />
                                            Estado de Cuenta del Conductor
                                        </h5>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                            <div className="bg-white p-2 rounded-lg border border-slate-100">
                                                <span className="text-slate-400 block">Total Pagado</span>
                                                <span className="font-bold text-slate-900">{formatearMoneda(resumenChoferSeleccionado.pagos.totalPagado)}</span>
                                            </div>
                                            <div className="bg-white p-2 rounded-lg border border-slate-100">
                                                <span className="text-slate-400 block">Anticipos Dados</span>
                                                <span className="font-bold text-amber-600">{formatearMoneda(resumenChoferSeleccionado.pagos.totalAnticipos)}</span>
                                            </div>
                                            <div className="bg-white p-2 rounded-lg border border-slate-100">
                                                <span className="text-slate-400 block">Viajes Realizados</span>
                                                <span className="font-bold text-indigo-600">{resumenChoferSeleccionado.viajes.completados} viajes</span>
                                            </div>
                                            <div className="bg-white p-2 rounded-lg border border-slate-100">
                                                <span className="text-slate-400 block">Banco Registrado</span>
                                                <span className="font-bold text-slate-800 truncate block">
                                                    {resumenChoferSeleccionado.chofer.banco || 'No registrado'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tipo de Pago y Viaje Asociado */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="form-label">Tipo de Pago *</label>
                                        <select
                                            value={formData.tipoPago}
                                            onChange={(e) => setFormData({ ...formData, tipoPago: e.target.value as any })}
                                            className="form-select"
                                        >
                                            <option value="POR_VIAJE">Pago por Viaje (Honorarios de ruta)</option>
                                            <option value="ANTICIPO">Anticipo / Adelanto de Viáticos</option>
                                            <option value="SUELDO_MENSUAL">Sueldo Mensual Base</option>
                                            <option value="LIQUIDACION">Liquidación de Periodo</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="form-label">Vincular a Viaje (Opcional)</label>
                                        <select
                                            value={formData.viajeId}
                                            onChange={(e) => setFormData({ ...formData, viajeId: e.target.value })}
                                            className="form-select"
                                        >
                                            <option value="">Sin viaje asociado (Nómina general)</option>
                                            {viajesChofer.map(v => (
                                                <option key={v.id} value={v.id}>
                                                    #{v.id} - {v.origen} → {v.destino} ({v.estado})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Monto y Fecha */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="form-label">Monto a Desembolsar ($) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={formData.monto}
                                            onChange={(e) => setFormData({ ...formData, monto: Number(e.target.value) })}
                                            required
                                            className="form-input text-lg font-bold text-emerald-600"
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Fecha del Pago *</label>
                                        <input
                                            type="date"
                                            value={formData.fecha}
                                            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                            required
                                            className="form-input"
                                        />
                                    </div>
                                </div>

                                {/* Método de Pago */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="form-label">Método de Pago *</label>
                                        <select
                                            value={formData.metodoPago}
                                            onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value as any })}
                                            className="form-select"
                                        >
                                            <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                                            <option value="EFECTIVO">Efectivo en Caja</option>
                                            <option value="TARJETA">Tarjeta / Débito Corporativo</option>
                                        </select>
                                    </div>

                                    <SelectorComprobante
                                        archivo={archivoComprobante}
                                        onChange={setArchivoComprobante}
                                        urlActual={modoEdicion ? formData.urlComprobante : null}
                                    />
                                </div>

                                {/* Descripción / Concepto */}
                                <div>
                                    <label className="form-label">Concepto / Glosa del Pago</label>
                                    <textarea
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                        placeholder="Ej: Pago de liquidación viaje Guayaquil-Quito o Anticipo combustible ruta norte..."
                                        rows={2}
                                        className="form-input"
                                    />
                                </div>
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
                                    {modoEdicion ? 'Actualizar Pago' : 'Emitir Pago al Chofer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Detalle / Recibo de Pago */}
            {detalleOpen && pagoDetalle && (
                <div className="modal-overlay" onClick={() => setDetalleOpen(false)}>
                    <div
                        className="modal-content max-w-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-md">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="modal-title">Comprobante de Egreso # {pagoDetalle.id}</h3>
                                    <p className="text-xs text-slate-500">
                                        Fecha: {new Date(pagoDetalle.fecha).toLocaleDateString('es-EC')}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setDetalleOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="modal-body space-y-4">
                            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Beneficiario:</span>
                                    <span className="font-bold text-slate-900">{pagoDetalle.chofer?.nombres} {pagoDetalle.chofer?.apellidos}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Documento de Identidad:</span>
                                    <span className="font-semibold text-slate-800">{pagoDetalle.chofer?.documentoId}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Tipo de Pago:</span>
                                    <span className="font-semibold text-slate-800">{pagoDetalle.tipoPago.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Método de Desembolso:</span>
                                    <span className="font-semibold text-slate-800">{pagoDetalle.metodoPago}</span>
                                </div>
                                {pagoDetalle.chofer?.banco && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Cuenta Bancaria:</span>
                                        <span className="font-semibold text-slate-800">{pagoDetalle.chofer.banco} - {pagoDetalle.chofer.numeroCuenta}</span>
                                    </div>
                                )}
                                {pagoDetalle.viaje && (
                                    <div className="flex justify-between text-xs pt-2 border-t border-slate-200">
                                        <span className="text-slate-500">Viaje Aplicado:</span>
                                        <span className="font-bold text-indigo-600">#{pagoDetalle.viaje.id} ({pagoDetalle.viaje.origen} → {pagoDetalle.viaje.destino})</span>
                                    </div>
                                )}
                            </div>

                            {pagoDetalle.descripcion && (
                                <div>
                                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Concepto del Pago</h5>
                                    <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-100">
                                        {pagoDetalle.descripcion}
                                    </p>
                                </div>
                            )}

                            <div className="bg-emerald-50 p-4 rounded-md border border-emerald-100 flex justify-between items-center">
                                <div>
                                    <span className="text-xs text-emerald-800 font-semibold block">Monto Total Liquidado</span>
                                    <span className="text-3xl font-bold text-emerald-700">
                                        {formatearMoneda(Number(pagoDetalle.monto))}
                                    </span>
                                </div>
                                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md">
                                    <CheckCircle className="h-6 w-6" />
                                </div>
                            </div>

                            {pagoDetalle.urlComprobante && (
                                <div className="text-center pt-2">
                                    <a
                                        href={pagoDetalle.urlComprobante}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        Ver Documento Adjunto / Voucher
                                    </a>
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
                onConfirm={eliminarPago}
                title="Eliminar Pago a Conductor"
                message="¿Estás seguro de que deseas anular este registro de pago? Esta acción alterará el balance contable del chofer y quedará registrada en auditoría."
                confirmText="Anular Pago"
                cancelText="Conservar"
                type="danger"
            />
        </div>
    );
};

export default PagosChoferes;
