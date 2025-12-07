// Rutas de Clientes

import { Router } from 'express';
import {
    listarClientes,
    obtenerCliente,
    crearCliente,
    actualizarCliente,
    eliminarCliente
} from '../controllers/cliente.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/', listarClientes);
router.get('/:id', obtenerCliente);
router.post('/', soloAdmin, crearCliente);
router.put('/:id', soloAdmin, actualizarCliente);
router.delete('/:id', soloAdmin, eliminarCliente);

export default router;
