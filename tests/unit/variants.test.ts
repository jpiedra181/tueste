import { describe, expect, it } from 'vitest';
import products from '@/data/products.json';
import { productSchema, type Product } from '@/lib/schemas';
import {
  defaultSelection,
  findVariant,
  isGrindAvailable,
  isSizeAvailable,
  resolveSelection,
  selectGrind,
  selectionFromSearch,
  selectionToSearch,
  translateSearch,
} from '@/lib/variants';

const hambela: Product = productSchema.parse(products.find((p) => p.id === 'hambela'));
const kiambu: Product = productSchema.parse(products.find((p) => p.id === 'kiambu'));

describe('disponibilidad', () => {
  it('Hambela Filtro · 1 kg está agotado y el resto no', () => {
    expect(isSizeAvailable(hambela, 'filter', '1kg')).toBe(false);
    expect(isSizeAvailable(hambela, 'filter', '250g')).toBe(true);
    expect(isSizeAvailable(hambela, 'espresso', '1kg')).toBe(true);
  });

  it('una molienda sigue disponible si le queda algún tamaño', () => {
    expect(isGrindAvailable(hambela, 'filter')).toBe(true);
    expect(isGrindAvailable(kiambu, 'espresso')).toBe(false);
  });
});

describe('resolveSelection', () => {
  it('sin parámetros devuelve la variante por defecto', () => {
    expect(resolveSelection(hambela, {})).toEqual({ selection: { grind: 'beans', size: '250g' }, adjusted: false });
    expect(defaultSelection(hambela)).toEqual({ grind: 'beans', size: '250g' });
  });

  it('respeta una combinación válida', () => {
    expect(resolveSelection(hambela, { grind: 'espresso', size: '1kg' })).toEqual({
      selection: { grind: 'espresso', size: '1kg' },
      adjusted: false,
    });
  });

  it('una combinación agotada mantiene la molienda y cambia de tamaño', () => {
    expect(resolveSelection(hambela, { grind: 'filter', size: '1kg' })).toEqual({
      selection: { grind: 'filter', size: '250g' },
      adjusted: true,
    });
  });

  it('una molienda agotada entera salta a la primera variante con stock', () => {
    expect(resolveSelection(kiambu, { grind: 'espresso', size: '250g' })).toEqual({
      selection: { grind: 'beans', size: '250g' },
      adjusted: true,
    });
  });
});

describe('selectGrind', () => {
  it('cambia de tamaño si el actual queda agotado', () => {
    const result = selectGrind(hambela, { grind: 'beans', size: '1kg' }, 'filter');
    expect(result).toEqual({ selection: { grind: 'filter', size: '250g' }, adjusted: true });
    expect(findVariant(hambela, result.selection)?.sku).toBe('HAM-FIL-250');
  });

  it('mantiene el tamaño si sigue disponible', () => {
    expect(selectGrind(hambela, { grind: 'beans', size: '1kg' }, 'espresso')).toEqual({
      selection: { grind: 'espresso', size: '1kg' },
      adjusted: false,
    });
  });
});

describe('URL', () => {
  it('lee y escribe los parámetros en español', () => {
    expect(selectionFromSearch('es', '?molienda=espresso&tamano=1kg')).toEqual({ grind: 'espresso', size: '1kg' });
    expect(selectionToSearch('es', { grind: 'filter', size: '250g' })).toBe('?molienda=filtro&tamano=250g');
  });

  it('lee y escribe los parámetros en inglés', () => {
    expect(selectionFromSearch('en', '?grind=beans&size=1kg')).toEqual({ grind: 'beans', size: '1kg' });
    expect(selectionToSearch('en', { grind: 'beans', size: '1kg' })).toBe('?grind=beans&size=1kg');
  });

  it('ignora valores desconocidos y conserva otros parámetros', () => {
    expect(selectionFromSearch('es', '?molienda=turca&tamano=5kg')).toEqual({});
    expect(selectionToSearch('es', { grind: 'beans', size: '250g' }, '?utm_source=x')).toBe(
      '?utm_source=x&molienda=grano&tamano=250g',
    );
  });

  it('traduce los parámetros al cambiar de idioma', () => {
    expect(translateSearch('es', 'en', '?molienda=filtro&tamano=250g')).toBe('?grind=filter&size=250g');
    expect(translateSearch('en', 'es', '?grind=beans&size=1kg&ref=a')).toBe('?ref=a&molienda=grano&tamano=1kg');
    expect(translateSearch('es', 'en', '')).toBe('');
  });
});
