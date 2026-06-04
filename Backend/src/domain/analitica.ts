// Indicadores de gestión del transporte (lógica pura, sin base de datos)
// CPK, rendimiento de combustible, utilización de flota y rentabilidad por vehículo, cliente, ruta y chofer

import { EstadoViaje, TipoPagoChofer } from '@prisma/client';
import {
    GastoLite, PagoLite, costoChoferViaje, diagnosticarRendimiento, dividir, num, porcentaje, r2,
    totalGalones, totalGastos, DiagnosticoCombustible,
} from './finanzas';

type Monto = Parameters<typeof num>[0];

export interface ViajeAnalitica {
    id: number;
    estado: EstadoViaje;
    vehiculoId: number;
    choferId: number;
    clienteId: number;
    origen: string;
    destino: string;
    tarifa: Monto;
    kilometrosReales: number | null;
    kilometrosEstimados: number | null;
    fechaSalida: Date;
    fechaLlegadaReal: Date | null;
    fechaLlegadaEstimada: Date | null;
    gastos: GastoLite[];
    pagosChofer: PagoLite[];
    vehiculo: { placa: string };
    chofer: { nombres: string; apellidos: string };
    cliente: { nombreRazonSocial: string };
}

export interface MantenimientoAnalitica {
    vehiculoId: number;
    tipo: string;
    costoTotal: Monto;
    fecha: Date;
}

export interface PagoAnalitica {
    choferId: number;
    tipoPago: TipoPagoChofer;
    monto: Monto;
    fecha: Date;
}

export interface GastoFechado {
    tipoGasto: string;
    monto: Monto;
    fecha: Date;
}

export interface VehiculoAnalitica {
    id: number;
    placa: string;
    marca: string;
    modelo: string;
    estado: string;
    rendimientoEsperadoKmGal: Monto;
}

export interface Periodo {
    desde: Date;
    hasta: Date;
}

const MS_DIA = 24 * 60 * 60 * 1000;
const claveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Los anticipos no son costo: es dinero que el chofer rinde luego con gastos de viaje
export const esCostoNomina = (tipo: TipoPagoChofer) => tipo !== TipoPagoChofer.ANTICIPO;

const completados = (viajes: ViajeAnalitica[]) => viajes.filter(v => v.estado === EstadoViaje.COMPLETADO);

// ===========================================
// Serie mensual: ingresos vs. costos
// ===========================================

export interface PuntoMensual {
    mes: string; // YYYY-MM
    etiqueta: string; // "Oct 2026"
    ingresos: number;
    gastosViaje: number;
    mantenimiento: number;
    nomina: number;
    costos: number;
    utilidad: number;
    margen: number;
    viajes: number;
    kilometros: number;
}

