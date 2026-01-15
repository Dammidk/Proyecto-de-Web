// Rutas de Autenticación

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, obtenerPerfil } from '../controllers/auth.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import env from '../config/env';

const router = Router();

// Limita los intentos de login para frenar ataques de fuerza bruta
const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 10, // 10 intentos por IP en la ventana
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true, // solo cuentan los intentos fallidos
    skip: () => env.esTest,
    message: { error: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.' },
});

// POST /api/auth/login - Iniciar sesión
router.post('/login', limiteLogin, login);

// GET /api/auth/perfil - Obtener perfil del usuario autenticado
router.get('/perfil', verificarToken, obtenerPerfil);

export default router;
