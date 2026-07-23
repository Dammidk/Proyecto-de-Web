// Rutas de Cumplimiento (solo lectura: ADMIN y AUDITOR)
import { Router } from 'express';
import { obtenerCumplimiento } from '../controllers/reportes.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/', obtenerCumplimiento);

export default router;
