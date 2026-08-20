// Rutas de Exportación CSV (solo lectura: ADMIN y AUDITOR)
import { Router } from 'express';
import { exportar } from '../controllers/reportes.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

// GET /api/exportar/viajes|gastos|mantenimientos|pagos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/:tipo', exportar);

export default router;
