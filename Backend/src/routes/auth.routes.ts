// Rutas de Autenticación

import { Router } from 'express';
import { login, obtenerPerfil } from '../controllers/auth.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/auth/login - Iniciar sesión
router.post('/login', login);

// GET /api/auth/perfil - Obtener perfil del usuario autenticado
router.get('/perfil', verificarToken, obtenerPerfil);

export default router;
