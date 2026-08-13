// Rutas de Analítica (solo lectura: ADMIN y AUDITOR)
import { Router } from 'express';
import { obtenerAnalitica } from '../controllers/reportes.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/', obtenerAnalitica);

export default router;
