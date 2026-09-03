import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EstadoChofer, EstadoViaje, EstadoVehiculo, TipoLicencia } from '@prisma/client';

vi.mock('../src/config/database', () => ({
  // La transacción ejecuta el callback con un cliente simulado
  enTransaccion: vi.fn((fn: (tx: unknown) => unknown) => fn({ tx: true })),
  default: {},
}));

vi.mock('../src/repositories/auditoria.repository', () => ({
  auditoriaRepository: { create: vi.fn().mockResolvedValue({ id: 1 }) },
}));

import { viajesService } from '../src/services/viajes.service';
import { viajesRepository } from '../src/repositories/viajes.repository';
import { vehiculoRepository } from '../src/repositories/vehiculo.repository';
import { auditoriaRepository } from '../src/repositories/auditoria.repository';
import { neumaticoRepository } from '../src/repositories/neumatico.repository';
import { facturaRepository } from '../src/repositories/factura.repository';

const lejos = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

const vehiculo = {
  id: 10, placa: 'GBA-1234', estado: EstadoVehiculo.ACTIVO, kilometrajeActual: 100000,
  fechaVencimientoSoat: lejos, fechaVencimientoSeguro: lejos, fechaVencimientoMatricula: lejos, fechaVencimientoRevisionTecnica: lejos,
};
const chofer = { id: 20, nombres: 'Carlos', apellidos: 'Mendoza', estado: EstadoChofer.ACTIVO, licenciaTipo: TipoLicencia.E, fechaVencimientoLicencia: lejos };
const cliente = { id: 30, nombreRazonSocial: 'Holcim', estado: 'ACTIVO' };
const material = { id: 40, nombre: 'Cemento', esPeligroso: false };

const viajeBase = {
  id: 1, vehiculoId: 10, choferId: 20, clienteId: 30, materialId: 40,
  origen: 'Guayaquil', destino: 'Quito', tarifa: 1000,
  fechaSalida: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), fechaLlegadaEstimada: null,
  kilometrosEstimados: 420, kilometrosReales: null,
  estado: EstadoViaje.PLANIFICADO, gastos: [], pagosChofer: [],
};

const mockViaje = (over: Record<string, unknown> = {}) =>
  vi.spyOn(viajesRepository, 'findById').mockResolvedValue({ ...viajeBase, ...over } as any);

describe('Viajes - máquina de estados y sincronización con el vehículo', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(viajesRepository, 'obtenerEntidadesAsignacion').mockResolvedValue({ vehiculo, chofer, cliente, material } as any);
    vi.spyOn(viajesRepository, 'buscarViajeEnCursoConflicto').mockResolvedValue(null);
    vi.spyOn(viajesRepository, 'update').mockImplementation(async (id, datos) => ({ ...viajeBase, ...datos }) as any);
    vi.spyOn(vehiculoRepository, 'findById').mockResolvedValue({ ...vehiculo } as any);
    vi.spyOn(vehiculoRepository, 'update').mockResolvedValue({} as any);
    vi.spyOn(neumaticoRepository, 'sumarKilometrosVehiculo').mockResolvedValue({ count: 0 } as any);
    vi.spyOn(facturaRepository, 'vencimientoMasAntiguoConSaldo').mockResolvedValue(null);
  });

  it('rechaza transiciones inválidas con un error 409', async () => {
    mockViaje({ estado: EstadoViaje.COMPLETADO });
    await expect(viajesService.cambiarEstado(1, EstadoViaje.EN_CURSO, 1)).rejects.toMatchObject({
      statusCode: 409,
      message: 'No se puede cambiar de estado COMPLETADO a EN_CURSO',
    });
  });

  it('al iniciar el viaje deja el vehículo EN_RUTA', async () => {
    mockViaje();
    await viajesService.cambiarEstado(1, EstadoViaje.EN_CURSO, 1);
    expect(vehiculoRepository.update).toHaveBeenCalledWith(10, { estado: EstadoVehiculo.EN_RUTA }, expect.anything());
  });

  it('no permite iniciar un viaje si el vehículo ya está en otro viaje en curso', async () => {
    mockViaje();
    vi.spyOn(viajesRepository, 'buscarViajeEnCursoConflicto').mockResolvedValue({ id: 7, vehiculoId: 10, choferId: 99, origen: 'Manta', destino: 'Quito' });
    await expect(viajesService.cambiarEstado(1, EstadoViaje.EN_CURSO, 1)).rejects.toThrow(/ya está en el viaje en curso #7/);
    expect(vehiculoRepository.update).not.toHaveBeenCalled();
  });

  it('al completar el viaje suma los km reales al odómetro y libera el vehículo', async () => {
    mockViaje({ estado: EstadoViaje.EN_CURSO });
    vi.spyOn(vehiculoRepository, 'findById').mockResolvedValue({ ...vehiculo, estado: EstadoVehiculo.EN_RUTA } as any);

    await viajesService.cambiarEstado(1, EstadoViaje.COMPLETADO, 1, { kilometrosReales: 432 });

    expect(vehiculoRepository.update).toHaveBeenCalledWith(
      10,
      { estado: EstadoVehiculo.ACTIVO, kilometrajeActual: 100432 },
      expect.anything()
    );
    expect(viajesRepository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ estado: EstadoViaje.COMPLETADO, kilometrosReales: 432, fechaLlegadaReal: expect.any(Date) }),
      expect.anything()
    );
    expect(auditoriaRepository.create).toHaveBeenCalled();
  });

  it('no acepta una llegada real anterior a la salida', async () => {
    mockViaje({ estado: EstadoViaje.EN_CURSO });
    await expect(
      viajesService.cambiarEstado(1, EstadoViaje.COMPLETADO, 1, { fechaLlegadaReal: new Date(2000, 0, 1) })
    ).rejects.toThrow(/anterior a la fecha de salida/);
  });

  it('al cancelar un viaje en curso el vehículo vuelve a estar disponible', async () => {
    mockViaje({ estado: EstadoViaje.EN_CURSO });
    vi.spyOn(vehiculoRepository, 'findById').mockResolvedValue({ ...vehiculo, estado: EstadoVehiculo.EN_RUTA } as any);
    await viajesService.cambiarEstado(1, EstadoViaje.CANCELADO, 1);
    expect(vehiculoRepository.update).toHaveBeenCalledWith(10, { estado: EstadoVehiculo.ACTIVO }, expect.anything());
  });
});

