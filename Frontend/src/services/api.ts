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
        // Un 401 en el propio login es "credenciales inválidas", no una sesión vencida
        const esLogin = error.config?.url?.includes('/auth/login');
        if (error.response?.status === 401 && !esLogin) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Extrae el mensaje de error que envía el backend (o uno genérico)
export const mensajeError = (error: any, porDefecto = 'Ocurrió un error inesperado'): string =>
    error?.response?.data?.mensaje || error?.response?.data?.error || porDefecto;

// Los formularios con archivo se envían como multipart; el resto como JSON
const cuerpo = (datos: any) =>
    datos instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;

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

    obtenerLiquidacion: async (id: number) => {
        const response = await api.get(`/viajes/${id}/liquidacion`);
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

// ==========================================
// Servicios de Mantenimientos
// ==========================================

export interface FiltrosMantenimiento {
    vehiculoId?: number;
    tipo?: string;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    busqueda?: string;
}

export const mantenimientoService = {
    listar: async (params?: FiltrosMantenimiento) => {
        const response = await api.get('/mantenimientos', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/mantenimientos/${id}`);
        return response.data;
    },

    crear: async (datos: any) => {
        const response = await api.post('/mantenimientos', datos, cuerpo(datos));
        return response.data;
    },

    actualizar: async (id: number, datos: any) => {
        const response = await api.put(`/mantenimientos/${id}`, datos, cuerpo(datos));
        return response.data;
    },

    eliminar: async (id: number) => {
        const response = await api.delete(`/mantenimientos/${id}`);
        return response.data;
    },

    obtenerAlertas: async () => {
        const response = await api.get('/mantenimientos/alertas');
        return response.data;
    },

    obtenerEstadisticas: async (params?: { anio?: number; mes?: number }) => {
        const response = await api.get('/mantenimientos/estadisticas', { params });
        return response.data;
    },
};

// ==========================================
// Servicios de Pagos a Choferes
// ==========================================

export interface FiltrosPagoChofer {
    choferId?: number;
    viajeId?: number;
    tipoPago?: string;
    metodoPago?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    busqueda?: string;
}

export const pagoChoferService = {
    listar: async (params?: FiltrosPagoChofer) => {
        const response = await api.get('/pagos-choferes', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/pagos-choferes/${id}`);
        return response.data;
    },

    crear: async (datos: any) => {
        const response = await api.post('/pagos-choferes', datos, cuerpo(datos));
        return response.data;
    },

    actualizar: async (id: number, datos: any) => {
        const response = await api.put(`/pagos-choferes/${id}`, datos, cuerpo(datos));
        return response.data;
    },

    eliminar: async (id: number) => {
        const response = await api.delete(`/pagos-choferes/${id}`);
        return response.data;
    },

    obtenerResumenChofer: async (choferId: number) => {
        const response = await api.get(`/pagos-choferes/chofer/${choferId}/resumen`);
        return response.data;
    },

    obtenerEstadisticas: async (params?: { anio?: number; mes?: number }) => {
        const response = await api.get('/pagos-choferes/estadisticas', { params });
        return response.data;
    },
};

// ==========================================
// Analítica, cumplimiento documental y exportaciones
// ==========================================

export interface Periodo {
    desde?: string;
    hasta?: string;
}

export const analiticaService = {
    obtener: async (params?: Periodo) => {
        const response = await api.get('/analitica', { params });
        return response.data;
    },
};

export const cumplimientoService = {
    obtener: async () => {
        const response = await api.get('/cumplimiento');
        return response.data;
    },
};

export const exportarService = {
    // Descarga un CSV (se abre directo en Excel) usando el token de la sesión
    descargar: async (tipo: 'viajes' | 'gastos' | 'mantenimientos' | 'pagos', params?: Periodo) => {
        const response = await api.get(`/exportar/${tipo}`, { params, responseType: 'blob' });
        const disposicion: string = response.headers['content-disposition'] || '';
        const nombre = /filename="([^"]+)"/.exec(disposicion)?.[1] || `${tipo}.csv`;
        const url = URL.createObjectURL(response.data);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombre;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
    },
};


// ==========================================
// Servicios de Neumáticos (Llantas)
// ==========================================

