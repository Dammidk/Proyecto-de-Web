// Repositorio de Analítica - Consultas de solo lectura para indicadores de gestión
import prisma from '../config/database';
import { EstadoMantenimiento, EstadoViaje } from '@prisma/client';

export const analiticaRepository = {
    // Viajes no cancelados que salieron en el período, con sus gastos y pagos
    async viajesDelPeriodo(desde: Date, hasta: Date) {
        return prisma.viaje.findMany({
            where: {
                fechaSalida: { gte: desde, lte: hasta },
                estado: { not: EstadoViaje.CANCELADO },
            },
            select: {
                id: true, estado: true, vehiculoId: true, choferId: true, clienteId: true,
                origen: true, destino: true, tarifa: true,
                kilometrosReales: true, kilometrosEstimados: true,
                fechaSalida: true, fechaLlegadaReal: true, fechaLlegadaEstimada: true,
                gastos: { select: { tipoGasto: true, monto: true, metodoPago: true, galones: true } },
                pagosChofer: { select: { tipoPago: true, monto: true } },
                vehiculo: { select: { placa: true } },
                chofer: { select: { nombres: true, apellidos: true } },
                cliente: { select: { nombreRazonSocial: true } },
            },
        });
    },

    async gastosDelPeriodo(desde: Date, hasta: Date) {
        return prisma.gastoViaje.findMany({
            where: { fecha: { gte: desde, lte: hasta } },
            select: { tipoGasto: true, monto: true, fecha: true },
        });
    },

    async mantenimientosDelPeriodo(desde: Date, hasta: Date) {
        return prisma.mantenimiento.findMany({
            where: { fecha: { gte: desde, lte: hasta }, estado: { not: EstadoMantenimiento.CANCELADO } },
            select: { vehiculoId: true, tipo: true, costoTotal: true, fecha: true },
        });
    },

    async pagosDelPeriodo(desde: Date, hasta: Date) {
        return prisma.pagoChofer.findMany({
            where: { fecha: { gte: desde, lte: hasta } },
            select: { choferId: true, tipoPago: true, monto: true, fecha: true },
        });
    },

    async vehiculos() {
        return prisma.vehiculo.findMany({
            select: { id: true, placa: true, marca: true, modelo: true, estado: true, rendimientoEsperadoKmGal: true },
            orderBy: { placa: 'asc' },
        });
    },
};
