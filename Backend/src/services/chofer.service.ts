// Servicio de Choferes - Lógica de negocio
import { z } from 'zod';
import { AccionAuditoria } from '@prisma/client';
import { choferRepository, FiltrosChofer } from '../repositories/chofer.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';

export const choferSchema = z.object({
    nombres: z.string().min(1, 'Nombres requeridos'),
    apellidos: z.string().min(1, 'Apellidos requeridos'),
    documentoId: z.string().min(1, 'Documento requerido'),
    telefono: z.string().optional().nullable(),
    correo: z.string().email().optional().nullable().or(z.literal('')),
    estado: z.enum(['ACTIVO', 'INACTIVO']).optional().default('ACTIVO'),
    modalidadPago: z.enum(['POR_VIAJE', 'MENSUAL']).optional().default('POR_VIAJE'),
    metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA']).optional().default('EFECTIVO'),
    banco: z.string().optional().nullable(),
    numeroCuenta: z.string().optional().nullable(),
    sueldoMensual: z.coerce.number().min(0).optional().nullable()
});

export type ChoferInput = z.infer<typeof choferSchema>;

export const choferService = {
    async listar(filtros: FiltrosChofer) {
        return choferRepository.findAll(filtros);
    },

    async obtenerPorId(id: number) {
        return choferRepository.findById(id);
    },

    async crear(datos: ChoferInput, usuarioId: number, ip?: string) {
        const docNormalizado = datos.documentoId.trim();
        const existente = await choferRepository.findByDocumento(docNormalizado);
        if (existente) throw new Error(`Ya existe un chofer con el documento ${docNormalizado}`);

        const dataToSave = {
            nombres: datos.nombres.trim(),
            apellidos: datos.apellidos.trim(),
            documentoId: docNormalizado,
            telefono: datos.telefono?.trim() || null,
            correo: datos.correo?.trim() || null,
            estado: datos.estado || 'ACTIVO',
            modalidadPago: datos.modalidadPago || 'POR_VIAJE',
            metodoPago: datos.metodoPago || 'EFECTIVO',
            banco: datos.banco?.trim() || null,
            numeroCuenta: datos.numeroCuenta?.trim() || null,
            sueldoMensual: datos.sueldoMensual || null
        };

        const chofer = await choferRepository.create(dataToSave);

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.CREAR,
            entidad: 'Chofer',
            entidadId: chofer.id,
            datosNuevos: chofer,
            ipAddress: ip
        });

        return chofer;
    },

    async actualizar(id: number, datos: Partial<ChoferInput>, usuarioId: number, ip?: string) {
        const anterior = await choferRepository.findById(id);
        if (!anterior) throw new Error('Chofer no encontrado');

        if (datos.documentoId && datos.documentoId !== anterior.documentoId) {
            const existente = await choferRepository.findByDocumento(datos.documentoId);
            if (existente) throw new Error(`El documento ${datos.documentoId} ya está en uso`);
        }

        const dataToUpdate: any = {};
        if (datos.nombres) dataToUpdate.nombres = datos.nombres.trim();
        if (datos.apellidos) dataToUpdate.apellidos = datos.apellidos.trim();
        if (datos.documentoId) dataToUpdate.documentoId = datos.documentoId.trim();
        if (datos.telefono !== undefined) dataToUpdate.telefono = datos.telefono?.trim() || null;
        if (datos.correo !== undefined) dataToUpdate.correo = datos.correo?.trim() || null;
        if (datos.estado) dataToUpdate.estado = datos.estado;
        if (datos.modalidadPago) dataToUpdate.modalidadPago = datos.modalidadPago;
        if (datos.metodoPago) dataToUpdate.metodoPago = datos.metodoPago;
        if (datos.banco !== undefined) dataToUpdate.banco = datos.banco?.trim() || null;
        if (datos.numeroCuenta !== undefined) dataToUpdate.numeroCuenta = datos.numeroCuenta?.trim() || null;
        if (datos.sueldoMensual !== undefined) dataToUpdate.sueldoMensual = datos.sueldoMensual || null;

        const chofer = await choferRepository.update(id, dataToUpdate);

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'Chofer',
            entidadId: id,
            datosAnteriores: anterior,
            datosNuevos: chofer,
            ipAddress: ip
        });

        return chofer;
    },

    async eliminar(id: number, usuarioId: number, ip?: string) {
        const chofer = await choferRepository.findById(id);
        if (!chofer) throw new Error('Chofer no encontrado');

        await choferRepository.delete(id);

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.ELIMINAR,
            entidad: 'Chofer',
            entidadId: id,
            datosAnteriores: chofer,
            ipAddress: ip
        });

        return chofer;
    }
};
