// Servicio de Dashboard - Resumen del sistema
import { vehiculoRepository } from '../repositories/vehiculo.repository';
import { choferRepository } from '../repositories/chofer.repository';
import { clienteRepository } from '../repositories/cliente.repository';
import { materialRepository } from '../repositories/material.repository';

export const dashboardService = {
    async obtenerResumen() {
        const [vehiculosActivos, vehiculosTotal, choferesActivos, choferesTotal, clientesActivos, clientesTotal, materialesTotal] = await Promise.all([
            vehiculoRepository.countActivos(),
            vehiculoRepository.countTotal(),
            choferRepository.countActivos(),
            choferRepository.countTotal(),
            clienteRepository.countActivos(),
            clienteRepository.countTotal(),
            materialRepository.countTotal()
        ]);

        return {
            vehiculos: { activos: vehiculosActivos, total: vehiculosTotal },
            choferes: { activos: choferesActivos, total: choferesTotal },
            clientes: { activos: clientesActivos, total: clientesTotal },
            materiales: { total: materialesTotal }
        };
    }
};
