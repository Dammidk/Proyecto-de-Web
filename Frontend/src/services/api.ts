// Servicio de API - Comunicación con el Backend
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Instancia de Axios configurada
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para agregar token JWT a las peticiones
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ==========================================
// Servicios de Autenticación
// ==========================================

export const authService = {
    login: async (usuario: string, password: string) => {
        const response = await api.post('/auth/login', { usuario, password });
        return response.data;
    },

    obtenerPerfil: async () => {
        const response = await api.get('/auth/perfil');
        return response.data;
    },
};

// ==========================================
// Servicios de Dashboard
// ==========================================

export const dashboardService = {
    obtenerResumen: async () => {
        const response = await api.get('/dashboard');
        return response.data;
    },
};

// ==========================================
// Servicios de Vehículos
// ==========================================

export const vehiculoService = {
    listar: async (params?: { busqueda?: string; estado?: string }) => {
        const response = await api.get('/vehiculos', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/vehiculos/${id}`);
        return response.data;
    },

    crear: async (vehiculo: any) => {
        const response = await api.post('/vehiculos', vehiculo);
        return response.data;
    },

    actualizar: async (id: number, vehiculo: any) => {
        const response = await api.put(`/vehiculos/${id}`, vehiculo);
        return response.data;
    },

    eliminar: async (id: number) => {
        const response = await api.delete(`/vehiculos/${id}`);
        return response.data;
    },
};

// ==========================================
// Servicios de Choferes
// ==========================================

export const choferService = {
    listar: async (params?: { busqueda?: string; estado?: string }) => {
        const response = await api.get('/choferes', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/choferes/${id}`);
        return response.data;
    },

    crear: async (chofer: any) => {
        const response = await api.post('/choferes', chofer);
        return response.data;
    },

    actualizar: async (id: number, chofer: any) => {
        const response = await api.put(`/choferes/${id}`, chofer);
        return response.data;
    },

    eliminar: async (id: number) => {
        const response = await api.delete(`/choferes/${id}`);
        return response.data;
    },
};

// ==========================================
// Servicios de Clientes
// ==========================================

export const clienteService = {
    listar: async (params?: { busqueda?: string; estado?: string }) => {
        const response = await api.get('/clientes', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/clientes/${id}`);
        return response.data;
    },

    crear: async (cliente: any) => {
        const response = await api.post('/clientes', cliente);
        return response.data;
    },

    actualizar: async (id: number, cliente: any) => {
        const response = await api.put(`/clientes/${id}`, cliente);
        return response.data;
    },

    eliminar: async (id: number) => {
        const response = await api.delete(`/clientes/${id}`);
        return response.data;
    },
};

// ==========================================
// Servicios de Materiales
// ==========================================

export const materialService = {
    listar: async (params?: { busqueda?: string }) => {
        const response = await api.get('/materiales', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/materiales/${id}`);
        return response.data;
    },

    crear: async (material: any) => {
        const response = await api.post('/materiales', material);
        return response.data;
    },

    actualizar: async (id: number, material: any) => {
        const response = await api.put(`/materiales/${id}`, material);
        return response.data;
    },

    eliminar: async (id: number) => {
        const response = await api.delete(`/materiales/${id}`);
        return response.data;
    },
};

// ==========================================
// Servicios de Auditoría
// ==========================================

export const auditoriaService = {
    listar: async (params?: { entidad?: string; accion?: string; limite?: number }) => {
        const response = await api.get('/auditoria', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/auditoria/${id}`);
        return response.data;
    },
};

// ==========================================
// Servicios de Viajes
// ==========================================

export interface FiltrosViajes {
    estado?: string;
    vehiculoId?: number;
    choferId?: number;
    clienteId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    limit?: number;
}

export const viajeService = {
    listar: async (params?: FiltrosViajes) => {
        const response = await api.get('/viajes', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/viajes/${id}`);
        return response.data;
    },

    crear: async (viaje: any) => {
        const response = await api.post('/viajes', viaje);
        return response.data;
    },

    actualizar: async (id: number, viaje: any) => {
        const response = await api.put(`/viajes/${id}`, viaje);
        return response.data;
    },

    cambiarEstado: async (id: number, estado: string, datosAdicionales?: { fechaLlegadaReal?: string; kilometrosReales?: number }) => {
        const response = await api.patch(`/viajes/${id}/estado`, { estado, ...datosAdicionales });
        return response.data;
    },

    eliminar: async (id: number) => {
        const response = await api.delete(`/viajes/${id}`);
        return response.data;
    },
};

// ==========================================
// Servicios de Gastos de Viaje
// ==========================================

export const gastoService = {
    listarPorViaje: async (viajeId: number) => {
        const response = await api.get(`/viajes/${viajeId}/gastos`);
        return response.data;
    },

    crear: async (viajeId: number, formData: FormData) => {
        const response = await api.post(`/viajes/${viajeId}/gastos`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    actualizar: async (id: number, gasto: any) => {
        const response = await api.put(`/gastos/${id}`, gasto);
        return response.data;
    },

    eliminar: async (id: number) => {
        const response = await api.delete(`/gastos/${id}`);
        return response.data;
    },
};

export default api;
