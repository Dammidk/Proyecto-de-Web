// Rutas de Empresas (la escritura es solo ADMIN)
import { Router } from 'express';
import { empresaController } from '../controllers/empresa.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/actual', empresaController.obtenerActual);
router.put('/actual', soloAdmin, empresaController.actualizarActual);
router.get('/', empresaController.listar);
router.post('/', soloAdmin, empresaController.crear);

export default router;
