// Login - Diseño Limpio
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, Eye, EyeOff, Loader2 } from 'lucide-react';
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-xl mb-4">
                        <Truck className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-xl font-semibold text-gray-900">FleetMaster</h1>
                    <p className="text-sm text-gray-500 mt-1">Sistema de Gestión de Transporte</p>
                </div>

                {/* Form */}
                <div className="card">
                    <div className="card-body">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="form-label">Usuario</label>
                                <input type="text" value={usuario} onChange={e => setUsuario(e.target.value)} className="form-input" placeholder="Ingrese su usuario" autoFocus />
                            </div>
                            <div>
                                <label className="form-label">Contraseña</label>
                                <div className="relative">
                                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="form-input pr-10" placeholder="••••••••" />
                                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="btn btn-primary w-full">
                                {loading ? <><Loader2 size={18} className="animate-spin" /> Ingresando...</> : 'Ingresar'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Credenciales */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => { setUsuario('admin'); setPassword('admin123'); }} className="p-3 bg-white border border-gray-200 rounded-lg text-left hover:border-blue-300 transition-colors">
                        <p className="text-sm font-medium text-gray-900">Admin</p>
                        <p className="text-xs text-gray-500">admin / admin123</p>
                    </button>
                    <button type="button" onClick={() => { setUsuario('auditor'); setPassword('auditor123'); }} className="p-3 bg-white border border-gray-200 rounded-lg text-left hover:border-green-300 transition-colors">
                        <p className="text-sm font-medium text-gray-900">Auditor</p>
                        <p className="text-xs text-gray-500">auditor / auditor123</p>
                    </button>
                </div>
            </div>
        </div>
    );
}
