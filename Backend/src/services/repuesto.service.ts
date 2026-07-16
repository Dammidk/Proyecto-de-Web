// Servicio de Repuestos - catálogo de bodega y kardex de movimientos
import { z } from 'zod';
import { AccionAuditoria, CategoriaRepuesto, TipoMovimientoRepuesto } from '@prisma/client';
import { enTransaccion } from '../config/database';
import { repuestoRepository, FiltrosRepuesto } from '../repositories/repuesto.repository';
import { vehiculoRepository } from '../repositories/vehiculo.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';
import { cantidadSugeridaReposicion, costoPromedioPonderado, nivelDeStock, valorInventario } from '../domain/inventario';
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { numeroOpcional, textoOpcional } from '../utils/http';

export const repuestoSchema = z.object({
    codigo: z.string().trim().min(2, 'Código mínimo de 2 caracteres').max(30),
    nombre: z.string().trim().min(2, 'Nombre requerido'),
    categoria: z.nativeEnum(CategoriaRepuesto).default(CategoriaRepuesto.OTRO),
    unidadMedida: z.string().trim().min(1).default('UNIDAD'),
    stockActual: z.coerce.number().int().min(0).default(0),
    stockMinimo: z.coerce.number().int().min(0).default(2),
    costoUnitario: z.coerce.number().min(0, 'El costo no puede ser negativo'),
    ubicacion: textoOpcional,
});

// El stock solo cambia mediante movimientos de kardex, nunca por edición directa
export const repuestoUpdateSchema = repuestoSchema.omit({ stockActual: true }).partial();

export const movimientoSchema = z.object({
    tipo: z.nativeEnum(TipoMovimientoRepuesto),
    cantidad: z.coerce.number().int().min(0, 'La cantidad no puede ser negativa'),
    costoUnitario: numeroOpcional(z.coerce.number().min(0)),
    motivo: textoOpcional,
    referencia: textoOpcional,
    vehiculoId: numeroOpcional(z.coerce.number().int().positive()),
});

type RepuestoBase = { stockActual: number; stockMinimo: number; costoUnitario: unknown };

const presentar = <T extends RepuestoBase>(r: T) => {
    const costoUnitario = Number(r.costoUnitario);
    return {
        ...r,
        costoUnitario,
        valorTotal: Number((r.stockActual * costoUnitario).toFixed(2)),
        nivel: nivelDeStock(r.stockActual, r.stockMinimo),
        reposicionSugerida: cantidadSugeridaReposicion(r.stockActual, r.stockMinimo),
    };
};

const obtenerOFallar = async (id: number) => {
    const r = await repuestoRepository.findById(id);
    if (!r) throw new NotFoundError('Repuesto no encontrado');
    return r;
};

