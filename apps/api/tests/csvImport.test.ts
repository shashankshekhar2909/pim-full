import { coerce, suggestMapping } from '../src/lib/csvImport.js';

describe('coerce()', () => {
  test('empty string -> null', () => {
    expect(coerce('', 'text')).toEqual({ ok: true, value: null });
    expect(coerce('   ', 'integer')).toEqual({ ok: true, value: null });
  });

  describe('integer', () => {
    test.each([
      ['42', 42],
      ['-7', -7],
      ['0', 0],
    ])('%s -> %d', (input, expected) => {
      expect(coerce(input, 'integer')).toEqual({ ok: true, value: expected });
    });
    test.each(['3.14', 'abc', '1e2.5'])('rejects %s', (input) => {
      const r = coerce(input, 'integer');
      expect(r.ok).toBe(false);
    });
  });

  describe('decimal', () => {
    test('handles $ and commas', () => {
      expect(coerce('$1,234.56', 'decimal')).toEqual({ ok: true, value: 1234.56 });
    });
    test('rejects non-numeric', () => {
      expect(coerce('abc', 'decimal').ok).toBe(false);
    });
  });

  describe('boolean', () => {
    test.each([
      ['true', true], ['yes', true], ['Y', true], ['1', true],
      ['false', false], ['no', false], ['N', false], ['0', false],
    ])('%s -> %s', (input, expected) => {
      expect(coerce(input, 'boolean')).toEqual({ ok: true, value: expected });
    });
    test('rejects ambiguous', () => {
      expect(coerce('maybe', 'boolean').ok).toBe(false);
    });
  });

  describe('date', () => {
    test('parses iso', () => {
      const r = coerce('2026-04-23', 'date');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBeInstanceOf(Date);
    });
    test('rejects garbage', () => {
      expect(coerce('not-a-date', 'date').ok).toBe(false);
    });
  });

  test('unknown type falls through to string', () => {
    expect(coerce('hello', 'custom-type')).toEqual({ ok: true, value: 'hello' });
  });
});

describe('suggestMapping()', () => {
  test('maps standard headers to known fields', () => {
    const out = suggestMapping(['SKU', 'Product Name', 'Price', 'Stock']);
    expect(out['SKU']).toBe('skuCode');
    expect(out['Product Name']).toBe('name');
    expect(out['Price']).toBe('pricing.price');
    expect(out['Stock']).toBe('stockLevel');
  });

  test('unknown headers default to attribute', () => {
    const out = suggestMapping(['Color', 'Weight kg']);
    expect(out['Color']).toBe('attr:Color');
    expect(out['Weight kg']).toBe('attr:Weight kg');
  });

  test('case-insensitive matching', () => {
    const out = suggestMapping(['sku_code', 'TITLE']);
    expect(out['sku_code']).toBe('skuCode');
    expect(out['TITLE']).toBe('name');
  });
});
