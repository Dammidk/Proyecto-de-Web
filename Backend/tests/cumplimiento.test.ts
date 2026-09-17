import { describe, it, expect } from 'vitest';
import { EstadoChofer, EstadoVehiculo, TipoLicencia } from '@prisma/client';
import { evaluarDocumento, validarAsignacion, diasHasta } from '../src/domain/cumplimiento';

const HOY = new Date('2026-10-02T12:00:00Z');
const enDias = (n: number) => new Date(Date.UTC(2026, 9, 2 + n));

const vehiculoOk = {
  id: 1,
  placa: 'GBA-1234',
  estado: EstadoVehiculo.ACTIVO,
  fechaVencimientoSoat: enDias(100),
  fechaVencimientoSeguro: enDias(100),
  fechaVencimientoMatricula: enDias(100),
  fechaVencimientoRevisionTecnica: enDias(100),
};
const choferOk = {
  id: 1,
  nombres: 'Carlos',
  apellidos: 'Mendoza',
  estado: EstadoChofer.ACTIVO,
  licenciaTipo: TipoLicencia.E,
  fechaVencimientoLicencia: enDias(300),
};
const cemento = { id: 1, nombre: 'Cemento', esPeligroso: false };
const diesel = { id: 2, nombre: 'Diésel', esPeligroso: true };

describe('Cumplimiento documental - semáforo de vencimientos', () => {
  it('clasifica cada documento según los días que faltan para vencer', () => {
    expect(evaluarDocumento('SOAT', enDias(-1), HOY).nivel).toBe('VENCIDO');
    expect(evaluarDocumento('SOAT', enDias(0), HOY).nivel).toBe('CRITICO');
    expect(evaluarDocumento('SOAT', enDias(5), HOY).nivel).toBe('CRITICO');
    expect(evaluarDocumento('SOAT', enDias(15), HOY).nivel).toBe('URGENTE');
    expect(evaluarDocumento('SOAT', enDias(30), HOY).nivel).toBe('PROXIMO');
    expect(evaluarDocumento('SOAT', enDias(31), HOY).nivel).toBe('VIGENTE');
    expect(evaluarDocumento('SOAT', null, HOY).nivel).toBe('SIN_REGISTRO');
  });

  it('cuenta días calendario sin importar la hora del día', () => {
    expect(diasHasta(enDias(10), new Date('2026-10-02T23:59:00Z'))).toBe(10);
    expect(diasHasta(enDias(-3), HOY)).toBe(-3);
  });
});

describe('Cumplimiento documental - bloqueo de asignación a viajes', () => {
  it('permite asignar un vehículo y un chofer con todo en regla', () => {
    expect(validarAsignacion(vehiculoOk, choferOk, cemento, HOY)).toEqual([]);
  });

  it('bloquea un vehículo con la RTV vencida a la fecha de salida', () => {
    const errores = validarAsignacion({ ...vehiculoOk, fechaVencimientoRevisionTecnica: enDias(-2) }, choferOk, cemento, HOY);
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/Revisión Técnica.*vencid/);
  });

  it('evalúa los documentos a la fecha de salida, no a la de hoy', () => {
    // El SOAT vence en 10 días: un viaje que sale en 20 días ya no puede usar el vehículo
    const vehiculo = { ...vehiculoOk, fechaVencimientoSoat: enDias(10) };
    expect(validarAsignacion(vehiculo, choferOk, cemento, HOY)).toEqual([]);
    expect(validarAsignacion(vehiculo, choferOk, cemento, enDias(20))[0]).toMatch(/SOAT/);
  });

  it('bloquea vehículos en mantenimiento o inactivos', () => {
    expect(validarAsignacion({ ...vehiculoOk, estado: EstadoVehiculo.EN_MANTENIMIENTO }, choferOk, cemento, HOY)[0]).toMatch(/mantenimiento/);
    expect(validarAsignacion({ ...vehiculoOk, estado: EstadoVehiculo.INACTIVO }, choferOk, cemento, HOY)[0]).toMatch(/INACTIVO/);
  });

  it('bloquea a un chofer con la licencia vencida o inactivo', () => {
    expect(validarAsignacion(vehiculoOk, { ...choferOk, fechaVencimientoLicencia: enDias(-1) }, cemento, HOY)[0]).toMatch(/licencia/);
    expect(validarAsignacion(vehiculoOk, { ...choferOk, estado: EstadoChofer.INACTIVO }, cemento, HOY)[0]).toMatch(/INACTIVO/);
  });

  it('exige licencia tipo E para transportar material peligroso', () => {
    expect(validarAsignacion(vehiculoOk, choferOk, diesel, HOY)).toEqual([]);
    const errores = validarAsignacion(vehiculoOk, { ...choferOk, licenciaTipo: TipoLicencia.C }, diesel, HOY);
    expect(errores[0]).toMatch(/material peligroso.*tipo E/);
    // Sin licencia registrada tampoco se permite
    expect(validarAsignacion(vehiculoOk, { ...choferOk, licenciaTipo: null }, diesel, HOY)).toHaveLength(1);
  });

  it('reporta todos los impedimentos a la vez', () => {
    const errores = validarAsignacion(
      { ...vehiculoOk, estado: EstadoVehiculo.EN_MANTENIMIENTO, fechaVencimientoSoat: enDias(-5) },
      { ...choferOk, licenciaTipo: TipoLicencia.C, fechaVencimientoLicencia: enDias(-5) },
      diesel,
      HOY
    );
    expect(errores).toHaveLength(4);
  });
});
