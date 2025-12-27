// Servicio de Dashboard - Resumen del sistema
import { vehiculoRepository } from '../repositories/vehiculo.repository';
import { choferRepository } from '../repositories/chofer.repository';
import { clienteRepository } from '../repositories/cliente.repository';
import { materialRepository } from '../repositories/material.repository';
import { viajesRepository } from '../repositories/viajes.repository';
import { gastosRepository } from '../repositories/gastos.repository';

export const dashboardService = {
    async obtenerResumen() {
        // Obtener mes y año actual
        const ahora = new Date();
        const mesActual = ahora.getMonth() + 1;
        const anioActual = ahora.getFullYear();

        const [
            vehiculosActivos,
            vehiculosTotal,
            choferesActivos,
            choferesTotal,
            clientesActivos,
            clientesTotal,
            materialesTotal,
            estadisticasViajes,
            gastosMensuales
        ] = await Promise.all([
            vehiculoRepository.countActivos(),
            vehiculoRepository.countTotal(),
            choferRepository.countActivos(),
            choferRepository.countTotal(),
            clienteRepository.countActivos(),
            clienteRepository.countTotal(),
            materialRepository.countTotal(),
            viajesRepository.getEstadisticasMensuales(anioActual, mesActual),
            gastosRepository.getGastosMensuales(anioActual, mesActual)
        ]);

        return {
            vehiculos: { activos: vehiculosActivos, total: vehiculosTotal },
            choferes: { activos: choferesActivos, total: choferesTotal },
            clientes: { activos: clientesActivos, total: clientesTotal },
            materiales: { total: materialesTotal },
            viajesMes: {
                total: estadisticasViajes.totalViajes,
                completados: estadisticasViajes.viajesCompletados,
                ingresosTotal: estadisticasViajes.ingresosTotales,
                gastosTotales: gastosMensuales,
                gananciaEstimada: estadisticasViajes.ingresosTotales - gastosMensuales
            }
        };
    }
};
