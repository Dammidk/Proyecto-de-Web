// Rutas de Auditoría (solo lectura)

import { Router } from 'express';
import { listarAuditoria, obtenerRegistroAuditoria } from '../controllers/auditoria.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

// Ambos roles pueden ver la auditoría
router.use(verificarToken);

router.get('/', listarAuditoria);
router.get('/:id', obtenerRegistroAuditoria);

export default router;
