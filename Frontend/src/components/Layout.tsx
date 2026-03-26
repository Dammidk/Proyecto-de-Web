import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';
import {
    LayoutDashboard,
    Truck,
    Users,
    BriefcaseBusiness,
    Package,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
    Menu,
    ShieldCheck,
    Route,
    Wrench,
    Banknote,
    BarChart3,
    FileCheck2,
    CircleDot,
    Receipt,
    Boxes,
    Building2,
} from 'lucide-react';

interface ItemMenu {
    path: string;
    icon: typeof Truck;
    label: string;
    roles: string[];
}

interface GrupoMenu {
    titulo: string;
    items: ItemMenu[];
}

const ETIQUETA_ROL: Record<string, string> = { ADMIN: 'Administrador', AUDITOR: 'Auditor' };

const GRUPOS: GrupoMenu[] = [
    {
        titulo: 'Resumen',
        items: [
            { path: '/dashboard', icon: LayoutDashboard, label: 'Panel de control', roles: ['ADMIN', 'AUDITOR'] },
            { path: '/analitica', icon: BarChart3, label: 'Analítica operativa', roles: ['ADMIN', 'AUDITOR'] },
        ],
    },
    {
        titulo: 'Operación',
        items: [
            { path: '/viajes', icon: Route, label: 'Viajes', roles: ['ADMIN', 'AUDITOR'] },
            { path: '/clientes', icon: BriefcaseBusiness, label: 'Clientes', roles: ['ADMIN', 'AUDITOR'] },
            { path: '/materiales', icon: Package, label: 'Materiales', roles: ['ADMIN', 'AUDITOR'] },
            { path: '/choferes', icon: Users, label: 'Conductores', roles: ['ADMIN', 'AUDITOR'] },
        ],
    },
    {
        titulo: 'Flota y taller',
        items: [
            { path: '/vehiculos', icon: Truck, label: 'Vehículos', roles: ['ADMIN', 'AUDITOR'] },
            { path: '/documentos', icon: FileCheck2, label: 'Cumplimiento documental', roles: ['ADMIN', 'AUDITOR'] },
            { path: '/neumaticos', icon: CircleDot, label: 'Neumáticos', roles: ['ADMIN', 'AUDITOR'] },
            { path: '/mantenimientos', icon: Wrench, label: 'Mantenimientos', roles: ['ADMIN', 'AUDITOR'] },
            { path: '/repuestos', icon: Boxes, label: 'Repuestos e inventario', roles: ['ADMIN', 'AUDITOR'] },
        ],
    },
    {
        titulo: 'Finanzas',
        items: [
            { path: '/cuentas-cobrar', icon: Receipt, label: 'Cuentas por cobrar', roles: ['ADMIN', 'AUDITOR'] },
            { path: '/pagos-choferes', icon: Banknote, label: 'Pagos a conductores', roles: ['ADMIN', 'AUDITOR'] },
        ],
    },
    {
        titulo: 'Administración',
        items: [
            { path: '/empresa', icon: Building2, label: 'Organización y plan', roles: ['ADMIN'] },
            { path: '/auditoria', icon: ShieldCheck, label: 'Registro de auditoría', roles: ['AUDITOR'] },
        ],
    },
];

