// Rutas de Repuestos (la escritura es solo ADMIN)
import { Router } from 'express';
import { repuestoController } from '../controllers/repuesto.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/', repuestoController.listar);
router.get('/resumen', repuestoController.resumen);
router.get('/movimientos-recientes', repuestoController.movimientosRecientes);
router.get('/:id', repuestoController.obtenerPorId);
router.post('/', soloAdmin, repuestoController.crear);
router.put('/:id', soloAdmin, repuestoController.actualizar);
router.post('/:id/movimientos', soloAdmin, repuestoController.registrarMovimiento);
router.delete('/:id', soloAdmin, repuestoController.eliminar);

export default router;
