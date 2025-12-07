// Controlador de Dashboard - Usa Service
import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';

// GET /api/dashboard
export const obtenerResumen = async (req: Request, res: Response): Promise<void> => {
    try {
        const resumen = await dashboardService.obtenerResumen();
        res.json({ resumen });
    } catch (error: any) {
        console.error('[ERROR DASHBOARD]', error);
        res.status(500).json({ error: 'Error al obtener resumen del dashboard' });
    }
};
