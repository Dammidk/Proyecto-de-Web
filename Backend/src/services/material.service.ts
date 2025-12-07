// Servicio de Materiales - Lógica de negocio
import { z } from 'zod';
import { AccionAuditoria } from '@prisma/client';
import { materialRepository, FiltrosMaterial } from '../repositories/material.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';

export const materialSchema = z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
    unidadMedida: z.string().min(1, 'Unidad de medida requerida'),
    esPeligroso: z.boolean().optional().default(false),
    descripcion: z.string().optional().nullable()
});

export type MaterialInput = z.infer<typeof materialSchema>;

export const materialService = {
    async listar(filtros: FiltrosMaterial) {
        return materialRepository.findAll(filtros);
    },

    async obtenerPorId(id: number) {
        return materialRepository.findById(id);
    },

    async crear(datos: MaterialInput, usuarioId: number, ip?: string) {
        const nombreNormalizado = datos.nombre.trim();
        const existente = await materialRepository.findByNombre(nombreNormalizado);
        if (existente) throw new Error(`Ya existe un material con el nombre ${nombreNormalizado}`);

        const dataToSave = {
            nombre: nombreNormalizado,
            unidadMedida: datos.unidadMedida.trim(),
            esPeligroso: datos.esPeligroso || false,
            descripcion: datos.descripcion?.trim() || null
        };

        const material = await materialRepository.create(dataToSave);

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.CREAR,
            entidad: 'Material',
            entidadId: material.id,
            datosNuevos: material,
            ipAddress: ip
        });

        return material;
    },

    async actualizar(id: number, datos: Partial<MaterialInput>, usuarioId: number, ip?: string) {
        const anterior = await materialRepository.findById(id);
        if (!anterior) throw new Error('Material no encontrado');

        if (datos.nombre && datos.nombre !== anterior.nombre) {
            const existente = await materialRepository.findByNombre(datos.nombre);
            if (existente) throw new Error(`El nombre ${datos.nombre} ya está en uso`);
        }

        const dataToUpdate: any = {};
        if (datos.nombre) dataToUpdate.nombre = datos.nombre.trim();
        if (datos.unidadMedida) dataToUpdate.unidadMedida = datos.unidadMedida.trim();
        if (datos.esPeligroso !== undefined) dataToUpdate.esPeligroso = datos.esPeligroso;
        if (datos.descripcion !== undefined) dataToUpdate.descripcion = datos.descripcion?.trim() || null;

        const material = await materialRepository.update(id, dataToUpdate);

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'Material',
            entidadId: id,
            datosAnteriores: anterior,
            datosNuevos: material,
            ipAddress: ip
        });

        return material;
    },

    async eliminar(id: number, usuarioId: number, ip?: string) {
        const material = await materialRepository.findById(id);
        if (!material) throw new Error('Material no encontrado');

        await materialRepository.delete(id);

        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.ELIMINAR,
            entidad: 'Material',
            entidadId: id,
            datosAnteriores: material,
            ipAddress: ip
        });

        return material;
    }
};
