// Rutas de Neumáticos (la lectura es para cualquier usuario autenticado; la escritura solo ADMIN)
import { Router } from 'express';
import { neumaticoController } from '../controllers/neumatico.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/', neumaticoController.listar);
router.get('/resumen', neumaticoController.resumen);
router.get('/:id', neumaticoController.obtenerPorId);
router.post('/', soloAdmin, neumaticoController.crear);
router.put('/:id', soloAdmin, neumaticoController.actualizar);
router.post('/:id/inspecciones', soloAdmin, neumaticoController.registrarInspeccion);
router.patch('/:id/montaje', soloAdmin, neumaticoController.reubicar);
router.post('/:id/reencauche', soloAdmin, neumaticoController.reencauchar);

export default router;
