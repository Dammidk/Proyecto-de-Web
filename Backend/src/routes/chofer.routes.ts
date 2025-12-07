// Rutas de Choferes

import { Router } from 'express';
import {
    listarChoferes,
    obtenerChofer,
    crearChofer,
    actualizarChofer,
    eliminarChofer
} from '../controllers/chofer.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/', listarChoferes);
router.get('/:id', obtenerChofer);
router.post('/', soloAdmin, crearChofer);
router.put('/:id', soloAdmin, actualizarChofer);
router.delete('/:id', soloAdmin, eliminarChofer);

export default router;
