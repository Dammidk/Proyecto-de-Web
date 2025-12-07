// Componente de Ruta Protegida
// Redirige al login si no hay sesión activa

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
    const { token, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center">
                    <div className="spinner w-12 h-12 mx-auto mb-4"></div>
                    <p className="text-slate-400">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
