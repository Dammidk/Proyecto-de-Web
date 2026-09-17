import { describe, it, expect } from 'vitest';
import { escaparCelda, generarCsv } from '../src/utils/csv';

describe('Exportación CSV para Excel', () => {
  it('incluye BOM UTF-8, usa ";" como separador y coma decimal', () => {
    const csv = generarCsv([{ placa: 'GBA-1234', monto: 1234.5 }], [
      { titulo: 'Placa', valor: f => f.placa },
      { titulo: 'Monto', valor: f => f.monto },
    ]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual(['Placa;Monto', 'GBA-1234;1234,5']);
  });

  it('entrecomilla textos con separadores, comillas o saltos de línea', () => {
    expect(escaparCelda('Quito; norte')).toBe('"Quito; norte"');
    expect(escaparCelda('Dijo "hola"')).toBe('"Dijo ""hola"""');
  });

  it('neutraliza fórmulas para evitar inyección en Excel', () => {
    expect(escaparCelda('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(escaparCelda('@SUM(A1)')).toBe("'@SUM(A1)");
    // Un número negativo legítimo no se altera
    expect(escaparCelda(-12.5)).toBe('-12,5');
  });

  it('exporta fechas en formato ISO y deja vacíos los nulos', () => {
    expect(escaparCelda(new Date('2026-10-02T15:00:00Z'))).toBe('2026-10-02');
    expect(escaparCelda(null)).toBe('');
  });
});
