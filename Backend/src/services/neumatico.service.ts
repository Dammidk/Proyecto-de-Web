// Servicio de Neumáticos - ciclo de vida de la llanta: montaje, inspección, reencauche y baja
import { z } from 'zod';
import { AccionAuditoria, EstadoNeumatico, Prisma } from '@prisma/client';
import { enTransaccion } from '../config/database';
import { neumaticoRepository, FiltrosNeumatico } from '../repositories/neumatico.repository';
import { vehiculoRepository } from '../repositories/vehiculo.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';
import {
    POSICIONES_NEUMATICO, alertasNeumatico, calcularCpkNeumatico, evaluarSaludNeumatico, vidaUtilConsumida,
} from '../domain/neumaticos';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { fechaOpcional, numeroOpcional, textoOpcional } from '../utils/http';

const ESTADOS = ['NUEVO', 'EN_USO', 'EN_REPARACION', 'DESECHO'] as const;

export const neumaticoSchema = z.object({
    codigoSerie: z.string().trim().min(3, 'Código mínimo de 3 caracteres').max(40),
    marca: z.string().trim().min(1, 'Marca requerida'),
    modelo: z.string().trim().min(1, 'Modelo requerido'),
    medida: z.string().trim().min(1, 'Medida requerida'),
    estado: z.enum(ESTADOS).optional(),
    posicionActual: z.enum(POSICIONES_NEUMATICO).nullable().optional(),
    vehiculoId: numeroOpcional(z.coerce.number().int().positive()),
    profundidadInicialMm: z.coerce.number().positive().max(30),
    profundidadActualMm: numeroOpcional(z.coerce.number().min(0).max(30)),
    presionRecomendadaPsi: z.coerce.number().int().min(40).max(160).default(110),
    presionActualPsi: numeroOpcional(z.coerce.number().int().min(0).max(160)),
    costoCompra: z.coerce.number().positive('El costo debe ser mayor a 0'),
    kilometrosRecorridos: z.coerce.number().int().min(0).optional(),
    fechaInstalacion: fechaOpcional,
    observaciones: textoOpcional,
});

export const neumaticoUpdateSchema = neumaticoSchema.partial();

export const inspeccionSchema = z.object({
    profundidadMm: z.coerce.number().min(0).max(30),
    presionPsi: z.coerce.number().int().min(0).max(160),
    kilometrajeVehiculo: numeroOpcional(z.coerce.number().int().min(0)),
    desgasteIrregular: z.coerce.boolean().optional(),
    observaciones: textoOpcional,
});

export const montajeSchema = z.object({
    vehiculoId: numeroOpcional(z.coerce.number().int().positive()),
    posicionActual: z.enum(POSICIONES_NEUMATICO).nullable().optional(),
});

export const reencaucheSchema = z.object({
    costo: z.coerce.number().positive('El costo del reencauche debe ser mayor a 0'),
    profundidadMm: z.coerce.number().positive().max(30),
    observaciones: textoOpcional,
});

type NeumaticoDb = NonNullable<Awaited<ReturnType<typeof neumaticoRepository.findById>>>;

// Convierte el registro de BD en la vista que consume la interfaz (números, salud, alertas, CPK)
export const presentarNeumatico = (n: NeumaticoDb) => {
    const profundidadActualMm = Number(n.profundidadActualMm);
    const profundidadInicialMm = Number(n.profundidadInicialMm);
    const costoCompra = Number(n.costoCompra);
    const ultima = n.inspecciones?.[0];
    return {
        ...n,
        profundidadInicialMm,
        profundidadActualMm,
        costoCompra,
        salud: evaluarSaludNeumatico(profundidadActualMm, n.presionActualPsi, n.presionRecomendadaPsi),
        alertas: alertasNeumatico({
            profundidadMm: profundidadActualMm,
            presionActualPsi: n.presionActualPsi,
            presionRecomendadaPsi: n.presionRecomendadaPsi,
            desgasteIrregular: ultima?.desgasteIrregular,
        }),
        costoPorKm: calcularCpkNeumatico(costoCompra, n.kilometrosRecorridos),
        vidaUtilConsumida: vidaUtilConsumida(profundidadInicialMm, profundidadActualMm),
        inspecciones: n.inspecciones?.map(i => ({ ...i, profundidadMm: Number(i.profundidadMm) })),
    };
};

