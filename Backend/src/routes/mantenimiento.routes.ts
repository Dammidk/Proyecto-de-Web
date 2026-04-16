// Rutas de Mantenimientos
import { Router } from 'express';
import { mantenimientoController } from '../controllers/mantenimiento.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';
import { upload } from '../config/multer.config';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas de consulta
router.get('/', mantenimientoController.listar);
router.get('/alertas', mantenimientoController.obtenerAlertas);
router.get('/estadisticas', mantenimientoController.obtenerEstadisticas);
router.get('/:id', mantenimientoController.obtener);

// Rutas administrativas (solo ADMIN)
router.post('/', soloAdmin, upload.single('comprobante'), mantenimientoController.crear);
router.put('/:id', soloAdmin, upload.single('comprobante'), mantenimientoController.actualizar);
router.delete('/:id', soloAdmin, mantenimientoController.eliminar);

export default router;
