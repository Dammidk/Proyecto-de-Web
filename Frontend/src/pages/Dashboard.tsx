import { useEffect, useState } from 'react';
import axios from '../services/api';
import {
    Truck,
    Users,
    BriefcaseBusiness,
    Package,
    ArrowUpRight,
    Activity,
    AlertCircle
} from 'lucide-react';

interface DashboardStats {
    vehiculos: { activos: number; total: number };
    choferes: { activos: number; total: number };
    clientes: { activos: number; total: number };
    materiales: { total: number };
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
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            trend: 'Operativos'
        },
        {
            title: 'Choferes Disponibles',
            value: `${stats?.choferes.activos || 0}`,
            total: `${stats?.choferes.total || 0} Total`,
            icon: Users,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            trend: 'En servicio'
        },
        {
            title: 'Clientes Activos',
            value: `${stats?.clientes.activos || 0}`,
            total: `${stats?.clientes.total || 0} Registrados`,
            icon: BriefcaseBusiness,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
            trend: 'Cartera actual'
        },
        {
            title: 'Materiales',
            value: `${stats?.materiales.total || 0}`,
            total: 'Tipos registrados',
            icon: Package,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
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
                    <div key={index} className="card group hover:scale-[1.02] transition-transform duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl ${card.bg} ${card.color} shadow-sm group-hover:shadow-md transition-shadow`}>
                                <card.icon className="h-6 w-6" />
                            </div>
                            <span className="flex items-center text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                                <Activity className="h-3 w-3 mr-1" />
                                {card.trend}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-slate-500 text-sm font-medium mb-1">{card.title}</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-slate-900">{card.value}</span>
                                <span className="text-xs text-slate-400 font-medium">/ {card.total}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions & Recent (Placeholder for future) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card h-64 flex flex-col items-center justify-center text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                        <Activity className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-slate-900 font-medium">Actividad Reciente</h3>
                    <p className="text-slate-500 text-sm max-w-xs mt-2">
                        El historial de viajes y movimientos aparecerá aquí en próximas actualizaciones.
                    </p>
                </div>

                <div className="card h-64 flex flex-col justify-center p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-lg">
                    <h3 className="text-xl font-bold mb-2">Estado del Sistema</h3>
                    <ul className="space-y-4 mt-4">
                        <li className="flex items-center gap-3 text-slate-300 text-sm">
                            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"></div>
                            Servidor Backend Conectado
                        </li>
                        <li className="flex items-center gap-3 text-slate-300 text-sm">
                            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"></div>
                            Base de Datos Sincronizada
                        </li>
                        <li className="flex items-center gap-3 text-slate-300 text-sm">
                            <div className="h-2 w-2 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50"></div>
                            v1.0.0 - Entrega 1 Completada
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
