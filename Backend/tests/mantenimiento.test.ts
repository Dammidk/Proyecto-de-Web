import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EstadoMantenimiento, EstadoVehiculo, TipoMantenimiento } from '@prisma/client';

// Mock dependencies
vi.mock('../src/config/database', () => ({
  // La transacción ejecuta el callback con un cliente simulado
  enTransaccion: vi.fn((fn: (tx: unknown) => unknown) => fn({ tx: true })),
  default: {
    mantenimiento: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    vehiculo: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    registroAuditoria: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../src/repositories/auditoria.repository', () => ({
  auditoriaRepository: {
    create: vi.fn().mockResolvedValue({ id: 1 }),
  },
}));

import { mantenimientoService } from '../src/services/mantenimiento.service';
import { mantenimientoRepository } from '../src/repositories/mantenimiento.repository';
import { vehiculoRepository } from '../src/repositories/vehiculo.repository';

describe('TDD - Módulo de Mantenimientos (Reglas de Negocio)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Actualización automática de odómetro del vehículo', () => {
    it('debe actualizar el odómetro del vehículo si el kilometraje del servicio es mayor al actual', async () => {
      // GIVEN: Vehículo con 50,000 km
      const mockVehiculo = {
        id: 10,
        placa: 'ABC-1234',
        kilometrajeActual: 50000,
        estado: EstadoVehiculo.ACTIVO,
      };

      vi.spyOn(vehiculoRepository, 'findById').mockResolvedValue(mockVehiculo as any);
      vi.spyOn(vehiculoRepository, 'update').mockResolvedValue({ ...mockVehiculo, kilometrajeActual: 55000 } as any);
      vi.spyOn(mantenimientoRepository, 'create').mockResolvedValue({
        id: 1,
        vehiculoId: 10,
        tipo: TipoMantenimiento.PREVENTIVO,
        costoTotal: 400 as any,
        kilometrajeAlMomento: 55000,
        fecha: new Date('2026-10-01'),
      } as any);

      // WHEN: Se registra mantenimiento con 55,000 km
      await mantenimientoService.crear(
        {
          vehiculoId: 10,
          tipo: TipoMantenimiento.PREVENTIVO,
          descripcion: 'Cambio de aceite',
          taller: 'Taller Central',
          costoManoObra: 100,
          costoRepuestos: 300,
          costoTotal: 400,
          fecha: new Date('2026-10-01'),
          kilometrajeAlMomento: 55000,
        },
        1
      );

      // THEN: El vehículo debe actualizar su odómetro a 55,000 km
      expect(vehiculoRepository.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          kilometrajeActual: 55000,
          fechaUltimoMantenimiento: expect.any(Date),
        }),
        expect.anything() // cliente de la transacción
      );
    });

    it('NO debe retroceder el odómetro si el kilometraje del servicio es menor o igual al actual', async () => {
      // GIVEN: Vehículo con 60,000 km
      const mockVehiculo = {
        id: 10,
        placa: 'ABC-1234',
        kilometrajeActual: 60000,
        estado: EstadoVehiculo.ACTIVO,
      };

      vi.spyOn(vehiculoRepository, 'findById').mockResolvedValue(mockVehiculo as any);
      vi.spyOn(vehiculoRepository, 'update').mockResolvedValue(mockVehiculo as any);
      vi.spyOn(mantenimientoRepository, 'create').mockResolvedValue({
        id: 2,
        vehiculoId: 10,
        kilometrajeAlMomento: 58000,
      } as any);

      // WHEN: Se registra mantenimiento con 58,000 km (ej. factura tardía)
      await mantenimientoService.crear(
        {
          vehiculoId: 10,
          tipo: TipoMantenimiento.CORRECTIVO,
          descripcion: 'Frenos',
          taller: 'Taller Sur',
          costoTotal: 250,
          fecha: new Date('2026-09-15'),
          kilometrajeAlMomento: 58000,
        },
        1
      );

      // THEN: No debe incluir kilometrajeActual en la actualización
      expect(vehiculoRepository.update).toHaveBeenCalledWith(
        10,
        expect.not.objectContaining({
          kilometrajeActual: 58000,
        }),
        expect.anything() // cliente de la transacción
      );
    });
  });

  describe('Control de estados del vehículo en mantenimiento', () => {
    it('debe cambiar el estado del vehículo a EN_MANTENIMIENTO cuando el servicio entra EN_PROCESO', async () => {
      const mockVehiculo = {
        id: 10,
        estado: EstadoVehiculo.ACTIVO,
        kilometrajeActual: 40000,
      };

      vi.spyOn(vehiculoRepository, 'findById').mockResolvedValue(mockVehiculo as any);
      vi.spyOn(vehiculoRepository, 'update').mockResolvedValue({ ...mockVehiculo, estado: EstadoVehiculo.EN_MANTENIMIENTO } as any);
      vi.spyOn(mantenimientoRepository, 'create').mockResolvedValue({ id: 3 } as any);

      await mantenimientoService.crear(
        {
          vehiculoId: 10,
          tipo: TipoMantenimiento.CORRECTIVO,
          estado: EstadoMantenimiento.EN_PROCESO,
          descripcion: 'Reparación caja de cambios',
          taller: 'Taller Especializado',
          costoTotal: 1200,
          fecha: new Date(),
        },
        1
      );

      expect(vehiculoRepository.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          estado: EstadoVehiculo.EN_MANTENIMIENTO,
        }),
        expect.anything() // cliente de la transacción
      );
    });

    it('debe regresar el estado del vehículo a ACTIVO cuando el servicio se marca COMPLETADO', async () => {
      const mockVehiculo = {
        id: 10,
        estado: EstadoVehiculo.EN_MANTENIMIENTO,
        kilometrajeActual: 40000,
      };

      vi.spyOn(vehiculoRepository, 'findById').mockResolvedValue(mockVehiculo as any);
      vi.spyOn(vehiculoRepository, 'update').mockResolvedValue({ ...mockVehiculo, estado: EstadoVehiculo.ACTIVO } as any);
      vi.spyOn(mantenimientoRepository, 'create').mockResolvedValue({ id: 4 } as any);

      await mantenimientoService.crear(
        {
          vehiculoId: 10,
          tipo: TipoMantenimiento.CORRECTIVO,
          estado: EstadoMantenimiento.COMPLETADO,
          descripcion: 'Entrega de vehículo reparado',
          taller: 'Taller Especializado',
          costoTotal: 1200,
          fecha: new Date(),
        },
        1
      );

      expect(vehiculoRepository.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          estado: EstadoVehiculo.ACTIVO,
        }),
        expect.anything() // cliente de la transacción
      );
    });
  });

  describe('Cálculo de Costos', () => {
    it('debe sumar mano de obra y repuestos si costoTotal no se envía explícitamente', async () => {
      const mockVehiculo = { id: 10, kilometrajeActual: 30000, estado: EstadoVehiculo.ACTIVO };
      vi.spyOn(vehiculoRepository, 'findById').mockResolvedValue(mockVehiculo as any);
      vi.spyOn(vehiculoRepository, 'update').mockResolvedValue(mockVehiculo as any);
      
      const createSpy = vi.spyOn(mantenimientoRepository, 'create').mockResolvedValue({ id: 5 } as any);

      await mantenimientoService.crear(
        {
          vehiculoId: 10,
          tipo: TipoMantenimiento.PREVENTIVO,
          descripcion: 'Revisión general',
          taller: 'Taller Central',
          costoManoObra: 150,
          costoRepuestos: 350,
          costoTotal: 0, // No provisto o cero
          fecha: new Date(),
        },
        1
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          costoManoObra: 150,
          costoRepuestos: 350,
          costoTotal: 500, // 150 + 350
        }),
        expect.anything() // cliente de la transacción
      );
    });
  });
});
