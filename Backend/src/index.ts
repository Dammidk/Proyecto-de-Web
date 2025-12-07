// Punto de entrada principal del servidor
// Sistema de Control de Transporte de Carga Pesada

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Importar rutas
import authRoutes from './routes/auth.routes';
import vehiculoRoutes from './routes/vehiculo.routes';
import choferRoutes from './routes/chofer.routes';
import clienteRoutes from './routes/cliente.routes';
import materialRoutes from './routes/material.routes';
import auditoriaRoutes from './routes/auditoria.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Middleware para logging de peticiones (en español)
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleString('es-EC')}] ${req.method} ${req.path}`);
    next();
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
app.use('/api/choferes', choferRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/materiales', materialRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
    res.json({
        estado: 'ok',
        mensaje: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        ruta: req.path
    });
});

// Manejo global de errores
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[ERROR] ${err.message}`);
    res.status(500).json({
        error: 'Error interno del servidor',
        mensaje: err.message
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🚛 SISTEMA DE CONTROL DE TRANSPORTE');
    console.log('='.repeat(50));
    console.log(`✅ Servidor iniciado en puerto ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🕐 Fecha/Hora: ${new Date().toLocaleString('es-EC')}`);
    console.log('='.repeat(50));
});

export default app;
