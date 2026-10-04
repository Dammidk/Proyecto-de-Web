// Inicio de sesión institucional
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, Route, Wrench, Receipt, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const CAPACIDADES = [
    { icono: Route, titulo: 'Operación de transporte', texto: 'Viajes, liquidación, cumplimiento documental y rentabilidad por ruta.' },
    { icono: Wrench, titulo: 'Mantenimiento y neumáticos', texto: 'Preventivos, kardex de repuestos y control de llantas por posición.' },
    { icono: Receipt, titulo: 'Facturación y cartera', texto: 'Cuentas por cobrar, antigüedad de saldos y control de mora.' },
    { icono: ShieldCheck, titulo: 'Trazabilidad', texto: 'Cada cambio queda registrado con usuario, fecha y dirección de origen.' },
];

const CUENTAS_DEMO = [
    { rol: 'Administrador', usuario: 'admin', clave: 'admin123' },
    { rol: 'Auditor (solo lectura)', usuario: 'auditor', clave: 'auditor123' },
];

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
            navigate('/');
        } catch (err: any) {
            toast.error(err.response?.data?.mensaje || 'Credenciales inválidas');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] bg-white">
            <aside className="hidden lg:flex flex-col justify-between px-14 py-12 text-white" style={{ background: '#0e1b30' }}>
                <div className="flex items-center gap-3">
                    <img src="/favicon.svg" alt="" className="h-9 w-9" />
                    <div>
                        <p className="text-lg font-semibold leading-tight">FleetMaster</p>
                        <p className="text-xs uppercase leading-tight" style={{ color: '#6f84a6', letterSpacing: '0.1em' }}>Gestión de flota</p>
                    </div>
                </div>

                <div className="max-w-lg">
                    <h1 className="text-3xl font-semibold leading-snug text-white">
                        Control integral de la operación de transporte de carga
                    </h1>
                    <p className="mt-4 text-sm leading-relaxed" style={{ color: '#9fb2cf' }}>
                        Una sola plataforma para la operación, el taller, la flota y las finanzas,
                        con reglas de negocio aplicadas y auditoría de cada movimiento.
                    </p>

                    <ul className="mt-10 space-y-5">
                        {CAPACIDADES.map(c => (
                            <li key={c.titulo} className="flex gap-4">
                                <c.icono className="h-5 w-5 mt-0.5 shrink-0" style={{ color: '#6f9fe0' }} strokeWidth={1.75} />
                                <div>
                                    <p className="text-sm font-medium text-white">{c.titulo}</p>
                                    <p className="text-sm" style={{ color: '#9fb2cf' }}>{c.texto}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-xs" style={{ color: '#6f84a6' }}>
                    {new Date().getFullYear()} FleetMaster. Uso restringido a personal autorizado.
                </p>
            </aside>

            <main className="flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm">
                    <div className="lg:hidden flex items-center gap-3 mb-10">
                        <img src="/favicon.svg" alt="" className="h-9 w-9" />
                        <p className="text-lg font-semibold text-slate-900">FleetMaster</p>
                    </div>

                    <p className="page-kicker">Acceso al sistema</p>
                    <h2 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h2>
                    <p className="mt-1 text-sm text-slate-500">Ingrese con las credenciales asignadas por su administrador.</p>

                    <form onSubmit={handleSubmit} className="mt-8">
                        <div className="form-group">
                            <label htmlFor="login-usuario" className="form-label">Usuario</label>
                            <input
                                id="login-usuario"
                                type="text"
                                value={usuario}
                                onChange={e => setUsuario(e.target.value)}
                                className="form-input"
                                autoComplete="username"
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="login-password" className="form-label">Contraseña</label>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="form-input pr-10"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 p-1"
                                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <button id="login-submit" type="submit" disabled={loading} className="btn btn-primary w-full py-2.5 mt-2">
                            {loading ? <><Loader2 size={16} className="animate-spin" /> Verificando</> : 'Ingresar'}
                        </button>
                    </form>

                    <div className="mt-10 border-t border-slate-200 pt-5">
                        <p className="text-xs font-semibold uppercase text-slate-500" style={{ letterSpacing: '0.06em' }}>
                            Cuentas de demostración
                        </p>
                        <ul className="mt-3 divide-y divide-slate-100 border border-slate-200 rounded-md">
                            {CUENTAS_DEMO.map(c => (
                                <li key={c.usuario}>
                                    <button
                                        type="button"
                                        onClick={() => { setUsuario(c.usuario); setPassword(c.clave); }}
                                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
                                    >
                                        <span className="text-sm text-slate-700">{c.rol}</span>
                                        <span className="text-xs font-mono text-slate-500">{c.usuario} / {c.clave}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-2 text-xs text-slate-500">Seleccione una cuenta para completar el formulario.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
