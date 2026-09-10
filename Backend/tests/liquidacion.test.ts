import { describe, it, expect } from 'vitest';
import { MetodoPago, TipoGasto, TipoPagoChofer } from '@prisma/client';
import { calcularLiquidacion, calcularResumenViaje, diagnosticarRendimiento } from '../src/domain/finanzas';

const combustible = (monto: number, galones: number, metodoPago: MetodoPago = MetodoPago.TARJETA) =>
  ({ tipoGasto: TipoGasto.COMBUSTIBLE, monto, galones, metodoPago });
const peaje = (monto: number) => ({ tipoGasto: TipoGasto.PEAJE, monto, metodoPago: MetodoPago.EFECTIVO });
const anticipo = (monto: number) => ({ tipoPago: TipoPagoChofer.ANTICIPO, monto });
const porViaje = (monto: number) => ({ tipoPago: TipoPagoChofer.POR_VIAJE, monto });

describe('Resumen económico del viaje (CPK y rendimiento)', () => {
  it('calcula ganancia, margen, costo por km y rendimiento de combustible', () => {
    // Tarifa $1.200, 400 km reales, 50 galones ($140) + peajes $20, pago al chofer $150
    const r = calcularResumenViaje(1200, [combustible(140, 50), peaje(20)], [porViaje(150)], 400, 390);

    expect(r.ingreso).toBe(1200);
    expect(r.gastos).toBe(160);
    expect(r.pagosChofer).toBe(150);
    expect(r.costoTotal).toBe(310);
    expect(r.ganancia).toBe(890);
    expect(r.margenPorcentaje).toBe(74.17);
    expect(r.costoPorKm).toBe(0.78); // 310 / 400
    expect(r.rendimientoKmGal).toBe(8); // 400 km / 50 gal
  });

  it('no cuenta el anticipo como costo: se rinde con los gastos de ruta', () => {
    const r = calcularResumenViaje(1000, [peaje(30)], [anticipo(300)], 200, null);
    expect(r.pagosChofer).toBe(0);
    expect(r.ganancia).toBe(970);
  });

  it('usa los km estimados para el CPK mientras no hay km reales, pero no calcula rendimiento', () => {
    const r = calcularResumenViaje(800, [combustible(100, 40)], [], null, 250);
    expect(r.costoPorKm).toBe(0.4);
    expect(r.rendimientoKmGal).toBeNull();
  });

  it('devuelve null en los indicadores por km si no hay kilómetros', () => {
    const r = calcularResumenViaje(500, [], [], null, null);
    expect(r.costoPorKm).toBeNull();
    expect(r.margenPorcentaje).toBe(100);
  });
});

describe('Hoja de liquidación del viaje', () => {
  it('el chofer devuelve el saldo cuando gastó menos que el anticipo', () => {
    // Anticipo $300; gastó $180 en peajes y comida en efectivo; el diésel se pagó con tarjeta de la empresa
    const liq = calcularLiquidacion(
      [peaje(40), { tipoGasto: TipoGasto.ALIMENTACION, monto: 140, metodoPago: MetodoPago.EFECTIVO }, combustible(500, 180)],
      [anticipo(300)]
    );
    expect(liq.anticipos).toBe(300);
    expect(liq.gastosEfectivo).toBe(180);
    expect(liq.gastosEmpresa).toBe(500);
    expect(liq.saldo).toBe(120);
    expect(liq.resultado).toBe('CHOFER_DEVUELVE');
    expect(liq.gastosPorTipo).toEqual({ PEAJE: 40, ALIMENTACION: 140, COMBUSTIBLE: 500 });
  });

  it('la empresa reembolsa cuando el chofer gastó más que el anticipo', () => {
    const liq = calcularLiquidacion([peaje(250), combustible(100, 30, MetodoPago.EFECTIVO)], [anticipo(300)]);
    expect(liq.saldo).toBe(-50);
    expect(liq.resultado).toBe('EMPRESA_REEMBOLSA');
  });

  it('queda cuadrado cuando anticipo y gastos coinciden', () => {
    expect(calcularLiquidacion([peaje(100)], [anticipo(100)]).resultado).toBe('CUADRADO');
  });
});

describe('Diagnóstico de combustible', () => {
  it('alerta cuando el rendimiento cae por debajo del 80 % del esperado', () => {
    expect(diagnosticarRendimiento(6.3, 8)).toBe('BAJO'); // 78 %
    expect(diagnosticarRendimiento(6.5, 8)).toBe('NORMAL'); // 81 %
    expect(diagnosticarRendimiento(null, 8)).toBe('SIN_DATOS');
    expect(diagnosticarRendimiento(7, null)).toBe('SIN_REFERENCIA');
  });
});