const obtenerOFallar = async (id: number) => {
    const n = await neumaticoRepository.findById(id);
    if (!n) throw new NotFoundError('Neumático no encontrado');
    return n;
};

// El estado depende del montaje: en un vehículo está en uso; en bodega espera inspección o asignación
const estadoSegunMontaje = (montado: boolean, kilometros: number, actual?: EstadoNeumatico): EstadoNeumatico => {
    if (actual === EstadoNeumatico.DESECHO) return EstadoNeumatico.DESECHO;
    if (montado) return EstadoNeumatico.EN_USO;
    return kilometros > 0 ? EstadoNeumatico.EN_REPARACION : EstadoNeumatico.NUEVO;
};

export const neumaticoService = {
    async listar(filtros: FiltrosNeumatico = {}) {
        const lista = await neumaticoRepository.findAll(filtros);
        return lista.map(n => presentarNeumatico(n as NeumaticoDb));
    },

    async obtenerPorId(id: number) {
        return presentarNeumatico(await obtenerOFallar(id));
    },

    async crear(datos: z.infer<typeof neumaticoSchema>, usuarioId: number, ip?: string) {
        const codigoSerie = datos.codigoSerie.toUpperCase();
        if (await neumaticoRepository.findByCodigo(codigoSerie)) {
            throw new ConflictError(`Ya existe un neumático con el código ${codigoSerie}`);
        }

        const vehiculoId = datos.vehiculoId ?? null;
        if (vehiculoId) {
            if (!await vehiculoRepository.findById(vehiculoId)) throw new ValidationError('El vehículo asignado no existe');
            if (!datos.posicionActual) throw new ValidationError('Indique la posición de montaje en el vehículo');
            if (await neumaticoRepository.findEnPosicion(vehiculoId, datos.posicionActual)) {
                throw new ConflictError(`La posición ${datos.posicionActual} del vehículo ya está ocupada`);
            }
        }

        const profundidadActual = datos.profundidadActualMm ?? datos.profundidadInicialMm;
        if (profundidadActual > datos.profundidadInicialMm) {
            throw new ValidationError('El labrado actual no puede superar el labrado inicial');
        }

        return enTransaccion(async tx => {
            const nuevo = await neumaticoRepository.create({
                codigoSerie,
                marca: datos.marca,
                modelo: datos.modelo,
                medida: datos.medida,
                estado: vehiculoId ? EstadoNeumatico.EN_USO : (datos.estado ?? EstadoNeumatico.NUEVO),
                posicionActual: vehiculoId ? datos.posicionActual : null,
                vehiculoId,
                profundidadInicialMm: datos.profundidadInicialMm,
                profundidadActualMm: profundidadActual,
                presionRecomendadaPsi: datos.presionRecomendadaPsi,
                presionActualPsi: datos.presionActualPsi ?? null,
                costoCompra: datos.costoCompra,
                kilometrosRecorridos: datos.kilometrosRecorridos ?? 0,
                fechaInstalacion: vehiculoId ? (datos.fechaInstalacion ?? new Date()) : null,
                observaciones: datos.observaciones ?? null,
            }, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.CREAR, entidad: 'Neumatico', entidadId: nuevo.id, datosNuevos: nuevo, ipAddress: ip,
            }, tx);
            return nuevo;
        });
    },

    async actualizar(id: number, datos: z.infer<typeof neumaticoUpdateSchema>, usuarioId: number, ip?: string) {
        const anterior = await obtenerOFallar(id);

        const cambios: Prisma.NeumaticoUncheckedUpdateInput = {};
        if (datos.codigoSerie) {
            const codigo = datos.codigoSerie.toUpperCase();
            const existente = await neumaticoRepository.findByCodigo(codigo);
            if (existente && existente.id !== id) throw new ConflictError(`Ya existe un neumático con el código ${codigo}`);
            cambios.codigoSerie = codigo;
        }
        for (const campo of ['marca', 'modelo', 'medida', 'presionRecomendadaPsi', 'presionActualPsi', 'observaciones'] as const) {
            if (datos[campo] !== undefined) (cambios as Record<string, unknown>)[campo] = datos[campo];
        }
        if (datos.profundidadActualMm != null) {
            const inicial = datos.profundidadInicialMm ?? Number(anterior.profundidadInicialMm);
            if (datos.profundidadActualMm > inicial) throw new ValidationError('El labrado actual no puede superar el labrado inicial');
            cambios.profundidadActualMm = datos.profundidadActualMm;
        }
        if (datos.profundidadInicialMm !== undefined) cambios.profundidadInicialMm = datos.profundidadInicialMm;
        if (datos.costoCompra !== undefined) cambios.costoCompra = datos.costoCompra;
        if (datos.kilometrosRecorridos !== undefined) cambios.kilometrosRecorridos = datos.kilometrosRecorridos;

        // Dar de baja libera la posición del vehículo
        if (datos.estado === EstadoNeumatico.DESECHO) {
            cambios.estado = EstadoNeumatico.DESECHO;
            cambios.vehiculoId = null;
            cambios.posicionActual = null;
        }

        return enTransaccion(async tx => {
            const actualizado = await neumaticoRepository.update(id, cambios, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.EDITAR, entidad: 'Neumatico', entidadId: id,
                datosAnteriores: anterior, datosNuevos: actualizado, ipAddress: ip,
            }, tx);
            return actualizado;
        });
    },

    async registrarInspeccion(id: number, datos: z.infer<typeof inspeccionSchema>, usuarioId: number, ip?: string) {
        const neumatico = await obtenerOFallar(id);
        if (neumatico.estado === EstadoNeumatico.DESECHO) {
            throw new ConflictError('No se puede inspeccionar un neumático dado de baja');
        }
        // El labrado solo disminuye; se tolera 0,5 mm por error de medición
        if (datos.profundidadMm > Number(neumatico.profundidadActualMm) + 0.5) {
            throw new ValidationError(
                `El labrado medido (${datos.profundidadMm} mm) supera la última medición (${Number(neumatico.profundidadActualMm)} mm). Si fue reencauchado, use la opción Reencauche`
            );
        }

        return enTransaccion(async tx => {
            const inspeccion = await neumaticoRepository.crearInspeccion({
                neumaticoId: id,
                profundidadMm: datos.profundidadMm,
                presionPsi: datos.presionPsi,
                kilometrajeVehiculo: datos.kilometrajeVehiculo ?? neumatico.vehiculo?.kilometrajeActual ?? null,
                desgasteIrregular: datos.desgasteIrregular ?? false,
                observaciones: datos.observaciones ?? null,
            }, tx);
            await neumaticoRepository.update(id, {
                profundidadActualMm: datos.profundidadMm,
                presionActualPsi: datos.presionPsi,
            }, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.EDITAR, entidad: 'Neumatico', entidadId: id,
                datosAnteriores: { profundidadActualMm: Number(neumatico.profundidadActualMm), presionActualPsi: neumatico.presionActualPsi },
                datosNuevos: { inspeccion: { profundidadMm: datos.profundidadMm, presionPsi: datos.presionPsi } },
                ipAddress: ip,
            }, tx);
            return inspeccion;
        });
    },

    /**
     * Montaje, desmontaje y rotación. Si la posición destino está ocupada, ambas llantas intercambian
     * lugar (rotación entre ejes) dentro de una misma transacción.
     */
    async reubicar(id: number, destino: z.infer<typeof montajeSchema>, usuarioId: number, ip?: string) {
        const neumatico = await obtenerOFallar(id);
        if (neumatico.estado === EstadoNeumatico.DESECHO) throw new ConflictError('El neumático está dado de baja');

        const vehiculoId = destino.vehiculoId ?? null;
        const posicion = vehiculoId ? destino.posicionActual ?? null : null;
        if (vehiculoId && !posicion) throw new ValidationError('Indique la posición de montaje en el vehículo');
        if (vehiculoId && !await vehiculoRepository.findById(vehiculoId)) throw new ValidationError('Vehículo de destino no encontrado');

        return enTransaccion(async tx => {
            const ocupante = vehiculoId && posicion
                ? await neumaticoRepository.findEnPosicion(vehiculoId, posicion, id, tx)
                : null;

            if (ocupante) {
                // El ocupante toma el lugar anterior de la llanta que se mueve (o pasa a bodega)
                await neumaticoRepository.update(ocupante.id, {
                    vehiculoId: neumatico.vehiculoId,
                    posicionActual: neumatico.posicionActual,
                    estado: estadoSegunMontaje(!!neumatico.vehiculoId, ocupante.kilometrosRecorridos),
                    fechaInstalacion: neumatico.vehiculoId ? new Date() : null,
                }, tx);
            }

            const movido = await neumaticoRepository.update(id, {
                vehiculoId,
                posicionActual: posicion,
                estado: estadoSegunMontaje(!!vehiculoId, neumatico.kilometrosRecorridos),
                fechaInstalacion: vehiculoId ? new Date() : null,
            }, tx);

            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.EDITAR, entidad: 'Neumatico', entidadId: id,
                datosAnteriores: { vehiculoId: neumatico.vehiculoId, posicionActual: neumatico.posicionActual },
                datosNuevos: { vehiculoId, posicionActual: posicion, intercambioCon: ocupante?.codigoSerie ?? null },
                ipAddress: ip,
            }, tx);
            return movido;
        });
    },

    // El reencauche renueva la banda de rodamiento y suma su costo a la inversión de la llanta
    async reencauchar(id: number, datos: z.infer<typeof reencaucheSchema>, usuarioId: number, ip?: string) {
        const neumatico = await obtenerOFallar(id);
        if (neumatico.estado === EstadoNeumatico.DESECHO) throw new ConflictError('El neumático está dado de baja');

        return enTransaccion(async tx => {
            const actualizado = await neumaticoRepository.update(id, {
                profundidadInicialMm: datos.profundidadMm,
                profundidadActualMm: datos.profundidadMm,
                costoCompra: Number(neumatico.costoCompra) + datos.costo,
                numeroReencauches: { increment: 1 },
            }, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.EDITAR, entidad: 'Neumatico', entidadId: id,
                datosAnteriores: {
                    profundidadActualMm: Number(neumatico.profundidadActualMm),
                    costoCompra: Number(neumatico.costoCompra),
                    numeroReencauches: neumatico.numeroReencauches,
                },
                datosNuevos: { reencauche: { costo: datos.costo, profundidadMm: datos.profundidadMm, observaciones: datos.observaciones } },
                ipAddress: ip,
            }, tx);
            return actualizado;
        });
    },

    async resumenFlota() {
        const todos = (await neumaticoRepository.findAll()).map(n => presentarNeumatico(n as NeumaticoDb));
        const activos = todos.filter(n => n.estado !== EstadoNeumatico.DESECHO);
        const montados = activos.filter(n => n.vehiculoId !== null);
        const conKm = activos.filter(n => n.kilometrosRecorridos > 0);
        const kmTotal = conKm.reduce((s, n) => s + n.kilometrosRecorridos, 0);
        const costoConKm = conKm.reduce((s, n) => s + n.costoCompra, 0);

        return {
            total: activos.length,
            montados: montados.length,
            enBodega: activos.length - montados.length,
            criticos: activos.filter(n => n.salud === 'CRITICO').length,
            advertencias: activos.filter(n => n.salud === 'ADVERTENCIA').length,
            inversionTotal: Number(activos.reduce((s, n) => s + n.costoCompra, 0).toFixed(2)),
            costoPorKmPromedio: calcularCpkNeumatico(costoConKm, kmTotal),
        };
    },
};
