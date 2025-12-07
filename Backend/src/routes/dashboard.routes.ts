// Rutas del Dashboard

import { Router } from 'express';
import { obtenerResumen } from '../controllers/dashboard.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/', obtenerResumen);

export default router;
