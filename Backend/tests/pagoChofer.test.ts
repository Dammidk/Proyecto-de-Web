import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetodoPago, TipoPagoChofer } from '@prisma/client';

vi.mock('../src/config/database', () => ({
  // La transacción ejecuta el callback con un cliente simulado
  enTransaccion: vi.fn((fn: (tx: unknown) => unknown) => fn({ tx: true })),
  default: {
    pagoChofer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    chofer: {
      findUnique: vi.fn(),
    },
    viaje: {
      findUnique: vi.fn(),
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

import { pagoChoferService } from '../src/services/pagoChofer.service';
import { pagoChoferRepository } from '../src/repositories/pagoChofer.repository';
import { choferRepository } from '../src/repositories/chofer.repository';
import { viajesRepository } from '../src/repositories/viajes.repository';

describe('TDD - Módulo de Pagos a Choferes (Reglas de Negocio)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validaciones de Emisión de Pagos', () => {
    it('debe rechazar pagos con montos menores o iguales a 0', async () => {
      vi.spyOn(choferRepository, 'findById').mockResolvedValue({ id: 1, nombres: 'Juan' } as any);

      await expect(
        pagoChoferService.crear(
          {
            choferId: 1,
            tipoPago: TipoPagoChofer.POR_VIAJE,
            monto: 0,
            fecha: new Date(),
          },
          1
        )
      ).rejects.toThrow('El monto del pago debe ser mayor a 0');

      await expect(
        pagoChoferService.crear(
          {
            choferId: 1,
            tipoPago: TipoPagoChofer.ANTICIPO,
            monto: -50,
            fecha: new Date(),
          },
          1
        )
      ).rejects.toThrow('El monto del pago debe ser mayor a 0');
    });

    it('debe rechazar la asociación de un pago a un viaje que no pertenece al chofer', async () => {
      // Chofer 1
      vi.spyOn(choferRepository, 'findById').mockResolvedValue({
        id: 1,
        nombres: 'Carlos',
        apellidos: 'Mendoza',
      } as any);

      // Viaje #100 que pertenece a otro chofer (choferId: 2)
      vi.spyOn(viajesRepository, 'findById').mockResolvedValue({
        id: 100,
        choferId: 2, // No coincide con chofer 1
        origen: 'Quito',
        destino: 'Guayaquil',
      } as any);

      await expect(
        pagoChoferService.crear(
          {
            choferId: 1,
            viajeId: 100,
            tipoPago: TipoPagoChofer.POR_VIAJE,
            monto: 300,
            fecha: new Date(),
          },
          1
        )
      ).rejects.toThrow(/pertenece a otro conductor/);
    });

    it('debe registrar el pago y auditoría si el viaje pertenece al chofer', async () => {
      vi.spyOn(choferRepository, 'findById').mockResolvedValue({
        id: 1,
        nombres: 'Carlos',
        apellidos: 'Mendoza',
      } as any);

      vi.spyOn(viajesRepository, 'findById').mockResolvedValue({
        id: 100,
        choferId: 1, // Coincide
        origen: 'Quito',
        destino: 'Guayaquil',
      } as any);

      const createSpy = vi.spyOn(pagoChoferRepository, 'create').mockResolvedValue({
        id: 1,
        choferId: 1,
        viajeId: 100,
        tipoPago: TipoPagoChofer.POR_VIAJE,
        monto: 350 as any,
        metodoPago: MetodoPago.TRANSFERENCIA,
        fecha: new Date(),
      } as any);

      const res = await pagoChoferService.crear(
        {
          choferId: 1,
          viajeId: 100,
          tipoPago: TipoPagoChofer.POR_VIAJE,
          monto: 350,
          metodoPago: MetodoPago.TRANSFERENCIA,
          fecha: new Date(),
        },
        1
      );

      expect(res.id).toBe(1);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          choferId: 1,
          viajeId: 100,
          monto: 350,
        }),
        expect.anything() // cliente de la transacción
      );
    });
  });
});
