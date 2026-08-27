// Servicio de Dashboard - Resumen del sistema
import { vehiculoRepository } from '../repositories/vehiculo.repository';
import { choferRepository } from '../repositories/chofer.repository';
import { clienteRepository } from '../repositories/cliente.repository';
import { materialRepository } from '../repositories/material.repository';
import { viajesRepository } from '../repositories/viajes.repository';
import { gastosRepository } from '../repositories/gastos.repository';
import { mantenimientoRepository } from '../repositories/mantenimiento.repository';
import { pagoChoferRepository } from '../repositories/pagoChofer.repository';
import { cumplimientoService } from './cumplimiento.service';
import { dividir } from '../domain/finanzas';

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
            gastosMensuales,
            costosMantenimientoMensuales,
            pagosChoferesMensuales,
            alertasMantenimiento,
            cumplimiento
        ] = await Promise.all([
            vehiculoRepository.countActivos(),
            vehiculoRepository.countTotal(),
            choferRepository.countActivos(),
            choferRepository.countTotal(),
            clienteRepository.countActivos(),
            clienteRepository.countTotal(),
            materialRepository.countTotal(),
            viajesRepository.getEstadisticasMensuales(anioActual, mesActual),
            gastosRepository.getGastosMensuales(anioActual, mesActual),
            mantenimientoRepository.getCostosMensuales(anioActual, mesActual),
            pagoChoferRepository.getPagosMensuales(anioActual, mesActual),
            mantenimientoRepository.getAlertasMantenimiento(),
            cumplimientoService.obtenerEstado()
        ]);

        const ingresos = estadisticasViajes.ingresosTotales;
        const costosDirectos = gastosMensuales;
        const costosMantenimiento = costosMantenimientoMensuales;
        const pagosChoferes = pagosChoferesMensuales;
        const costosTotales = costosDirectos + costosMantenimiento + pagosChoferes;
        const gananciaEstimada = ingresos - costosDirectos;
        const gananciaNeta = ingresos - costosTotales;
        const margenNetoPorcentaje = ingresos > 0 ? (gananciaNeta / ingresos) * 100 : 0;

        return {
            vehiculos: { activos: vehiculosActivos, total: vehiculosTotal },
            choferes: { activos: choferesActivos, total: choferesTotal },
            clientes: { activos: clientesActivos, total: clientesTotal },
            materiales: { total: materialesTotal },
            viajesMes: {
                total: estadisticasViajes.totalViajes,
                completados: estadisticasViajes.viajesCompletados,
                ingresosTotal: ingresos,
                gastosTotales: costosDirectos,
                costosMantenimiento: costosMantenimiento,
                pagosChoferes: pagosChoferes,
                costosTotales: costosTotales,
                gananciaEstimada: gananciaEstimada,
                gananciaNeta: gananciaNeta,
                margenNetoPorcentaje: Number(margenNetoPorcentaje.toFixed(1)),
                kilometrosRecorridos: estadisticasViajes.kilometrosRecorridos ?? 0,
                // CPK del mes: todos los costos operativos sobre los km de viajes completados
                costoPorKm: dividir(costosTotales, estadisticasViajes.kilometrosRecorridos ?? 0)
            },
            alertasMantenimiento,
            cumplimiento: {
                resumen: cumplimiento.resumen,
                alertas: cumplimiento.alertas.slice(0, 10)
            }
        };
    }
};
