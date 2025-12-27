// Rutas de Viajes
import { Router } from 'express';
import { viajesController } from '../controllers/viajes.controller';
import { gastosController } from '../controllers/gastos.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';
import { upload } from '../config/multer.config';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// ====================
// RUTAS DE VIAJES
// ====================

// GET /api/viajes - Listar viajes con filtros
router.get('/', viajesController.listar);

// GET /api/viajes/:id - Detalle de viaje con gastos y rentabilidad
router.get('/:id', viajesController.obtenerDetalle);

// POST /api/viajes - Crear viaje (solo admin)
router.post('/', soloAdmin, viajesController.crear);

// PUT /api/viajes/:id - Actualizar viaje (solo admin)
router.put('/:id', soloAdmin, viajesController.actualizar);

// PATCH /api/viajes/:id/estado - Cambiar estado (solo admin)
router.patch('/:id/estado', soloAdmin, viajesController.cambiarEstado);

// DELETE /api/viajes/:id - Eliminar viaje (solo admin)
router.delete('/:id', soloAdmin, viajesController.eliminar);

// ====================
// RUTAS DE GASTOS DE VIAJE
// ====================

// GET /api/viajes/:viajeId/gastos - Listar gastos de un viaje
router.get('/:viajeId/gastos', gastosController.listar);

// POST /api/viajes/:viajeId/gastos - Crear gasto (solo admin, con archivo opcional)
router.post(
    '/:viajeId/gastos',
    soloAdmin,
    upload.single('comprobante'),
    gastosController.crear
);

export default router;