export const neumaticoService = {
    listar: async (params?: { vehiculoId?: number; estado?: string; busqueda?: string }) => {
        const response = await api.get('/neumaticos', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/neumaticos/${id}`);
        return response.data;
    },

    obtenerResumen: async () => {
        const response = await api.get('/neumaticos/resumen');
        return response.data;
    },

    crear: async (datos: any) => {
        const response = await api.post('/neumaticos', datos);
        return response.data;
    },

    actualizar: async (id: number, datos: any) => {
        const response = await api.put(`/neumaticos/${id}`, datos);
        return response.data;
    },

    registrarInspeccion: async (id: number, datos: { profundidadMm: number; presionPsi: number; kilometrajeVehiculo?: number; desgasteIrregular?: boolean; observaciones?: string }) => {
        const response = await api.post(`/neumaticos/${id}/inspecciones`, datos);
        return response.data;
    },

    // Monta, desmonta o intercambia de posición (si el destino está ocupado, ambas llantas se intercambian)
    reubicar: async (id: number, datos: { vehiculoId: number | null; posicionActual: string | null }) => {
        const response = await api.patch(`/neumaticos/${id}/montaje`, datos);
        return response.data;
    },

    reencauchar: async (id: number, datos: { costo: number; profundidadMm: number; observaciones?: string }) => {
        const response = await api.post(`/neumaticos/${id}/reencauche`, datos);
        return response.data;
    },
};

// ==========================================
// Servicios de Facturación y Cuentas por Cobrar (CxC)
// ==========================================

export const facturaService = {
    listar: async (params?: { clienteId?: number; estado?: string }) => {
        const response = await api.get('/facturas', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/facturas/${id}`);
        return response.data;
    },

    obtenerResumenCartera: async () => {
        const response = await api.get('/facturas/resumen-cartera');
        return response.data;
    },

    viajesFacturables: async () => {
        const response = await api.get('/facturas/viajes-facturables');
        return response.data;
    },

    crear: async (datos: {
        clienteId: number; viajeId?: number | null; numeroFactura?: string; subtotal?: number | null;
        ivaPorcentaje: number; diasCredito: number; observaciones?: string;
    }) => {
        const response = await api.post('/facturas', datos);
        return response.data;
    },

    registrarCobro: async (facturaId: number, datos: { monto: number; metodoPago: string; referencia?: string; observaciones?: string }) => {
        const response = await api.post(`/facturas/${facturaId}/cobros`, datos);
        return response.data;
    },

    anular: async (facturaId: number) => {
        const response = await api.patch(`/facturas/${facturaId}/anular`);
        return response.data;
    },
};

// ==========================================
// Servicios de Repuestos e Inventario de Taller
// ==========================================

export const repuestoService = {
    listar: async (params?: { categoria?: string; busqueda?: string }) => {
        const response = await api.get('/repuestos', { params });
        return response.data;
    },

    obtener: async (id: number) => {
        const response = await api.get(`/repuestos/${id}`);
        return response.data;
    },

    obtenerResumen: async () => {
        const response = await api.get('/repuestos/resumen');
        return response.data;
    },

    movimientosRecientes: async () => {
        const response = await api.get('/repuestos/movimientos-recientes');
        return response.data;
    },

    crear: async (datos: any) => {
        const response = await api.post('/repuestos', datos);
        return response.data;
    },

    actualizar: async (id: number, datos: any) => {
        const response = await api.put(`/repuestos/${id}`, datos);
        return response.data;
    },

    registrarMovimiento: async (id: number, datos: {
        tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE'; cantidad: number; costoUnitario?: number | null;
        motivo?: string; referencia?: string; vehiculoId?: number | null;
    }) => {
        const response = await api.post(`/repuestos/${id}/movimientos`, datos);
        return response.data;
    },

    eliminar: async (id: number) => {
        const response = await api.delete(`/repuestos/${id}`);
        return response.data;
    },
};

// ==========================================
// Servicios de Organización (perfil y plan)
// ==========================================

export const empresaService = {
    obtenerActual: async () => {
        const response = await api.get('/empresas/actual');
        return response.data;
    },

    actualizarActual: async (datos: any) => {
        const response = await api.put('/empresas/actual', datos);
        return response.data;
    },
};

export default api;
