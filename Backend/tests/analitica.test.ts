import { describe, it, expect } from 'vitest';
import { EstadoViaje, MetodoPago, TipoGasto, TipoPagoChofer } from '@prisma/client';
import {
  ViajeAnalitica, distribucionCostos, indicadoresPorVehiculo, rentabilidadPorCliente,
  rentabilidadPorRuta, serieMensual, diasEnViaje,
} from '../src/domain/analitica';

const periodo = { desde: new Date(2026, 7, 1), hasta: new Date(2026, 8, 30, 23, 59, 59) }; // ago-sep 2026

const viaje = (over: Partial<ViajeAnalitica>): ViajeAnalitica => ({
  id: 1,
  estado: EstadoViaje.COMPLETADO,
  vehiculoId: 1,
  choferId: 1,
  clienteId: 1,
  origen: 'Guayaquil, Guayas',
  destino: 'Quito, Pichincha',
  tarifa: 1000,
  kilometrosReales: 400,
  kilometrosEstimados: 420,
  fechaSalida: new Date(2026, 7, 10),
  fechaLlegadaReal: new Date(2026, 7, 11),
  fechaLlegadaEstimada: new Date(2026, 7, 11),
  gastos: [{ tipoGasto: TipoGasto.COMBUSTIBLE, monto: 140, galones: 50, metodoPago: MetodoPago.TARJETA }],
  pagosChofer: [{ tipoPago: TipoPagoChofer.ANTICIPO, monto: 200 }, { tipoPago: TipoPagoChofer.POR_VIAJE, monto: 100 }],
  vehiculo: { placa: 'GBA-1234' },
  chofer: { nombres: 'Carlos', apellidos: 'Mendoza' },
  cliente: { nombreRazonSocial: 'Holcim' },
  ...over,
});

describe('Analítica - serie mensual de ingresos vs. costos', () => {
  it('agrupa por mes y no cuenta los anticipos como nómina', () => {
    const serie = serieMensual(
      periodo,
      [viaje({}), viaje({ id: 2, fechaSalida: new Date(2026, 8, 5), tarifa: 800 }), viaje({ id: 3, estado: EstadoViaje.EN_CURSO })],
      [{ tipoGasto: 'COMBUSTIBLE', monto: 140, fecha: new Date(2026, 7, 10) }],
      [{ vehiculoId: 1, tipo: 'PREVENTIVO', costoTotal: 300, fecha: new Date(2026, 8, 20) }],
      [
        { choferId: 1, tipoPago: TipoPagoChofer.ANTICIPO, monto: 200, fecha: new Date(2026, 7, 10) },
        { choferId: 1, tipoPago: TipoPagoChofer.SUELDO_MENSUAL, monto: 900, fecha: new Date(2026, 7, 28) },
      ]
    );

    expect(serie.map(p => p.mes)).toEqual(['2026-08', '2026-09']);
    const agosto = serie[0];
    expect(agosto.ingresos).toBe(1000); // el viaje EN_CURSO no es ingreso todavía
    expect(agosto.nomina).toBe(900); // el anticipo de $200 no se suma
    expect(agosto.costos).toBe(1040);
    expect(agosto.utilidad).toBe(-40);
    expect(serie[1].ingresos).toBe(800);
    expect(serie[1].mantenimiento).toBe(300);
  });
});

describe('Analítica - distribución del costo operativo', () => {
  it('reparte el costo por categoría y calcula su participación', () => {
    const dist = distribucionCostos(
      [{ tipoGasto: 'COMBUSTIBLE', monto: 600, fecha: new Date() }, { tipoGasto: 'PEAJE', monto: 100, fecha: new Date() }],
      [{ vehiculoId: 1, tipo: 'CORRECTIVO', costoTotal: 300, fecha: new Date() }],
      [{ choferId: 1, tipoPago: TipoPagoChofer.ANTICIPO, monto: 999, fecha: new Date() }]
    );
    expect(dist.map(d => d.categoria)).toEqual(['COMBUSTIBLE', 'MANTENIMIENTO', 'PEAJE']);
    expect(dist[0].porcentaje).toBe(60);
  });
});

describe('Analítica - indicadores por vehículo', () => {
  it('calcula CPK, rendimiento y detecta consumo anómalo de combustible', () => {
    const vehiculos = [
      { id: 1, placa: 'GBA-1234', marca: 'Kenworth', modelo: 'T800', estado: 'ACTIVO', rendimientoEsperadoKmGal: 8 },
      { id: 2, placa: 'GSD-9012', marca: 'Mercedes', modelo: 'Actros', estado: 'ACTIVO', rendimientoEsperadoKmGal: 8 },
    ];
    const viajes = [
      viaje({}), // 400 km / 50 gal = 8 km/gal → normal
      viaje({ id: 2, vehiculoId: 2, gastos: [{ tipoGasto: TipoGasto.COMBUSTIBLE, monto: 224, galones: 80 }] }), // 5 km/gal
    ];
    const [primero, segundo] = indicadoresPorVehiculo(vehiculos, viajes, [{ vehiculoId: 1, tipo: 'PREVENTIVO', costoTotal: 60, fecha: new Date(2026, 7, 15) }], periodo);

    const kenworth = [primero, segundo].find(v => v.placa === 'GBA-1234')!;
    const actros = [primero, segundo].find(v => v.placa === 'GSD-9012')!;

    // Costo = 140 combustible + 100 pago por viaje + 60 mantenimiento = 300 → 300/400 km
    expect(kenworth.costoTotal).toBe(300);
    expect(kenworth.costoPorKm).toBe(0.75);
    expect(kenworth.rendimientoKmGal).toBe(8);
    expect(kenworth.diagnosticoCombustible).toBe('NORMAL');
    expect(actros.rendimientoKmGal).toBe(5);
    expect(actros.diagnosticoCombustible).toBe('BAJO');
    // Ordenado por utilidad: el más rentable primero
    expect(primero.utilidad).toBeGreaterThanOrEqual(segundo.utilidad);
  });

  it('mide la utilización como días con el vehículo en viaje sobre los días del período', () => {
    const dias = diasEnViaje([viaje({ fechaSalida: new Date(2026, 7, 10), fechaLlegadaReal: new Date(2026, 7, 12) })], periodo);
    expect(dias).toBe(3);
  });
});

describe('Analítica - rentabilidad por cliente y por ruta', () => {
  it('agrupa por cliente usando solo viajes completados', () => {
    const clientes = rentabilidadPorCliente([viaje({}), viaje({ id: 2, estado: EstadoViaje.PLANIFICADO })]);
    expect(clientes).toHaveLength(1);
    expect(clientes[0].viajes).toBe(1);
    expect(clientes[0].utilidad).toBe(760); // 1000 - 140 - 100
  });

  it('agrupa la misma ruta aunque se escriba con distinta mayúscula, tilde o provincia', () => {
    const rutas = rentabilidadPorRuta([
      viaje({}),
      viaje({ id: 2, origen: 'guayaquil', destino: 'QUITO' }),
      viaje({ id: 3, origen: 'Guayaquil', destino: 'Cuenca, Azuay' }),
    ]);
    expect(rutas).toHaveLength(2);
    expect(rutas.find(r => r.nombre === 'Guayaquil → Quito')?.viajes).toBe(2);
  });
});
