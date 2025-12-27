// Login - Diseño Profesional
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, Eye, EyeOff, Loader2, ShieldCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usuario || !password) { toast.error('Ingrese usuario y contraseña'); return; }
        setLoading(true);
        try {
            await login(usuario, password);
            toast.success('Bienvenido');
            navigate('/');
        } catch (err: any) {
            toast.error(err.response?.data?.mensaje || 'Credenciales inválidas');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl mb-4 shadow-xl shadow-indigo-500/30">
                        <Truck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">FleetMaster</h1>
                    <p className="text-sm text-slate-400 mt-1">Sistema de Gestión de Transporte</p>
                </div>

                {/* Form */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
                    <h2 className="text-xl font-bold text-slate-800 text-center mb-6">Iniciar Sesión</h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="form-label">Usuario</label>
                            <input
                                type="text"
                                value={usuario}
                                onChange={e => setUsuario(e.target.value)}
                                className="form-input"
                                placeholder="Ingrese su usuario"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="form-label">Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="form-input pr-12"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                >
                                    {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-base">
                            {loading ? <><Loader2 size={20} className="animate-spin" /> Ingresando...</> : 'Ingresar'}
                        </button>
                    </form>
                </div>

                {/* Credenciales Demo */}
                <div className="mt-6">
                    <p className="text-center text-slate-400 text-xs mb-3">Acceso rápido (Demo)</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => { setUsuario('admin'); setPassword('admin123'); }}
                            className="p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-left hover:bg-white/20 transition-colors group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                                <p className="text-sm font-semibold text-white">Admin</p>
                            </div>
                            <p className="text-xs text-slate-400">admin / admin123</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setUsuario('auditor'); setPassword('auditor123'); }}
                            className="p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-left hover:bg-white/20 transition-colors group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4 text-emerald-400" />
                                <p className="text-sm font-semibold text-white">Auditor</p>
                            </div>
                            <p className="text-xs text-slate-400">auditor / auditor123</p>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-xs mt-8">
                    © 2024 FleetMaster. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}

