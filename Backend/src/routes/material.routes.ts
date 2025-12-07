// Rutas de Materiales

import { Router } from 'express';
import {
    listarMateriales,
    obtenerMaterial,
    crearMaterial,
    actualizarMaterial,
    eliminarMaterial
} from '../controllers/material.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/', listarMateriales);
router.get('/:id', obtenerMaterial);
router.post('/', soloAdmin, crearMaterial);
router.put('/:id', soloAdmin, actualizarMaterial);
router.delete('/:id', soloAdmin, eliminarMaterial);

export default router;
