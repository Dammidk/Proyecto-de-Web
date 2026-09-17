import { describe, it, expect } from 'vitest';
import { EstadoFactura } from '@prisma/client';
import {
    clasificarVencimiento, calcularTotalesFactura, calcularFechaVencimiento, siguienteNumeroFactura,
    esNumeroFacturaValido, estadoSegunSaldo, resumirCartera, DIAS_BLOQUEO_POR_MORA,
} from '../src/domain/cartera';

describe('Cartera - antigüedad de saldos', () => {
    const hoy = new Date('2026-10-02T12:00:00Z');

    it('clasifica como CORRIENTE si el vencimiento es futuro', () => {
        const res = clasificarVencimiento(new Date('2026-10-20T12:00:00Z'), hoy);
        expect(res.categoria).toBe('CORRIENTE');
        expect(res.diasDiferencia).toBeLessThanOrEqual(0);
    });

    it('clasifica los tramos de mora', () => {
        expect(clasificarVencimiento(new Date('2026-09-22T12:00:00Z'), hoy).categoria).toBe('1_A_30');
        expect(clasificarVencimiento(new Date('2026-08-15T12:00:00Z'), hoy).categoria).toBe('31_A_60');
        expect(clasificarVencimiento(new Date('2026-07-25T12:00:00Z'), hoy).categoria).toBe('61_A_90');
        expect(clasificarVencimiento(new Date('2026-05-01T12:00:00Z'), hoy).categoria).toBe('MAS_90');
    });
});

describe('Cartera - emisión de facturas', () => {
    it('calcula subtotal, IVA y total con redondeo a centavos', () => {
        expect(calcularTotalesFactura(1000, 15)).toEqual({ subtotal: 1000, iva: 150, total: 1150 });
        expect(calcularTotalesFactura(333.33, 15)).toEqual({ subtotal: 333.33, iva: 50, total: 383.33 });
    });

    it('calcula el vencimiento según los días de crédito', () => {
        const emision = new Date('2026-10-01T00:00:00Z');
        expect(calcularFechaVencimiento(emision, 30).toISOString()).toBe('2026-10-31T00:00:00.000Z');
    });

    it('genera la numeración secuencial con formato de comprobante', () => {
        expect(siguienteNumeroFactura(null)).toBe('001-001-000000001');
        expect(siguienteNumeroFactura('001-001-000000009')).toBe('001-001-000000010');
        expect(siguienteNumeroFactura('FAC-001-00245')).toBe('001-001-000000001');
    });

    it('valida el formato del número de factura', () => {
        expect(esNumeroFacturaValido('001-001-000000123')).toBe(true);
        expect(esNumeroFacturaValido('FAC-1')).toBe(false);
    });

    it('determina el estado según el saldo', () => {
        expect(estadoSegunSaldo(100, 100)).toBe(EstadoFactura.PENDIENTE);
        expect(estadoSegunSaldo(100, 40)).toBe(EstadoFactura.PAGADA_PARCIAL);
        expect(estadoSegunSaldo(100, 0)).toBe(EstadoFactura.PAGADA);
    });
});

describe('Cartera - resumen y bloqueo por mora', () => {
    const hoy = new Date('2026-10-02T12:00:00Z');
    const factura = (clienteId: number, saldo: number, vence: string, estado: EstadoFactura = EstadoFactura.PENDIENTE) => ({
        clienteId, clienteNombre: `Cliente ${clienteId}`, saldoPendiente: saldo, fechaVencimiento: new Date(vence), estado,
    });

    it('agrupa los saldos por antigüedad y omite anuladas y saldadas', () => {
        const r = resumirCartera([
            factura(1, 100, '2026-10-20T12:00:00Z'),
            factura(1, 200, '2026-09-22T12:00:00Z'),
            factura(2, 300, '2026-05-01T12:00:00Z'),
            factura(3, 999, '2026-05-01T12:00:00Z', EstadoFactura.ANULADA),
            factura(4, 0, '2026-05-01T12:00:00Z', EstadoFactura.PAGADA),
        ], hoy);
        expect(r.aging.corriente).toBe(100);
        expect(r.aging.vencido1a30).toBe(200);
        expect(r.aging.vencidoMas90).toBe(300);
        expect(r.aging.totalPendiente).toBe(600);
        expect(r.aging.totalVencido).toBe(500);
    });

    it('marca como bloqueados a los clientes con mora superior al límite', () => {
        const r = resumirCartera([
            factura(1, 200, '2026-09-22T12:00:00Z'),
            factura(2, 300, '2026-05-01T12:00:00Z'),
        ], hoy);
        const bloqueado = (id: number) => r.morosos.find(m => m.clienteId === id)?.bloqueado;
        expect(bloqueado(1)).toBe(false);
        expect(bloqueado(2)).toBe(true);
        expect(r.morosos[0].clienteId).toBe(2);
        expect(DIAS_BLOQUEO_POR_MORA).toBe(60);
    });
});
