// Rutas de Gastos (independientes, para edición/eliminación)
import { Router } from 'express';
import { gastosController } from '../controllers/gastos.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// PUT /api/gastos/:id - Actualizar gasto (solo admin)
router.put('/:id', soloAdmin, gastosController.actualizar);

// DELETE /api/gastos/:id - Eliminar gasto (solo admin)
router.delete('/:id', soloAdmin, gastosController.eliminar);

export default router;
