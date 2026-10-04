// Punto de entrada principal del servidor
// Sistema de Control de Transporte de Carga Pesada

import env from './config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Importar rutas
import authRoutes from './routes/auth.routes';
import vehiculoRoutes from './routes/vehiculo.routes';
import choferRoutes from './routes/chofer.routes';
import clienteRoutes from './routes/cliente.routes';
import materialRoutes from './routes/material.routes';
import auditoriaRoutes from './routes/auditoria.routes';
import dashboardRoutes from './routes/dashboard.routes';
import viajesRoutes from './routes/viajes.routes';
import gastosRoutes from './routes/gastos.routes';
import mantenimientoRoutes from './routes/mantenimiento.routes';
import pagoChoferRoutes from './routes/pagoChofer.routes';
import analiticaRoutes from './routes/analitica.routes';
import cumplimientoRoutes from './routes/cumplimiento.routes';
import exportarRoutes from './routes/exportar.routes';
import neumaticoRoutes from './routes/neumatico.routes';
import facturaRoutes from './routes/factura.routes';
import repuestoRoutes from './routes/repuesto.routes';
import empresaRoutes from './routes/empresa.routes';
import { storageService } from './services/storage.service';
import { manejadorErrores, rutaNoEncontrada } from './middlewares/error.middleware';
import prisma from './config/database';

const app = express();

// Detrás de Nginx: req.ip toma la IP real del cliente desde X-Forwarded-For
app.set('trust proxy', 1);

// Cabeceras de seguridad HTTP. Se permite cargar comprobantes desde otro origen (frontend en dev)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS: en producción solo los orígenes configurados; en desarrollo, cualquiera
app.use(cors({
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
}));

app.use(express.json({ limit: '1mb' }));

// Servir archivos estáticos (comprobantes, vouchers y facturas en VPS)
app.use('/uploads', express.static(storageService.getUploadsDir(), {
    maxAge: '30d',
    etag: true,
    immutable: true,
}));

// Middleware para logging de peticiones (en español)
if (!env.esTest) {
    app.use((req, res, next) => {
        console.log(`[${new Date().toLocaleString('es-EC')}] ${req.method} ${req.path}`);
        next();
    });
}

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
app.use('/api/choferes', choferRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/materiales', materialRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/viajes', viajesRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/mantenimientos', mantenimientoRoutes);
app.use('/api/pagos-choferes', pagoChoferRoutes);
app.use('/api/analitica', analiticaRoutes);
app.use('/api/cumplimiento', cumplimientoRoutes);
app.use('/api/exportar', exportarRoutes);
app.use('/api/neumaticos', neumaticoRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api/repuestos', repuestoRoutes);
app.use('/api/empresas', empresaRoutes);

// Ruta de salud del servidor (incluye verificación de la base de datos)
app.get('/api/health', async (req, res) => {
    let baseDatos = 'desconocido';
    if (!env.esTest) {
        try {
            await prisma.$queryRaw`SELECT 1`;
            baseDatos = 'ok';
        } catch {
            baseDatos = 'sin conexión';
        }
    }
    res.status(baseDatos === 'sin conexión' ? 503 : 200).json({
        estado: baseDatos === 'sin conexión' ? 'degradado' : 'ok',
        mensaje: 'Servidor funcionando correctamente',
        baseDatos,
        timestamp: new Date().toISOString()
    });
});

// Manejo de rutas no encontradas y errores
app.use(rutaNoEncontrada);
app.use(manejadorErrores);

// Iniciar servidor solo si no estamos en entorno de pruebas
if (!env.esTest) {
    app.listen(env.port, () => {
        console.log('='.repeat(50));
        console.log('SISTEMA DE CONTROL DE TRANSPORTE');
        console.log('='.repeat(50));
        console.log(`Servidor iniciado en puerto ${env.port}`);
        console.log(`URL: http://localhost:${env.port}`);
        console.log(`Fecha/Hora: ${new Date().toLocaleString('es-EC')}`);
        console.log('='.repeat(50));
    });
}

export default app;
