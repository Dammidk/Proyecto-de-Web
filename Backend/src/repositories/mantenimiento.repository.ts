// Repositorio de Mantenimientos - Acceso a BD
import prisma, { Db } from '../config/database';
import { TipoMantenimiento, EstadoMantenimiento } from '@prisma/client';

export interface FiltrosMantenimiento {
    vehiculoId?: number;
    tipo?: TipoMantenimiento;
    estado?: EstadoMantenimiento;
    fechaDesde?: Date;
    fechaHasta?: Date;
    busqueda?: string;
}

export interface DatosCrearMantenimiento {
    vehiculoId: number;
    tipo: TipoMantenimiento;
    estado?: EstadoMantenimiento;
    descripcion: string;
    taller: string;
    esExterno?: boolean;
    costoManoObra?: number;
    costoRepuestos?: number;
    costoTotal: number;
    fecha: Date;
    kilometrajeAlMomento?: number;
    proximaFecha?: Date;
    proximoKilometraje?: number;
    observaciones?: string;
    urlComprobante?: string;
}

export const mantenimientoRepository = {
    async findAll(filtros: FiltrosMantenimiento = {}) {
        const where: any = {};

        if (filtros.vehiculoId) {
            where.vehiculoId = filtros.vehiculoId;
        }

        if (filtros.tipo) {
            where.tipo = filtros.tipo;
        }

        if (filtros.estado) {
            where.estado = filtros.estado;
        }

        if (filtros.fechaDesde || filtros.fechaHasta) {
            where.fecha = {};
            if (filtros.fechaDesde) where.fecha.gte = filtros.fechaDesde;
            if (filtros.fechaHasta) where.fecha.lte = filtros.fechaHasta;
        }

        if (filtros.busqueda) {
            where.OR = [
                { descripcion: { contains: filtros.busqueda, mode: 'insensitive' } },
                { taller: { contains: filtros.busqueda, mode: 'insensitive' } },
                { vehiculo: { placa: { contains: filtros.busqueda, mode: 'insensitive' } } },
            ];
        }

        return prisma.mantenimiento.findMany({
            where,
            include: {
                vehiculo: {
                    select: {
                        id: true,
                        placa: true,
                        marca: true,
                        modelo: true,
                        kilometrajeActual: true,
                        estado: true,
                    },
                },
            },
            orderBy: { fecha: 'desc' },
        });
    },

    async findById(id: number, db: Db = prisma) {
        return db.mantenimiento.findUnique({
            where: { id },
            include: {
                vehiculo: true,
            },
        });
    },

    async create(data: DatosCrearMantenimiento, db: Db = prisma) {
        return db.mantenimiento.create({
            data: {
                vehiculoId: data.vehiculoId,
                tipo: data.tipo,
                estado: data.estado || EstadoMantenimiento.COMPLETADO,
                descripcion: data.descripcion,
                taller: data.taller,
                esExterno: data.esExterno ?? true,
                costoManoObra: data.costoManoObra ?? 0,
                costoRepuestos: data.costoRepuestos ?? 0,
                costoTotal: data.costoTotal,
                fecha: data.fecha,
                kilometrajeAlMomento: data.kilometrajeAlMomento,
                proximaFecha: data.proximaFecha,
                proximoKilometraje: data.proximoKilometraje,
                observaciones: data.observaciones,
                urlComprobante: data.urlComprobante,
            },
            include: {
                vehiculo: true,
            },
        });
    },

    async update(id: number, data: Partial<DatosCrearMantenimiento>, db: Db = prisma) {
        return db.mantenimiento.update({
            where: { id },
            data,
            include: {
                vehiculo: true,
            },
        });
    },

    async delete(id: number, db: Db = prisma) {
        return db.mantenimiento.delete({
            where: { id },
        });
    },

    async getCostosMensuales(anio: number, mes: number): Promise<number> {
        const fechaInicio = new Date(anio, mes - 1, 1);
        const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999);

        const resultado = await prisma.mantenimiento.aggregate({
            _sum: {
                costoTotal: true,
            },
            where: {
                fecha: {
                    gte: fechaInicio,
                    lte: fechaFin,
                },
                estado: {
                    not: EstadoMantenimiento.CANCELADO,
                },
            },
        });

        return Number(resultado._sum.costoTotal || 0);
    },

    async getAlertasMantenimiento() {
        const ahora = new Date();
        const enSieteDias = new Date();
        enSieteDias.setDate(ahora.getDate() + 7);

        // Vehículos con mantenimiento próximo o vencido
        const vehiculos = await prisma.vehiculo.findMany({
            where: {
                estado: { in: ['ACTIVO', 'EN_RUTA', 'EN_MANTENIMIENTO'] },
            },
            include: {
                mantenimientos: {
                    orderBy: { fecha: 'desc' },
                    take: 1,
                },
            },
        });

        const alertas: Array<{
            vehiculoId: number;
            placa: string;
            marca: string;
            modelo: string;
            kilometrajeActual: number;
            tipoAlerta: 'VENCIDO_FECHA' | 'PROXIMO_FECHA' | 'VENCIDO_KM' | 'PROXIMO_KM';
            mensaje: string;
            fechaProgramada?: Date | null;
            kmProgramado?: number | null;
        }> = [];

        for (const v of vehiculos) {
            // Chequeo por fecha de próximo mantenimiento
            if (v.fechaProximoMantenimiento) {
                const fechaProx = new Date(v.fechaProximoMantenimiento);
                if (fechaProx < ahora) {
                    alertas.push({
                        vehiculoId: v.id,
                        placa: v.placa,
                        marca: v.marca,
                        modelo: v.modelo,
                        kilometrajeActual: v.kilometrajeActual,
                        tipoAlerta: 'VENCIDO_FECHA',
                        mensaje: `Mantenimiento vencido desde el ${fechaProx.toLocaleDateString('es-EC')}`,
                        fechaProgramada: fechaProx,
                    });
                } else if (fechaProx <= enSieteDias) {
                    alertas.push({
                        vehiculoId: v.id,
                        placa: v.placa,
                        marca: v.marca,
                        modelo: v.modelo,
                        kilometrajeActual: v.kilometrajeActual,
                        tipoAlerta: 'PROXIMO_FECHA',
                        mensaje: `Mantenimiento programado para el ${fechaProx.toLocaleDateString('es-EC')} (en menos de 7 días)`,
                        fechaProgramada: fechaProx,
                    });
                }
            }

            // Chequeo por kilometraje si el último mantenimiento definió un próximo kilometraje
            const ultimoMantenimiento = v.mantenimientos[0];
            if (ultimoMantenimiento?.proximoKilometraje) {
                const kmRestante = ultimoMantenimiento.proximoKilometraje - v.kilometrajeActual;
                if (kmRestante <= 0) {
                    alertas.push({
                        vehiculoId: v.id,
                        placa: v.placa,
                        marca: v.marca,
                        modelo: v.modelo,
                        kilometrajeActual: v.kilometrajeActual,
                        tipoAlerta: 'VENCIDO_KM',
                        mensaje: `Mantenimiento por kilometraje superado por ${Math.abs(kmRestante)} km (Límite: ${ultimoMantenimiento.proximoKilometraje} km)`,
                        kmProgramado: ultimoMantenimiento.proximoKilometraje,
                    });
                } else if (kmRestante <= 1000) {
                    alertas.push({
                        vehiculoId: v.id,
                        placa: v.placa,
                        marca: v.marca,
                        modelo: v.modelo,
                        kilometrajeActual: v.kilometrajeActual,
                        tipoAlerta: 'PROXIMO_KM',
                        mensaje: `Mantenimiento próximo por kilometraje: faltan ${kmRestante} km`,
                        kmProgramado: ultimoMantenimiento.proximoKilometraje,
                    });
                }
            }
        }

        return alertas;
    },
};
