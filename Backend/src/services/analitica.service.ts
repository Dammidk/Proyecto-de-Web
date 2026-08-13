// Servicio de Analítica - Indicadores de gestión para gerencia
import { analiticaRepository } from '../repositories/analitica.repository';
import {
    Periodo, distribucionCostos, indicadoresPorChofer, indicadoresPorVehiculo, kpisFlota,
    rentabilidadPorCliente, rentabilidadPorRuta, serieMensual,
} from '../domain/analitica';
import { ValidationError } from '../utils/errors';

// Período por defecto: los últimos 12 meses completos hasta hoy
export const periodoPorDefecto = (ahora: Date = new Date()): Periodo => ({
    desde: new Date(ahora.getFullYear(), ahora.getMonth() - 11, 1),
    hasta: new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999),
});

export const resolverPeriodo = (desde?: Date, hasta?: Date): Periodo => {
    const base = periodoPorDefecto();
    const periodo = {
        desde: desde ?? base.desde,
        hasta: hasta ? new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate(), 23, 59, 59, 999) : base.hasta,
    };
    if (periodo.desde > periodo.hasta) {
        throw new ValidationError('La fecha "desde" debe ser anterior a "hasta"');
    }
    const dias = (periodo.hasta.getTime() - periodo.desde.getTime()) / (24 * 60 * 60 * 1000);
    if (dias > 3 * 366) {
        throw new ValidationError('El período máximo de análisis es de 3 años');
    }
    return periodo;
};

export const analiticaService = {
    async obtenerTablero(periodo: Periodo) {
        const [viajes, gastos, mantenimientos, pagos, vehiculos] = await Promise.all([
            analiticaRepository.viajesDelPeriodo(periodo.desde, periodo.hasta),
            analiticaRepository.gastosDelPeriodo(periodo.desde, periodo.hasta),
            analiticaRepository.mantenimientosDelPeriodo(periodo.desde, periodo.hasta),
            analiticaRepository.pagosDelPeriodo(periodo.desde, periodo.hasta),
            analiticaRepository.vehiculos(),
        ]);

        const serie = serieMensual(periodo, viajes, gastos, mantenimientos, pagos);
        const porVehiculo = indicadoresPorVehiculo(vehiculos, viajes, mantenimientos, periodo);

        return {
            periodo,
            kpis: kpisFlota(serie, porVehiculo),
            serieMensual: serie,
            distribucionCostos: distribucionCostos(gastos, mantenimientos, pagos),
            vehiculos: porVehiculo,
            clientes: rentabilidadPorCliente(viajes),
            rutas: rentabilidadPorRuta(viajes),
            choferes: indicadoresPorChofer(viajes, pagos),
        };
    },
};
