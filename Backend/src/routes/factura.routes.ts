// Rutas de Facturación y Cuentas por Cobrar (la escritura es solo ADMIN)
import { Router } from 'express';
import { facturaController } from '../controllers/factura.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/', facturaController.listar);
router.get('/resumen-cartera', facturaController.resumenCartera);
router.get('/viajes-facturables', facturaController.viajesFacturables);
router.get('/:id', facturaController.obtenerPorId);
router.post('/', soloAdmin, facturaController.crear);
router.post('/:id/cobros', soloAdmin, facturaController.registrarCobro);
router.patch('/:id/anular', soloAdmin, facturaController.anular);

export default router;
