// Reglas de negocio de cartera y facturación (lógica pura, sin base de datos)
import { EstadoFactura } from '@prisma/client';

// Un cliente con facturas vencidas más allá de este plazo no puede recibir nuevos viajes
export const DIAS_BLOQUEO_POR_MORA = 60;

const MS_DIA = 24 * 60 * 60 * 1000;
const redondear = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export type CategoriaAntiguedad = 'CORRIENTE' | '1_A_30' | '31_A_60' | '61_A_90' | 'MAS_90';

export const clasificarVencimiento = (
    fechaVencimiento: Date,
    hoy: Date = new Date()
): { diasDiferencia: number; categoria: CategoriaAntiguedad } => {
    const dias = Math.floor((hoy.getTime() - new Date(fechaVencimiento).getTime()) / MS_DIA);
    if (dias <= 0) return { diasDiferencia: dias, categoria: 'CORRIENTE' };
    if (dias <= 30) return { diasDiferencia: dias, categoria: '1_A_30' };
    if (dias <= 60) return { diasDiferencia: dias, categoria: '31_A_60' };
    if (dias <= 90) return { diasDiferencia: dias, categoria: '61_A_90' };
    return { diasDiferencia: dias, categoria: 'MAS_90' };
};

export const calcularTotalesFactura = (subtotal: number, ivaPorcentaje: number) => {
    const sub = redondear(subtotal);
    const iva = redondear(sub * (ivaPorcentaje / 100));
    return { subtotal: sub, iva, total: redondear(sub + iva) };
};

export const calcularFechaVencimiento = (fechaEmision: Date, diasCredito: number): Date =>
    new Date(new Date(fechaEmision).getTime() + diasCredito * MS_DIA);

// Numeración con formato de comprobante: establecimiento-punto-secuencial (9 dígitos)
const PATRON_NUMERO = /^(\d{3})-(\d{3})-(\d{9})$/;

export const siguienteNumeroFactura = (ultimo: string | null | undefined): string => {
    const coincidencia = ultimo ? PATRON_NUMERO.exec(ultimo) : null;
    if (!coincidencia) return '001-001-000000001';
    const secuencial = String(Number(coincidencia[3]) + 1).padStart(9, '0');
    return `${coincidencia[1]}-${coincidencia[2]}-${secuencial}`;
};

export const esNumeroFacturaValido = (numero: string) => PATRON_NUMERO.test(numero);

export const estadoSegunSaldo = (total: number, saldo: number): EstadoFactura => {
    if (saldo <= 0.005) return EstadoFactura.PAGADA;
    if (saldo >= total - 0.005) return EstadoFactura.PENDIENTE;
    return EstadoFactura.PAGADA_PARCIAL;
};

export interface FacturaCartera {
    clienteId: number;
    clienteNombre: string;
    saldoPendiente: number;
    fechaVencimiento: Date;
    estado: EstadoFactura;
}

export interface ResumenCartera {
    aging: Record<'corriente' | 'vencido1a30' | 'vencido31a60' | 'vencido61a90' | 'vencidoMas90' | 'totalPendiente' | 'totalVencido', number>;
    morosos: Array<{ clienteId: number; nombre: string; deudaVencida: number; diasMoraMaxima: number; bloqueado: boolean }>;
}

// Antigüedad de saldos y clientes en mora a partir de las facturas con saldo
export const resumirCartera = (facturas: FacturaCartera[], hoy: Date = new Date()): ResumenCartera => {
    const aging = { corriente: 0, vencido1a30: 0, vencido31a60: 0, vencido61a90: 0, vencidoMas90: 0, totalPendiente: 0, totalVencido: 0 };
    const porCliente = new Map<number, { nombre: string; deuda: number; dias: number }>();

    for (const f of facturas) {
        if (f.estado === EstadoFactura.ANULADA || f.saldoPendiente <= 0.005) continue;
        const { categoria, diasDiferencia } = clasificarVencimiento(f.fechaVencimiento, hoy);
        aging.totalPendiente += f.saldoPendiente;

        if (categoria === 'CORRIENTE') {
            aging.corriente += f.saldoPendiente;
            continue;
        }
        aging.totalVencido += f.saldoPendiente;
        if (categoria === '1_A_30') aging.vencido1a30 += f.saldoPendiente;
        else if (categoria === '31_A_60') aging.vencido31a60 += f.saldoPendiente;
        else if (categoria === '61_A_90') aging.vencido61a90 += f.saldoPendiente;
        else aging.vencidoMas90 += f.saldoPendiente;

        const previo = porCliente.get(f.clienteId) ?? { nombre: f.clienteNombre, deuda: 0, dias: 0 };
        previo.deuda += f.saldoPendiente;
        previo.dias = Math.max(previo.dias, diasDiferencia);
        porCliente.set(f.clienteId, previo);
    }

    return {
        aging: Object.fromEntries(Object.entries(aging).map(([k, v]) => [k, redondear(v)])) as ResumenCartera['aging'],
        morosos: [...porCliente.entries()]
            .map(([clienteId, d]) => ({
                clienteId,
                nombre: d.nombre,
                deudaVencida: redondear(d.deuda),
                diasMoraMaxima: d.dias,
                bloqueado: d.dias > DIAS_BLOQUEO_POR_MORA,
            }))
            .sort((a, b) => b.deudaVencida - a.deudaVencida),
    };
};
