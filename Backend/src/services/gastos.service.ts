// Servicio de Gastos de Viaje - Lógica de negocio
import { TipoGasto, MetodoPago, TipoComprobante, AccionAuditoria } from '@prisma/client';
import { gastosRepository, DatosCrearGasto } from '../repositories/gastos.repository';
import { viajesRepository } from '../repositories/viajes.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinary.service';

export interface DatosCrearGastoConArchivo {
    viajeId: number;
    tipoGasto: TipoGasto;
    monto: number;
    fecha: Date;
    metodoPago?: MetodoPago;
    descripcion?: string;
    archivo?: {
        buffer: Buffer;
        originalname: string;
    };
}

export const gastosService = {
    /**
     * Listar gastos de un viaje
     */
    async listarPorViaje(viajeId: number) {
        // Verificar que el viaje existe
        const viaje = await viajesRepository.findById(viajeId);
        if (!viaje) {
            throw new Error('Viaje no encontrado');
        }

        return gastosRepository.findByViajeId(viajeId);
    },

    /**
     * Crear un gasto de viaje (con soporte para archivo)
     */
    async crear(datos: DatosCrearGastoConArchivo, usuarioId: number) {
        // Verificar que el viaje existe
        const viaje = await viajesRepository.findById(datos.viajeId);
        if (!viaje) {
            throw new Error('Viaje no encontrado');
        }

        // Validar monto
        if (datos.monto <= 0) {
            throw new Error('El monto debe ser mayor a 0');
        }

        let comprobanteId: number | undefined;

        // Si hay archivo, subirlo a Cloudinary
        if (datos.archivo) {
            const resultadoUpload = await uploadToCloudinary(
                datos.archivo.buffer,
                'comprobantes/gastos',
                datos.archivo.originalname
            );

            // Crear registro de comprobante
            const comprobante = await gastosRepository.createComprobante({
                tipo: TipoComprobante.GASTO_VIAJE,
                url: resultadoUpload.url,
                publicId: resultadoUpload.publicId,
                nombreArchivoOriginal: datos.archivo.originalname,
            });

            comprobanteId = comprobante.id;
        }

        // Crear el gasto
        const datosGasto: DatosCrearGasto = {
            viajeId: datos.viajeId,
            tipoGasto: datos.tipoGasto,
            monto: datos.monto,
            fecha: datos.fecha,
            metodoPago: datos.metodoPago,
            descripcion: datos.descripcion,
        };

        const gasto = await gastosRepository.create(datosGasto, comprobanteId);

        // Actualizar referenciaId del comprobante si existe
        if (comprobanteId) {
            await gastosRepository.createComprobante;
        }

        // Registrar auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.CREAR,
            entidad: 'GastoViaje',
            entidadId: gasto.id,
            datosNuevos: gasto,
        });

        return gasto;
    },

    /**
     * Actualizar un gasto
     */
    async actualizar(id: number, datos: Partial<DatosCrearGasto>, usuarioId: number) {
        const gastoAnterior = await gastosRepository.findById(id);

        if (!gastoAnterior) {
            throw new Error('Gasto no encontrado');
        }

        if (datos.monto && datos.monto <= 0) {
            throw new Error('El monto debe ser mayor a 0');
        }

        const gastoActualizado = await gastosRepository.update(id, datos);

        // Registrar auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.EDITAR,
            entidad: 'GastoViaje',
            entidadId: id,
            datosAnteriores: gastoAnterior,
            datosNuevos: gastoActualizado,
        });

        return gastoActualizado;
    },

    /**
     * Eliminar un gasto
     */
    async eliminar(id: number, usuarioId: number) {
        const gasto = await gastosRepository.findById(id);

        if (!gasto) {
            throw new Error('Gasto no encontrado');
        }

        // Si tiene comprobante, eliminar de Cloudinary (opcional)
        if (gasto.comprobante) {
            try {
                await deleteFromCloudinary(gasto.comprobante.publicId);
            } catch (error) {
                console.error('Error al eliminar comprobante de Cloudinary:', error);
            }
        }

        await gastosRepository.delete(id);

        // Registrar auditoría
        await auditoriaRepository.create(usuarioId, {
            accion: AccionAuditoria.ELIMINAR,
            entidad: 'GastoViaje',
            entidadId: id,
            datosAnteriores: gasto,
        });

        return { mensaje: 'Gasto eliminado correctamente' };
    },

    /**
     * Obtener gastos totales del mes para dashboard
     */
    async obtenerGastosMensuales(anio: number, mes: number) {
        return gastosRepository.getGastosMensuales(anio, mes);
    },
};
