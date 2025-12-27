import { useEffect, useState } from 'react';
import axios from '../services/api';
import {
    Truck,
    Users,
    BriefcaseBusiness,
    Package,
    Activity,
    AlertCircle,
    Route,
    DollarSign,
    TrendingUp
} from 'lucide-react';

interface DashboardStats {
    vehiculos: { activos: number; total: number };
    choferes: { activos: number; total: number };
    clientes: { activos: number; total: number };
    materiales: { total: number };
    viajesMes?: {
        total: number;
        completados: number;
        ingresosTotal: number;
        gastosTotales: number;
        gananciaEstimada: number;
    };
}

const Dashboard = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/dashboard');
            setStats(data.resumen);
        } catch (err) {
            setError('No se pudo cargar la información del dashboard.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatearMoneda = (valor: number) => {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(valor);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="spinner h-10 w-10 border-4 border-t-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 bg-rose-50 rounded-3xl border border-rose-100">
                <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
                <h3 className="text-lg font-semibold text-rose-800">Error de Conexión</h3>
                <p className="text-rose-600 mt-2 max-w-md">{error}</p>
                <button onClick={fetchDashboard} className="mt-6 btn btn-secondary text-sm">
                    Intentar nuevamente
                </button>
            </div>
        );
    }

    const cards = [
        {
            title: 'Vehículos Activos',
            value: `${stats?.vehiculos.activos || 0}`,
            total: `${stats?.vehiculos.total || 0} Total`,
            icon: Truck,
            colorName: 'blue',
            trend: 'Operativos'
        },
        {
            title: 'Choferes Disponibles',
            value: `${stats?.choferes.activos || 0}`,
            total: `${stats?.choferes.total || 0} Total`,
            icon: Users,
            colorName: 'emerald',
            trend: 'En servicio'
        },
        {
            title: 'Clientes Activos',
            value: `${stats?.clientes.activos || 0}`,
            total: `${stats?.clientes.total || 0} Registrados`,
            icon: BriefcaseBusiness,
            colorName: 'violet',
            trend: 'Cartera actual'
        },
        {
            title: 'Materiales',
            value: `${stats?.materiales.total || 0}`,
            total: 'Tipos registrados',
            icon: Package,
            colorName: 'amber',
            trend: 'Catálogo'
        }
    ];

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Resumen General</h2>
                <p className="text-slate-500 mt-2">Bienvenido al panel de control de FleetMaster.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, index) => (
                    <div key={index} className={`card-stat card-stat-${card.colorName}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`card-stat-icon card-stat-icon-${card.colorName}`}>
                                <card.icon className="h-7 w-7" />
                            </div>
                            <span className="flex items-center text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                                <Activity className="h-3 w-3 mr-1" />
                                {card.trend}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-slate-500 text-sm font-medium mb-1">{card.title}</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="card-stat-value">{card.value}</span>
                                <span className="text-sm text-slate-400 font-medium">/ {card.total}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Viajes del Mes */}
            {stats?.viajesMes && (
                <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-4">📊 Viajes del Mes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="card bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
                            <Route className="h-8 w-8 mb-2 opacity-80" />
                            <p className="text-indigo-100 text-sm">Viajes Totales</p>
                            <p className="text-3xl font-bold">{stats.viajesMes.total}</p>
                            <p className="text-indigo-200 text-xs mt-1">{stats.viajesMes.completados} completados</p>
                        </div>
                        <div className="card bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
                            <DollarSign className="h-8 w-8 mb-2 opacity-80" />
                            <p className="text-emerald-100 text-sm">Ingresos</p>
                            <p className="text-3xl font-bold">{formatearMoneda(stats.viajesMes.ingresosTotal)}</p>
                            <p className="text-emerald-200 text-xs mt-1">Tarifas cobradas</p>
                        </div>
                        <div className="card bg-gradient-to-br from-rose-500 to-rose-600 text-white border-0">
                            <TrendingUp className="h-8 w-8 mb-2 opacity-80 rotate-180" />
                            <p className="text-rose-100 text-sm">Gastos</p>
                            <p className="text-3xl font-bold">{formatearMoneda(stats.viajesMes.gastosTotales)}</p>
                            <p className="text-rose-200 text-xs mt-1">Viáticos y costos</p>
                        </div>
                        <div className={`card border-0 ${stats.viajesMes.gananciaEstimada >= 0 ? 'bg-gradient-to-br from-cyan-500 to-cyan-600' : 'bg-gradient-to-br from-slate-600 to-slate-700'} text-white`}>
                            <TrendingUp className="h-8 w-8 mb-2 opacity-80" />
                            <p className={`text-sm ${stats.viajesMes.gananciaEstimada >= 0 ? 'text-cyan-100' : 'text-slate-300'}`}>Ganancia Estimada</p>
                            <p className="text-3xl font-bold">{formatearMoneda(stats.viajesMes.gananciaEstimada)}</p>
                            <p className={`text-xs mt-1 ${stats.viajesMes.gananciaEstimada >= 0 ? 'text-cyan-200' : 'text-slate-400'}`}>
                                {stats.viajesMes.ingresosTotal > 0
                                    ? `${((stats.viajesMes.gananciaEstimada / stats.viajesMes.ingresosTotal) * 100).toFixed(1)}% margen`
                                    : 'Sin viajes'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default Dashboard;
