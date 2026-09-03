import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/repositories/vehiculo.repository', () => ({
  vehiculoRepository: {
    countActivos: vi.fn().mockResolvedValue(5),
    countTotal: vi.fn().mockResolvedValue(6),
    findParaCumplimiento: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../src/repositories/chofer.repository', () => ({
  choferRepository: {
    countActivos: vi.fn().mockResolvedValue(4),
    countTotal: vi.fn().mockResolvedValue(5),
    findParaCumplimiento: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../src/repositories/cliente.repository', () => ({
  clienteRepository: {
    countActivos: vi.fn().mockResolvedValue(10),
    countTotal: vi.fn().mockResolvedValue(12),
  },
}));

vi.mock('../src/repositories/material.repository', () => ({
  materialRepository: {
    countTotal: vi.fn().mockResolvedValue(5),
  },
}));

vi.mock('../src/repositories/viajes.repository', () => ({
  viajesRepository: {
    getEstadisticasMensuales: vi.fn(),
  },
}));

vi.mock('../src/repositories/gastos.repository', () => ({
  gastosRepository: {
    getGastosMensuales: vi.fn(),
  },
}));

vi.mock('../src/repositories/mantenimiento.repository', () => ({
  mantenimientoRepository: {
    getCostosMensuales: vi.fn(),
    getAlertasMantenimiento: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../src/repositories/pagoChofer.repository', () => ({
  pagoChoferRepository: {
    getPagosMensuales: vi.fn(),
  },
}));

import { dashboardService } from '../src/services/dashboard.service';
import { viajesRepository } from '../src/repositories/viajes.repository';
import { gastosRepository } from '../src/repositories/gastos.repository';
import { mantenimientoRepository } from '../src/repositories/mantenimiento.repository';
import { pagoChoferRepository } from '../src/repositories/pagoChofer.repository';

describe('TDD - Cierre Financiero y Métricas Operativas (Mini-ERP)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe calcular la ganancia neta restando costos directos, mantenimientos y pagos a choferes', async () => {
    // GIVEN:
    // Ingresos por tarifas: $10,000
    // Gastos directos de ruta (viáticos): $2,000
    // Mantenimientos de taller: $1,500
    // Pagos a choferes (nómina y fletes): $3,000
    vi.spyOn(viajesRepository, 'getEstadisticasMensuales').mockResolvedValue({
      totalViajes: 8,
      viajesCompletados: 7,
      ingresosTotales: 10000,
    });
    vi.spyOn(gastosRepository, 'getGastosMensuales').mockResolvedValue(2000);
    vi.spyOn(mantenimientoRepository, 'getCostosMensuales').mockResolvedValue(1500);
    vi.spyOn(pagoChoferRepository, 'getPagosMensuales').mockResolvedValue(3000);

    // WHEN
    const resumen = await dashboardService.obtenerResumen();
    const financiero = resumen.viajesMes;

    // THEN:
    // Costos Totales = 2000 + 1500 + 3000 = 6500
    // Ganancia Neta = 10000 - 6500 = 3500
    // Margen Neto = (3500 / 10000) * 100 = 35.0%
    expect(financiero.ingresosTotal).toBe(10000);
    expect(financiero.gastosTotales).toBe(2000);
    expect(financiero.costosMantenimiento).toBe(1500);
    expect(financiero.pagosChoferes).toBe(3000);
    expect(financiero.costosTotales).toBe(6500);
    expect(financiero.gananciaNeta).toBe(3500);
    expect(financiero.margenNetoPorcentaje).toBe(35.0);
  });

  it('debe manejar adecuadamente meses con cero ingresos sin división por cero', async () => {
    vi.spyOn(viajesRepository, 'getEstadisticasMensuales').mockResolvedValue({
      totalViajes: 0,
      viajesCompletados: 0,
      ingresosTotales: 0,
    });
    vi.spyOn(gastosRepository, 'getGastosMensuales').mockResolvedValue(0);
    vi.spyOn(mantenimientoRepository, 'getCostosMensuales').mockResolvedValue(400); // Gasto fijo
    vi.spyOn(pagoChoferRepository, 'getPagosMensuales').mockResolvedValue(0);

    const resumen = await dashboardService.obtenerResumen();
    const financiero = resumen.viajesMes;

    expect(financiero.ingresosTotal).toBe(0);
    expect(financiero.gananciaNeta).toBe(-400);
    expect(financiero.margenNetoPorcentaje).toBe(0);
  });
});