const Layout = () => {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const rol = usuario?.rol || '';
    const grupos = GRUPOS
        .map(g => ({ ...g, items: g.items.filter(i => i.roles.includes(rol)) }))
        .filter(g => g.items.length > 0);

    const actual = GRUPOS.flatMap(g => g.items.map(i => ({ ...i, grupo: g.titulo })))
        .find(i => location.pathname.startsWith(i.path));
    const esLiquidacion = location.pathname.endsWith('/liquidacion');
    const tituloPagina = esLiquidacion ? 'Liquidación de viaje' : actual?.label ?? 'Panel de control';
    const seccion = esLiquidacion ? 'Operación' : actual?.grupo ?? 'Resumen';

    const ahora = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside
                className={`print:hidden fixed lg:sticky top-0 left-0 z-30 h-screen sidebar-dark transition-all duration-200 ${
                    isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-[4.25rem]'
                }`}
            >
                <div className="h-full flex flex-col">
                    <div className="h-16 flex items-center px-5 border-b" style={{ borderColor: '#1c2f4d' }}>
                        <div className={`flex items-center gap-3 ${!isSidebarOpen ? 'lg:justify-center w-full' : ''}`}>
                            <img src="/favicon.svg" alt="" className="h-8 w-8 shrink-0" />
                            <div className={!isSidebarOpen ? 'lg:hidden' : ''}>
                                <p className="text-[0.95rem] font-semibold text-white leading-tight">FleetMaster</p>
                                <p className="text-[0.6875rem] uppercase leading-tight" style={{ color: '#6f84a6', letterSpacing: '0.1em' }}>
                                    Gestión de flota
                                </p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 overflow-y-auto pb-4" aria-label="Navegación principal">
                        {grupos.map(grupo => (
                            <div key={grupo.titulo}>
                                <p className={`sidebar-group ${!isSidebarOpen ? 'lg:hidden' : ''}`}>{grupo.titulo}</p>
                                {!isSidebarOpen && <div className="hidden lg:block mx-4 mt-3 border-t" style={{ borderColor: '#1c2f4d' }} />}
                                {grupo.items.map(item => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        title={!isSidebarOpen ? item.label : ''}
                                        className={({ isActive }) =>
                                            `sidebar-link ${isActive ? 'active' : ''} ${!isSidebarOpen ? 'lg:justify-center lg:px-0' : ''}`
                                        }
                                    >
                                        <item.icon className="w-[1.125rem] h-[1.125rem] shrink-0" strokeWidth={1.75} />
                                        <span className={!isSidebarOpen ? 'lg:hidden' : ''}>{item.label}</span>
                                    </NavLink>
                                ))}
                            </div>
                        ))}
                    </nav>

                    <div className="border-t px-5 py-4" style={{ borderColor: '#1c2f4d' }}>
                        <div className={`flex items-center justify-between gap-3 ${!isSidebarOpen ? 'lg:flex-col' : ''}`}>
                            <div className={`min-w-0 ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
                                <p className="text-sm font-medium text-white truncate">{usuario?.nombreCompleto || 'Usuario'}</p>
                                <p className="text-xs truncate" style={{ color: '#6f84a6' }}>{ETIQUETA_ROL[rol] ?? rol}</p>
                            </div>
                            <button
                                onClick={() => setShowLogoutModal(true)}
                                title="Cerrar sesión"
                                aria-label="Cerrar sesión"
                                className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                                style={{ color: '#b4c2d8' }}
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0">
                <header className="print:hidden glass-header h-16">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md lg:hidden"
                            aria-label="Abrir menú"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="hidden lg:flex items-center justify-center p-2 -ml-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            aria-label={isSidebarOpen ? 'Contraer menú' : 'Expandir menú'}
                        >
                            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
                        </button>
                        <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm min-w-0">
                            <span className="text-slate-500 hidden sm:inline">{seccion}</span>
                            <span className="text-slate-300 hidden sm:inline">/</span>
                            <h2 className="font-semibold text-slate-900 truncate">{tituloPagina}</h2>
                        </nav>
                    </div>
                    <p className="hidden md:block text-xs text-slate-500 capitalize">{ahora}</p>
                </header>

                <div className="flex-1 px-6 py-6 lg:px-10 lg:py-8 max-w-[88rem] mx-auto w-full print:p-0 print:max-w-none">
                    <Outlet />
                </div>
            </main>

            <ConfirmModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogout}
                title="Cerrar sesión"
                message="Se cerrará la sesión actual. Deberá autenticarse nuevamente para acceder al sistema."
                confirmText="Cerrar sesión"
                cancelText="Cancelar"
                type="info"
            />
        </div>
    );
};

export default Layout;