export const repuestoService = {
    async listar(filtros: FiltrosRepuesto = {}) {
        return (await repuestoRepository.findAll(filtros)).map(presentar);
    },

    async obtenerPorId(id: number) {
        const r = await obtenerOFallar(id);
        return presentar({
            ...r,
            movimientos: r.movimientos.map(m => ({ ...m, costoUnitario: Number(m.costoUnitario) })),
        });
    },

    async crear(datos: z.infer<typeof repuestoSchema>, usuarioId: number, ip?: string) {
        const codigo = datos.codigo.toUpperCase();
        if (await repuestoRepository.findByCodigo(codigo)) {
            throw new ConflictError(`Ya existe un repuesto con el código ${codigo}`);
        }

        return enTransaccion(async tx => {
            const nuevo = await repuestoRepository.create({
                codigo,
                nombre: datos.nombre,
                categoria: datos.categoria,
                unidadMedida: datos.unidadMedida.toUpperCase(),
                stockActual: datos.stockActual,
                stockMinimo: datos.stockMinimo,
                costoUnitario: datos.costoUnitario,
                ubicacion: datos.ubicacion ?? null,
            }, tx);

            if (datos.stockActual > 0) {
                await repuestoRepository.crearMovimiento({
                    repuestoId: nuevo.id,
                    tipo: TipoMovimientoRepuesto.ENTRADA,
                    cantidad: datos.stockActual,
                    costoUnitario: datos.costoUnitario,
                    stockResultante: datos.stockActual,
                    motivo: 'Inventario inicial',
                    usuarioId,
                }, tx);
            }
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.CREAR, entidad: 'Repuesto', entidadId: nuevo.id, datosNuevos: nuevo, ipAddress: ip,
            }, tx);
            return nuevo;
        });
    },

    async actualizar(id: number, datos: z.infer<typeof repuestoUpdateSchema>, usuarioId: number, ip?: string) {
        const anterior = await obtenerOFallar(id);
        const cambios = { ...datos } as Record<string, unknown>;
        if (datos.codigo) {
            const codigo = datos.codigo.toUpperCase();
            const existente = await repuestoRepository.findByCodigo(codigo);
            if (existente && existente.id !== id) throw new ConflictError(`Ya existe un repuesto con el código ${codigo}`);
            cambios.codigo = codigo;
        }
        if (datos.unidadMedida) cambios.unidadMedida = datos.unidadMedida.toUpperCase();

        return enTransaccion(async tx => {
            const actualizado = await repuestoRepository.update(id, cambios, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.EDITAR, entidad: 'Repuesto', entidadId: id,
                datosAnteriores: { ...anterior, movimientos: undefined }, datosNuevos: actualizado, ipAddress: ip,
            }, tx);
            return actualizado;
        });
    },

    /**
     * Registra un movimiento de kardex.
     * - ENTRADA: suma stock y recalcula el costo promedio ponderado.
     * - SALIDA: resta stock (exige vehículo o motivo) y falla si no hay existencias.
     * - AJUSTE: la cantidad es el stock contado físicamente; se guarda la diferencia.
     */
    async registrarMovimiento(id: number, datos: z.infer<typeof movimientoSchema>, usuarioId: number, ip?: string) {
        await obtenerOFallar(id);
        const { tipo, cantidad } = datos;
        if (tipo !== TipoMovimientoRepuesto.AJUSTE && cantidad <= 0) {
            throw new ValidationError('La cantidad debe ser mayor a 0');
        }
        if (tipo === TipoMovimientoRepuesto.SALIDA && !datos.vehiculoId && !datos.motivo) {
            throw new ValidationError('Indique el vehículo destino o el motivo de la salida');
        }
        if (tipo === TipoMovimientoRepuesto.AJUSTE && !datos.motivo) {
            throw new ValidationError('Todo ajuste de inventario requiere un motivo');
        }
        if (datos.vehiculoId && !await vehiculoRepository.findById(datos.vehiculoId)) {
            throw new ValidationError('El vehículo indicado no existe');
        }

        return enTransaccion(async tx => {
            const actual = await repuestoRepository.findBasico(id, tx);
            if (!actual) throw new NotFoundError('Repuesto no encontrado');
            const costoActual = Number(actual.costoUnitario);

            let delta: number;
            let costoMovimiento = costoActual;
            let cantidadRegistrada = cantidad;

            if (tipo === TipoMovimientoRepuesto.ENTRADA) {
                delta = cantidad;
                costoMovimiento = datos.costoUnitario ?? costoActual;
            } else if (tipo === TipoMovimientoRepuesto.SALIDA) {
                delta = -cantidad;
            } else {
                delta = cantidad - actual.stockActual;
                cantidadRegistrada = delta;
                if (delta === 0) throw new BusinessRuleError('El stock contado coincide con el stock del sistema');
            }

            const stockResultante = await repuestoRepository.ajustarStockAtomico(id, delta, tx);
            if (stockResultante === null) {
                throw new BusinessRuleError(`Stock insuficiente: hay ${actual.stockActual} y se solicitan ${cantidad}`);
            }

            if (tipo === TipoMovimientoRepuesto.ENTRADA && costoMovimiento !== costoActual) {
                await repuestoRepository.update(id, {
                    costoUnitario: costoPromedioPonderado(actual.stockActual, costoActual, cantidad, costoMovimiento),
                }, tx);
            }

            const movimiento = await repuestoRepository.crearMovimiento({
                repuestoId: id,
                tipo,
                cantidad: cantidadRegistrada,
                costoUnitario: costoMovimiento,
                stockResultante,
                motivo: datos.motivo ?? null,
                referencia: datos.referencia ?? null,
                vehiculoId: datos.vehiculoId ?? null,
                usuarioId,
            }, tx);

            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.EDITAR, entidad: 'Repuesto', entidadId: id,
                datosAnteriores: { stockActual: actual.stockActual },
                datosNuevos: { movimiento: tipo, cantidad: cantidadRegistrada, stockActual: stockResultante },
                ipAddress: ip,
            }, tx);
            return { movimiento, stockActual: stockResultante };
        });
    },

    // Un repuesto con historial no se elimina para conservar la trazabilidad del kardex
    async eliminar(id: number, usuarioId: number, ip?: string) {
        const anterior = await obtenerOFallar(id);
        const movimientos = await repuestoRepository.contarMovimientos(id);
        const soloInicial = movimientos <= 1 && anterior.movimientos.every(m => m.motivo === 'Inventario inicial');
        if (!soloInicial) {
            throw new ConflictError('El repuesto tiene movimientos en el kardex y no puede eliminarse');
        }

        await enTransaccion(async tx => {
            await tx.movimientoRepuesto.deleteMany({ where: { repuestoId: id } });
            await repuestoRepository.delete(id, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.ELIMINAR, entidad: 'Repuesto', entidadId: id,
                datosAnteriores: { ...anterior, movimientos: undefined }, ipAddress: ip,
            }, tx);
        });
    },

    async resumen() {
        const items = (await repuestoRepository.findAll()).map(presentar);
        const porCategoria = new Map<string, { categoria: string; items: number; valor: number }>();
        for (const i of items) {
            const previo = porCategoria.get(i.categoria) ?? { categoria: i.categoria, items: 0, valor: 0 };
            previo.items += 1;
            previo.valor += i.valorTotal;
            porCategoria.set(i.categoria, previo);
        }
        return {
            totalItems: items.length,
            agotados: items.filter(i => i.nivel === 'AGOTADO').length,
            bajoStock: items.filter(i => i.nivel === 'BAJO').length,
            valorInventario: valorInventario(items),
            porCategoria: [...porCategoria.values()].map(c => ({ ...c, valor: Number(c.valor.toFixed(2)) })),
            reposicion: items
                .filter(i => i.nivel !== 'NORMAL')
                .map(i => ({ id: i.id, codigo: i.codigo, nombre: i.nombre, stockActual: i.stockActual, stockMinimo: i.stockMinimo, sugerido: i.reposicionSugerida, nivel: i.nivel })),
        };
    },

    async movimientosRecientes() {
        const lista = await repuestoRepository.movimientosRecientes();
        return lista.map(m => ({ ...m, costoUnitario: Number(m.costoUnitario) }));
    },
};
