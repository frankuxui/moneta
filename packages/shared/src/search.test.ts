import { describe, expect, it } from 'vitest';
import { dateSearchText, matchesSearch, moneySearchText, normalizeSearch } from './search.js';

describe('búsqueda de valores legibles', () => {
  it('combina palabras sin distinguir mayúsculas ni acentos', () => {
    expect(matchesSearch('Café Alimentación Tarjeta', 'ALIMENTACION cafe')).toBe(true);
    expect(matchesSearch('Café Alimentación Tarjeta', 'cafe efectivo')).toBe(false);
    expect(matchesSearch('Café', '  ')).toBe(true);
  });
  it('reconoce céntimos exactos en formatos decimales y con agrupación', () => {
    for (const query of ['1.250,75 €', '1250.75', '1250,75', 'EUR']) {
      expect(matchesSearch(moneySearchText('125075'), query)).toBe(true);
    }
    expect(normalizeSearch('−1.250,75')).toBe('-1250,75');
    expect(matchesSearch(moneySearchText('125075'), '1250,76')).toBe(false);
  });
  it('reconoce fechas ISO, españolas y nombres de mes', () => {
    for (const query of ['2026-01-05', '05/01/2026', '5/1/2026', '5 ene 2026', 'enero']) {
      expect(matchesSearch(dateSearchText('2026-01-05'), query)).toBe(true);
    }
    expect(matchesSearch('Servicio normal', '%')).toBe(false);
    expect(matchesSearch('Oferta 50% dto', '50%')).toBe(true);
  });
});