export const serieMensual = (
    periodo: Periodo,
    viajes: ViajeAnalitica[],
    gastos: GastoFechado[],
    mantenimientos: MantenimientoAnalitica[],
    pagos: PagoAnalitica[]
): PuntoMensual[] => {
    const puntos = new Map<string, PuntoMensual>();
    const cursor = new Date(periodo.desde.getFullYear(), periodo.desde.getMonth(), 1);
    while (cursor <= periodo.hasta) {
        const clave = claveMes(cursor);
        puntos.set(clave, {
            mes: clave, etiqueta: `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`,
            ingresos: 0, gastosViaje: 0, mantenimiento: 0, nomina: 0, costos: 0, utilidad: 0, margen: 0, viajes: 0, kilometros: 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }

    for (const v of completados(viajes)) {
        const p = puntos.get(claveMes(v.fechaSalida));
        if (!p) continue;
        p.ingresos += num(v.tarifa);
        p.viajes += 1;
        p.kilometros += v.kilometrosReales || 0;
    }
    for (const g of gastos) {
        const p = puntos.get(claveMes(g.fecha));
        if (p) p.gastosViaje += num(g.monto);
    }
    for (const m of mantenimientos) {
        const p = puntos.get(claveMes(m.fecha));
        if (p) p.mantenimiento += num(m.costoTotal);
    }
    for (const pg of pagos) {
        if (!esCostoNomina(pg.tipoPago)) continue;
        const p = puntos.get(claveMes(pg.fecha));
        if (p) p.nomina += num(pg.monto);
    }

    return [...puntos.values()].map(p => {
        const costos = p.gastosViaje + p.mantenimiento + p.nomina;
        return {
            ...p,
            ingresos: r2(p.ingresos),
            gastosViaje: r2(p.gastosViaje),
            mantenimiento: r2(p.mantenimiento),
            nomina: r2(p.nomina),
            costos: r2(costos),
            utilidad: r2(p.ingresos - costos),
            margen: porcentaje(p.ingresos - costos, p.ingresos),
        };
    });
};

// ===========================================
// Distribución del costo operativo
// ===========================================

export const ETIQUETAS_COSTO: Record<string, string> = {
    COMBUSTIBLE: 'Combustible',
    PEAJE: 'Peajes',
    ALIMENTACION: 'Alimentación',
    HOSPEDAJE: 'Hospedaje',
    MULTA: 'Multas',
    OTRO: 'Otros gastos de ruta',
    MANTENIMIENTO: 'Mantenimiento',
    NOMINA: 'Nómina choferes',
};

export const distribucionCostos = (
    gastos: GastoFechado[],
    mantenimientos: MantenimientoAnalitica[],
    pagos: PagoAnalitica[]
) => {
    const totales: Record<string, number> = {};
    const sumar = (k: string, v: number) => { totales[k] = (totales[k] || 0) + v; };

    gastos.forEach(g => sumar(g.tipoGasto, num(g.monto)));
    mantenimientos.forEach(m => sumar('MANTENIMIENTO', num(m.costoTotal)));
    pagos.filter(p => esCostoNomina(p.tipoPago)).forEach(p => sumar('NOMINA', num(p.monto)));

    const total = Object.values(totales).reduce((a, b) => a + b, 0);
    return Object.entries(totales)
        .filter(([, v]) => v > 0)
        .map(([categoria, monto]) => ({
            categoria,
            etiqueta: ETIQUETAS_COSTO[categoria] ?? categoria,
            monto: r2(monto),
            porcentaje: porcentaje(monto, total),
        }))
        .sort((a, b) => b.monto - a.monto);
};

// ===========================================
// Utilización: % de días del período con el vehículo en un viaje
// ===========================================

export const diasEnViaje = (viajes: ViajeAnalitica[], periodo: Periodo, ahora: Date = new Date()): number => {
    const dias = new Set<number>();
    for (const v of viajes) {
        if (v.estado !== EstadoViaje.COMPLETADO && v.estado !== EstadoViaje.EN_CURSO) continue;
        const inicio = Math.max(v.fechaSalida.getTime(), periodo.desde.getTime());
        const finViaje = v.fechaLlegadaReal ?? (v.estado === EstadoViaje.EN_CURSO ? ahora : v.fechaLlegadaEstimada ?? v.fechaSalida);
        const fin = Math.min(finViaje.getTime(), periodo.hasta.getTime());
        for (let t = inicio; t <= fin; t += MS_DIA) dias.add(Math.floor(t / MS_DIA));
        dias.add(Math.floor(inicio / MS_DIA));
    }
    return dias.size;
};

export const diasPeriodo = (periodo: Periodo) =>
    Math.max(1, Math.round((periodo.hasta.getTime() - periodo.desde.getTime()) / MS_DIA) + 1);

// ===========================================
// Rentabilidad por vehículo (CPK, rendimiento, utilización)
// ===========================================

export interface IndicadoresVehiculo {
    vehiculoId: number;
    placa: string;
    descripcion: string;
    estado: string;
    viajes: number;
    kilometros: number;
    ingresos: number;
    gastosRuta: number;
    pagosChofer: number;
    mantenimiento: number;
    correctivos: number;
    costoTotal: number;
    utilidad: number;
    margen: number;
    costoPorKm: number | null;
    ingresoPorKm: number | null;
    galones: number;
    rendimientoKmGal: number | null;
    rendimientoEsperadoKmGal: number | null;
    diagnosticoCombustible: DiagnosticoCombustible;
    utilizacion: number;
}

export const indicadoresPorVehiculo = (
    vehiculos: VehiculoAnalitica[],
    viajes: ViajeAnalitica[],
    mantenimientos: MantenimientoAnalitica[],
    periodo: Periodo,
    ahora: Date = new Date()
): IndicadoresVehiculo[] => {
    const totalDias = diasPeriodo(periodo);
    return vehiculos.map(veh => {
        const propios = viajes.filter(v => v.vehiculoId === veh.id);
        const hechos = completados(propios);
        const km = hechos.reduce((s, v) => s + (v.kilometrosReales || 0), 0);
        const ingresos = hechos.reduce((s, v) => s + num(v.tarifa), 0);
        const gastos = propios.flatMap(v => v.gastos);
        const gastosRuta = totalGastos(gastos);
        const pagosChofer = propios.reduce((s, v) => s + costoChoferViaje(v.pagosChofer), 0);
        const mants = mantenimientos.filter(m => m.vehiculoId === veh.id);
        const mantenimiento = mants.reduce((s, m) => s + num(m.costoTotal), 0);
        const costoTotal = gastosRuta + pagosChofer + mantenimiento;

        // Rendimiento solo con viajes completados que tengan km reales y cargas de combustible
        const conCombustible = hechos.filter(v => v.kilometrosReales && totalGalones(v.gastos) > 0);
        const kmCombustible = conCombustible.reduce((s, v) => s + (v.kilometrosReales || 0), 0);
        const galonesMedidos = conCombustible.reduce((s, v) => s + totalGalones(v.gastos), 0);
        const rendimiento = dividir(kmCombustible, galonesMedidos);
        const esperado = veh.rendimientoEsperadoKmGal ? num(veh.rendimientoEsperadoKmGal) : null;

        return {
            vehiculoId: veh.id,
            placa: veh.placa,
            descripcion: `${veh.marca} ${veh.modelo}`,
            estado: veh.estado,
            viajes: hechos.length,
            kilometros: km,
            ingresos: r2(ingresos),
            gastosRuta: r2(gastosRuta),
            pagosChofer: r2(pagosChofer),
            mantenimiento: r2(mantenimiento),
            correctivos: mants.filter(m => m.tipo === 'CORRECTIVO').length,
            costoTotal: r2(costoTotal),
            utilidad: r2(ingresos - costoTotal),
            margen: porcentaje(ingresos - costoTotal, ingresos),
            costoPorKm: dividir(costoTotal, km),
            ingresoPorKm: dividir(ingresos, km),
            galones: r2(totalGalones(gastos)),
            rendimientoKmGal: rendimiento,
            rendimientoEsperadoKmGal: esperado,
            diagnosticoCombustible: diagnosticarRendimiento(rendimiento, esperado),
            utilizacion: porcentaje(diasEnViaje(propios, periodo, ahora), totalDias),
        };
    }).sort((a, b) => b.utilidad - a.utilidad);
};

// ===========================================
// Rentabilidad por cliente y por ruta
// ===========================================

export interface IndicadoresGrupo {
    clave: string;
    nombre: string;
    viajes: number;
    kilometros: number;
    ingresos: number;
    costos: number;
    utilidad: number;
    margen: number;
    ticketPromedio: number;
    costoPorKm: number | null;
}

const agrupar = (viajes: ViajeAnalitica[], clave: (v: ViajeAnalitica) => string, nombre: (v: ViajeAnalitica) => string): IndicadoresGrupo[] => {
    const grupos = new Map<string, { nombre: string; viajes: ViajeAnalitica[] }>();
    for (const v of completados(viajes)) {
        const k = clave(v);
        if (!grupos.has(k)) grupos.set(k, { nombre: nombre(v), viajes: [] });
        grupos.get(k)!.viajes.push(v);
    }
    return [...grupos.entries()].map(([k, g]) => {
        const ingresos = g.viajes.reduce((s, v) => s + num(v.tarifa), 0);
        const costos = g.viajes.reduce((s, v) => s + totalGastos(v.gastos) + costoChoferViaje(v.pagosChofer), 0);
        const km = g.viajes.reduce((s, v) => s + (v.kilometrosReales || 0), 0);
        return {
            clave: k,
            nombre: g.nombre,
            viajes: g.viajes.length,
            kilometros: km,
            ingresos: r2(ingresos),
            costos: r2(costos),
            utilidad: r2(ingresos - costos),
            margen: porcentaje(ingresos - costos, ingresos),
            ticketPromedio: r2(ingresos / g.viajes.length),
            costoPorKm: dividir(costos, km),
        };
    }).sort((a, b) => b.utilidad - a.utilidad);
};

const normalizar = (t: string) => t.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(',')[0].trim();

export const rentabilidadPorCliente = (viajes: ViajeAnalitica[]) =>
    agrupar(viajes, v => String(v.clienteId), v => v.cliente.nombreRazonSocial);

// La ruta se agrupa por ciudad (texto antes de la primera coma), sin tildes ni mayúsculas
export const rentabilidadPorRuta = (viajes: ViajeAnalitica[]) =>
    agrupar(
        viajes,
        v => `${normalizar(v.origen)}→${normalizar(v.destino)}`,
        v => `${v.origen.split(',')[0].trim()} → ${v.destino.split(',')[0].trim()}`
    );

// ===========================================
// Ranking de choferes
// ===========================================

export const indicadoresPorChofer = (viajes: ViajeAnalitica[], pagos: PagoAnalitica[]) => {
    const ids = [...new Set(viajes.map(v => v.choferId))];
    return ids.map(id => {
        const propios = viajes.filter(v => v.choferId === id);
        const hechos = completados(propios);
        const km = hechos.reduce((s, v) => s + (v.kilometrosReales || 0), 0);
        const ingresos = hechos.reduce((s, v) => s + num(v.tarifa), 0);
        const gastos = totalGastos(propios.flatMap(v => v.gastos));
        const conCombustible = hechos.filter(v => v.kilometrosReales && totalGalones(v.gastos) > 0);
        const galones = conCombustible.reduce((s, v) => s + totalGalones(v.gastos), 0);
        const kmCombustible = conCombustible.reduce((s, v) => s + (v.kilometrosReales || 0), 0);
        const pagado = pagos.filter(p => p.choferId === id && esCostoNomina(p.tipoPago)).reduce((s, p) => s + num(p.monto), 0);
        const { nombres, apellidos } = propios[0].chofer;
        return {
            choferId: id,
            nombre: `${nombres} ${apellidos}`,
            viajes: hechos.length,
            kilometros: km,
            ingresosGenerados: r2(ingresos),
            gastosRuta: r2(gastos),
            gastoPorKm: dividir(gastos, km),
            rendimientoKmGal: dividir(kmCombustible, galones),
            pagosRecibidos: r2(pagado),
        };
    }).sort((a, b) => b.kilometros - a.kilometros);
};

// ===========================================
// KPIs consolidados de la flota
// ===========================================

export const kpisFlota = (serie: PuntoMensual[], vehiculos: IndicadoresVehiculo[]) => {
    const ingresos = serie.reduce((s, p) => s + p.ingresos, 0);
    const costos = serie.reduce((s, p) => s + p.costos, 0);
    const km = serie.reduce((s, p) => s + p.kilometros, 0);
    const viajes = serie.reduce((s, p) => s + p.viajes, 0);
    const conRendimiento = vehiculos.filter(v => v.rendimientoKmGal !== null);
    const operativos = vehiculos.filter(v => v.estado !== 'INACTIVO');
    return {
        ingresos: r2(ingresos),
        costos: r2(costos),
        utilidad: r2(ingresos - costos),
        margen: porcentaje(ingresos - costos, ingresos),
        viajesCompletados: viajes,
        kilometros: km,
        costoPorKm: dividir(costos, km),
        ingresoPorKm: dividir(ingresos, km),
        rendimientoPromedioKmGal: conRendimiento.length
            ? r2(conRendimiento.reduce((s, v) => s + (v.rendimientoKmGal || 0), 0) / conRendimiento.length)
            : null,
        utilizacionPromedio: operativos.length
            ? r2(operativos.reduce((s, v) => s + v.utilizacion, 0) / operativos.length)
            : 0,
        alertasCombustible: vehiculos.filter(v => v.diagnosticoCombustible === 'BAJO').length,
    };
};
