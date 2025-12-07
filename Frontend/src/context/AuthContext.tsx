// Contexto de Autenticación
// Maneja el estado global del usuario y token JWT

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/api';

interface Usuario {
    id: number;
    nombreUsuario: string;
    nombreCompleto: string;
    email: string;
    rol: 'ADMIN' | 'AUDITOR';
}

interface AuthContextType {
    usuario: Usuario | null;
    token: string | null;
    isLoading: boolean;
    isAdmin: boolean;
    login: (usuario: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Verificar si hay sesión guardada al cargar
    useEffect(() => {
        const tokenGuardado = localStorage.getItem('token');
        const usuarioGuardado = localStorage.getItem('usuario');

        if (tokenGuardado && usuarioGuardado) {
            setToken(tokenGuardado);
            setUsuario(JSON.parse(usuarioGuardado));
        }
        setIsLoading(false);
    }, []);

    const login = async (nombreUsuario: string, password: string) => {
        const response = await authService.login(nombreUsuario, password);

        setToken(response.token);
        setUsuario(response.usuario);

        localStorage.setItem('token', response.token);
        localStorage.setItem('usuario', JSON.stringify(response.usuario));
    };

    const logout = () => {
        setToken(null);
        setUsuario(null);
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
    };

    const isAdmin = usuario?.rol === 'ADMIN';

    return (
        <AuthContext.Provider value={{ usuario, token, isLoading, isAdmin, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
}
