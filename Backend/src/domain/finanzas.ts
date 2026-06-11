// Cálculos financieros y operativos del transporte (lógica pura, sin base de datos)

import { MetodoPago, TipoGasto, TipoPagoChofer } from '@prisma/client';

type Monto = number | string | { toString(): string } | null | undefined;

// Convierte Decimal de Prisma, string o number a number
export const num = (v: Monto): number => (v === null || v === undefined ? 0 : Number(v.toString()));

// Redondeo a centavos para evitar arrastres de coma flotante en las respuestas
export const r2 = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

export const porcentaje = (parte: number, total: number): number => (total > 0 ? r2((parte / total) * 100) : 0);

// Divide evitando división por cero; devuelve null cuando el indicador no aplica
export const dividir = (a: number, b: number): number | null => (b > 0 ? r2(a / b) : null);

export interface GastoLite {
    tipoGasto: TipoGasto;
    monto: Monto;
    metodoPago?: MetodoPago | null;
    galones?: Monto;
}

export interface PagoLite {
    tipoPago: TipoPagoChofer;
    monto: Monto;
}

// Galones de combustible registrados en un conjunto de gastos
export const totalGalones = (gastos: GastoLite[]): number =>
    gastos.filter(g => g.tipoGasto === TipoGasto.COMBUSTIBLE).reduce((s, g) => s + num(g.galones), 0);

export const totalGastos = (gastos: GastoLite[]): number => gastos.reduce((s, g) => s + num(g.monto), 0);

// Pagos al chofer que son COSTO del viaje (el anticipo NO es costo: se rinde con gastos)
export const costoChoferViaje = (pagos: PagoLite[]): number =>
    pagos
        .filter(p => p.tipoPago === TipoPagoChofer.POR_VIAJE || p.tipoPago === TipoPagoChofer.LIQUIDACION)
        .reduce((s, p) => s + num(p.monto), 0);

export interface ResumenViaje {
    ingreso: number;
    gastos: number;
    pagosChofer: number;
    costoTotal: number;
    ganancia: number;
    margenPorcentaje: number;
    kilometros: number | null;
    costoPorKm: number | null; // CPK
    ingresoPorKm: number | null;
    galones: number;
    rendimientoKmGal: number | null;
}

/**
 * Resumen económico de un viaje.
 * - Ganancia = tarifa - gastos de ruta - pagos al chofer por ese viaje
 * - CPK (costo por km) = costo total / km reales (o estimados si aún no hay reales)
 * - Rendimiento = km / galones cargados
 * Se mantienen `ingreso`, `gastos` y `ganancia` para compatibilidad con el frontend.
 */
export const calcularResumenViaje = (
    tarifa: Monto,
    gastos: GastoLite[],
    pagos: PagoLite[],
    kmReales?: number | null,
    kmEstimados?: number | null
): ResumenViaje => {
    const ingreso = num(tarifa);
    const gastosRuta = totalGastos(gastos);
    const pagosChofer = costoChoferViaje(pagos);
    const costoTotal = gastosRuta + pagosChofer;
    const km = kmReales || kmEstimados || null;
    const galones = totalGalones(gastos);
    return {
        ingreso: r2(ingreso),
        gastos: r2(gastosRuta),
        pagosChofer: r2(pagosChofer),
        costoTotal: r2(costoTotal),
        ganancia: r2(ingreso - costoTotal),
        margenPorcentaje: porcentaje(ingreso - costoTotal, ingreso),
        kilometros: km,
        costoPorKm: km ? dividir(costoTotal, km) : null,
        ingresoPorKm: km ? dividir(ingreso, km) : null,
        galones: r2(galones),
        rendimientoKmGal: km && kmReales ? dividir(kmReales, galones) : null,
    };
};

// ===========================================
// Liquidación de viaje (rendición de cuentas del chofer)
// ===========================================

export interface LiquidacionViaje {
    anticipos: number;
    gastosEfectivo: number; // pagados por el chofer con el dinero del anticipo
    gastosEmpresa: number; // pagados por la empresa (transferencia o tarjeta)
    totalGastos: number;
    saldo: number; // > 0: el chofer devuelve; < 0: la empresa reembolsa
    resultado: 'CHOFER_DEVUELVE' | 'EMPRESA_REEMBOLSA' | 'CUADRADO';
    gastosPorTipo: Record<string, number>;
}

/**
 * Liquidación: Saldo = Anticipos entregados - Gastos que el chofer pagó en efectivo.
 * Los gastos pagados con tarjeta o transferencia de la empresa no afectan el saldo del chofer.
 */
export const calcularLiquidacion = (gastos: GastoLite[], pagos: PagoLite[]): LiquidacionViaje => {
    const anticipos = pagos
        .filter(p => p.tipoPago === TipoPagoChofer.ANTICIPO)
        .reduce((s, p) => s + num(p.monto), 0);

    const efectivo = gastos.filter(g => (g.metodoPago ?? MetodoPago.EFECTIVO) === MetodoPago.EFECTIVO);
    const gastosEfectivo = totalGastos(efectivo);
    const total = totalGastos(gastos);
    const saldo = r2(anticipos - gastosEfectivo);

    const gastosPorTipo: Record<string, number> = {};
    for (const g of gastos) {
        gastosPorTipo[g.tipoGasto] = r2((gastosPorTipo[g.tipoGasto] || 0) + num(g.monto));
    }

    return {
        anticipos: r2(anticipos),
        gastosEfectivo: r2(gastosEfectivo),
        gastosEmpresa: r2(total - gastosEfectivo),
        totalGastos: r2(total),
        saldo,
        resultado: saldo > 0 ? 'CHOFER_DEVUELVE' : saldo < 0 ? 'EMPRESA_REEMBOLSA' : 'CUADRADO',
        gastosPorTipo,
    };
};

// ===========================================
// Control de combustible
// ===========================================

// Por debajo de este % del rendimiento esperado se levanta una alerta de posible desvío o falla
export const TOLERANCIA_RENDIMIENTO = 0.8;

export type DiagnosticoCombustible = 'NORMAL' | 'BAJO' | 'SIN_DATOS' | 'SIN_REFERENCIA';

export const diagnosticarRendimiento = (
    rendimientoReal: number | null,
    rendimientoEsperado: number | null | undefined
): DiagnosticoCombustible => {
    if (rendimientoReal === null) return 'SIN_DATOS';
    if (!rendimientoEsperado) return 'SIN_REFERENCIA';
    return rendimientoReal < rendimientoEsperado * TOLERANCIA_RENDIMIENTO ? 'BAJO' : 'NORMAL';
};