describe('Viajes - creación y edición', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(viajesRepository, 'create').mockResolvedValue({ ...viajeBase, id: 5 } as any);
    vi.spyOn(viajesRepository, 'update').mockImplementation(async (id, datos) => ({ ...viajeBase, ...datos }) as any);
    vi.spyOn(facturaRepository, 'vencimientoMasAntiguoConSaldo').mockResolvedValue(null);
  });

  const nuevo = {
    vehiculoId: 10, choferId: 20, clienteId: 30, materialId: 40,
    origen: 'Guayaquil', destino: 'Quito', fechaSalida: new Date(), tarifa: 1000,
  };

  it('bloquea la creación si el vehículo tiene el SOAT vencido (422)', async () => {
    vi.spyOn(viajesRepository, 'obtenerEntidadesAsignacion').mockResolvedValue({
      vehiculo: { ...vehiculo, fechaVencimientoSoat: new Date(2020, 0, 1) }, chofer, cliente, material,
    } as any);
    await expect(viajesService.crear(nuevo, 1)).rejects.toMatchObject({ statusCode: 422, message: expect.stringMatching(/SOAT/) });
    expect(viajesRepository.create).not.toHaveBeenCalled();
  });

  it('crea el viaje cuando todo está en regla', async () => {
    vi.spyOn(viajesRepository, 'obtenerEntidadesAsignacion').mockResolvedValue({ vehiculo, chofer, cliente, material } as any);
    const viaje = await viajesService.crear(nuevo, 1);
    expect(viaje.id).toBe(5);
  });

  it('bloquea la creación si el cliente tiene mora superior a 60 días (422)', async () => {
    vi.spyOn(viajesRepository, 'obtenerEntidadesAsignacion').mockResolvedValue({ vehiculo, chofer, cliente, material } as any);
    vi.spyOn(facturaRepository, 'vencimientoMasAntiguoConSaldo').mockResolvedValue(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    await expect(viajesService.crear(nuevo, 1)).rejects.toMatchObject({ statusCode: 422, message: expect.stringMatching(/vencidas/) });
    expect(viajesRepository.create).not.toHaveBeenCalled();
  });

  it('la edición ignora el estado: solo cambia con la máquina de estados', async () => {
    mockViaje();
    await viajesService.actualizar(1, { estado: EstadoViaje.COMPLETADO, observaciones: 'x' }, 1);
    expect(viajesRepository.update).toHaveBeenCalledWith(1, { observaciones: 'x' }, expect.anything());
  });

  it('no permite cambiar el vehículo de un viaje que ya está en curso', async () => {
    mockViaje({ estado: EstadoViaje.EN_CURSO });
    await expect(viajesService.actualizar(1, { vehiculoId: 11 }, 1)).rejects.toThrow(/PLANIFICADO/);
  });

  it('no permite eliminar un viaje con gastos registrados', async () => {
    mockViaje({ gastos: [{ id: 1 }] });
    await expect(viajesService.eliminar(1, 1)).rejects.toMatchObject({ statusCode: 409 });
  });
});
