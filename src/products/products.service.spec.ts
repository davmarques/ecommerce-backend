import { BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService.normalizeVariants', () => {
  const service = new ProductsService({} as never, {} as never);
  const normalize = (variants: unknown) =>
    (service as unknown as { normalizeVariants: (value: unknown) => unknown }).normalizeVariants(variants);

  it('rejeita produto sem tamanhos', () => {
    expect(() => normalize([])).toThrow(BadRequestException);
  });

  it('rejeita tamanhos duplicados', () => {
    expect(() =>
      normalize([
        { size: 'P', sku: 'A', stock: 1 },
        { size: 'p', sku: 'B', stock: 2 },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejeita estoque negativo', () => {
    expect(() => normalize([{ size: 'P', sku: 'A', stock: -1 }])).toThrow(BadRequestException);
  });

  it('normaliza tamanhos validos', () => {
    expect(normalize([{ id: ' ', size: ' M ', sku: ' SKU-1 ', stock: 2.6 }])).toEqual([
      { id: undefined, size: 'M', sku: 'SKU-1', stock: 3 },
    ]);
  });
});
