// Rutas de Pagos a Choferes
import { Router } from 'express';
import { pagoChoferController } from '../controllers/pagoChofer.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';
import { upload } from '../config/multer.config';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas de consulta
router.get('/', pagoChoferController.listar);
router.get('/estadisticas', pagoChoferController.obtenerEstadisticas);
router.get('/chofer/:choferId/resumen', pagoChoferController.obtenerResumenChofer);
router.get('/:id', pagoChoferController.obtener);

// Rutas administrativas (solo ADMIN)
router.post('/', soloAdmin, upload.single('comprobante'), pagoChoferController.crear);
router.put('/:id', soloAdmin, upload.single('comprobante'), pagoChoferController.actualizar);
router.delete('/:id', soloAdmin, pagoChoferController.eliminar);

export default router;
