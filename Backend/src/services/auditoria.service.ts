// Servicio de Auditoría
import { auditoriaRepository, FiltrosAuditoria } from '../repositories/auditoria.repository';

export const auditoriaService = {
    async listar(filtros: FiltrosAuditoria) {
        return auditoriaRepository.findAll(filtros);
    }
};
