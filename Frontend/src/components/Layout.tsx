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
    Menu,
    ChevronRight,
    ShieldCheck,
    User,
    Route
} from 'lucide-react';

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

    // Definir todos los items de menú con sus roles permitidos
    const allMenuItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/vehiculos', icon: Truck, label: 'Vehículos', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/choferes', icon: Users, label: 'Choferes', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/clientes', icon: BriefcaseBusiness, label: 'Clientes', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/materiales', icon: Package, label: 'Materiales', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/viajes', icon: Route, label: 'Viajes', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/auditoria', icon: ShieldCheck, label: 'Auditoría', roles: ['AUDITOR'] }, // SOLO AUDITOR
    ];

    // Filtrar menú según rol del usuario
    const menuItems = allMenuItems.filter(item =>
        item.roles.includes(usuario?.rol || '')
    );

    const getPageTitle = () => {
        const item = allMenuItems.find(item => item.path === location.pathname);
        return item ? item.label : 'Transporte';
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* Sidebar Backdrop (Mobile) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:sticky top-0 left-0 z-30 h-screen w-72 sidebar-dark transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
                    }`}
            >
                <div className="h-full flex flex-col">
                    {/* Logo Area */}
                    <div className="h-16 flex items-center px-6 border-b border-slate-800/50 mb-2">
                        <div className={`flex items-center gap-3 transition-opacity duration-300 ${!isSidebarOpen && 'lg:justify-center w-full'}`}>
                            <div className="bg-indigo-600 rounded-lg p-1.5 shadow-lg shadow-indigo-500/20">
                                <Truck className="h-5 w-5 text-white" />
                            </div>
                            <div className={`${!isSidebarOpen && 'lg:hidden'}`}>
                                <h1 className="text-lg font-bold text-white tracking-tight">Fleet<span className="text-indigo-400">Master</span></h1>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {menuItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                title={!isSidebarOpen ? item.label : ''}
                                className={({ isActive }) =>
                                    `sidebar-link group ${isActive ? 'active' : ''
                                    } ${!isSidebarOpen ? 'justify-center px-2' : ''}`
                                }
                            >
                                <item.icon className={`transition-all duration-200 shrink-0 ${!isSidebarOpen ? 'w-7 h-7' : 'w-5 h-5'}`} />
                                <span className={`${!isSidebarOpen && 'lg:hidden'} font-medium text-sm transition-opacity duration-200`}>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* User Profile */}
                    <div className="p-4 border-t border-slate-800/50">
                        <div className={`flex items-center justify-between transition-all ${!isSidebarOpen ? 'flex-col gap-4 p-2' : 'px-2'}`}>
                            <div className={`flex items-center gap-3 ${!isSidebarOpen ? 'justify-center' : ''}`}>
                                <div className="bg-slate-800 p-2 rounded-full">
                                    <User className="h-4 w-4 text-slate-400" />
                                </div>
                                <div className={`${!isSidebarOpen && 'lg:hidden'} overflow-hidden`}>
                                    <p className="text-sm font-semibold text-slate-200 truncate">{usuario?.nombreCompleto || 'Usuario'}</p>
                                    <p className="text-xs text-slate-500 truncate capitalize">{usuario?.rol.toLowerCase()}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowLogoutModal(true)}
                                title="Cerrar Sesión"
                                className={`text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors ${!isSidebarOpen ? 'w-full flex justify-center' : ''}`}
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                {/* Header (Top Bar) */}
                <header className="glass-header h-20 sticky top-0 z-20 flex items-center justify-between px-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        {/* Breadcrumb-like title */}
                        {/* Page Title */}
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                            <h2 className="font-semibold text-slate-800 text-lg">{getPageTitle()}</h2>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="hidden lg:flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                        {isSidebarOpen ? <Menu className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                </header>

                {/* Content Area */}
                <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
                    <Outlet />
                </div>
            </main>

            {/* Modal de confirmación de logout */}
            <ConfirmModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogout}
                title="Cerrar Sesión"
                message="¿Estás seguro de que deseas cerrar tu sesión? Deberás iniciar sesión nuevamente para acceder al sistema."
                confirmText="Cerrar Sesión"
                cancelText="Cancelar"
                type="info"
            />
        </div>
    );
};

export default Layout;
