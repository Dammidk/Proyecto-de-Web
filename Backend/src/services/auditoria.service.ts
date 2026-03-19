// Servicio de Auditoría
import prisma from '../config/database';
import { auditoriaRepository, FiltrosAuditoria } from '../repositories/auditoria.repository';
import { NotFoundError } from '../utils/errors';

export const auditoriaService = {
    async listar(filtros: FiltrosAuditoria) {
        return auditoriaRepository.findAll(filtros);
    },

    async obtener(id: number) {
        const registro = await prisma.registroAuditoria.findUnique({
            where: { id },
            include: { usuario: { select: { id: true, nombreCompleto: true } } }
        });
        if (!registro) throw new NotFoundError('Registro no encontrado');
        return registro;
    }
};
