// Servicio de Clientes - Lógica de negocio
import { z } from 'zod';
import { AccionAuditoria } from '@prisma/client';
import { clienteRepository, FiltrosCliente } from '../repositories/cliente.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';

export const clienteSchema = z.object({
    nombreRazonSocial: z.string().min(1, 'Nombre o razón social requerido'),
    documentoId: z.string().min(1, 'Documento requerido'),
    telefono: z.string().optional().nullable(),
    correo: z.string().email().optional().nullable().or(z.literal('')),
    direccion: z.string().optional().nullable(),
    sector: z.string().optional().nullable(),
    estado: z.enum(['ACTIVO', 'INACTIVO']).optional().default('ACTIVO')
});

export type ClienteInput = z.infer<typeof clienteSchema>;

export const clienteService = {
    async listar(filtros: FiltrosCliente) {
        return clienteRepository.findAll(filtros);
    },

    async obtenerPorId(id: number) {
        return clienteRepository.findById(id);
    },

    async crear(datos: ClienteInput, usuarioId: number, ip?: string) {
        const docNormalizado = datos.documentoId.trim();
        const existente = await clienteRepository.findByDocumento(docNormalizado);
        if (existente) throw new Error(`Ya existe un cliente con el documento ${docNormalizado}`);

        const dataToSave = {
            nombreRazonSocial: datos.nombreRazonSocial.trim(),
            documentoId: docNormalizado,
            telefono: datos.telefono?.trim() || null,
            correo: datos.correo?.trim() || null,
            direccion: datos.direccion?.trim() || null,
            sector: datos.sector?.trim() || null,
            estado: datos.estado || 'ACTIVO'
        };

        const cliente = await clienteRepository.create(dataToSave);

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.CREAR,
            entidad: 'Cliente',
            entidadId: cliente.id,
            datosNuevos: cliente,
            ipAddress: ip
        });

        return cliente;
    },

    async actualizar(id: number, datos: Partial<ClienteInput>, usuarioId: number, ip?: string) {
        const anterior = await clienteRepository.findById(id);
        if (!anterior) throw new Error('Cliente no encontrado');

        if (datos.documentoId && datos.documentoId !== anterior.documentoId) {
            const existente = await clienteRepository.findByDocumento(datos.documentoId);
            if (existente) throw new Error(`El documento ${datos.documentoId} ya está en uso`);
        }

        const dataToUpdate: any = {};
        if (datos.nombreRazonSocial) dataToUpdate.nombreRazonSocial = datos.nombreRazonSocial.trim();
        if (datos.documentoId) dataToUpdate.documentoId = datos.documentoId.trim();
        if (datos.telefono !== undefined) dataToUpdate.telefono = datos.telefono?.trim() || null;
        if (datos.correo !== undefined) dataToUpdate.correo = datos.correo?.trim() || null;
        if (datos.direccion !== undefined) dataToUpdate.direccion = datos.direccion?.trim() || null;
        if (datos.sector !== undefined) dataToUpdate.sector = datos.sector?.trim() || null;
        if (datos.estado) dataToUpdate.estado = datos.estado;

        const cliente = await clienteRepository.update(id, dataToUpdate);

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'Cliente',
            entidadId: id,
            datosAnteriores: anterior,
            datosNuevos: cliente,
            ipAddress: ip
        });

        return cliente;
    },

    async eliminar(id: number, usuarioId: number, ip?: string) {
        const cliente = await clienteRepository.findById(id);
        if (!cliente) throw new Error('Cliente no encontrado');

        await clienteRepository.delete(id);

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.ELIMINAR,
            entidad: 'Cliente',
            entidadId: id,
            datosAnteriores: cliente,
            ipAddress: ip
        });

        return cliente;
    }
};
