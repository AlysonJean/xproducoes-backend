import { dtoTransformerMiddleware } from '../../middlewares/dto.middleware';
import { Decimal } from '@prisma/client/runtime/library';

describe('dtoTransformerMiddleware', () => {
  let req: any, res: any, next: any;

  beforeEach(() => {
    req = {};
    res = { json: jest.fn() };
    next = jest.fn();
  });

  it('deve transformar Decimal em number', () => {
    const originalJson = res.json;
    dtoTransformerMiddleware(req, res, next);
    
    const decimal = new Decimal('123.45');
    const data = { price: decimal };
    res.json(data);
    
    expect(originalJson).toHaveBeenCalledWith({ price: 123.45 });
  });

  it('deve transformar arrays de Decimal', () => {
    const originalJson = res.json;
    dtoTransformerMiddleware(req, res, next);
    
    const decimalArr = [new Decimal('1.1'), new Decimal('2.2')];
    res.json({ arr: decimalArr });
    
    expect(originalJson).toHaveBeenCalledWith({ arr: [1.1, 2.2] });
  });

  it('deve transformar objetos aninhados com Decimal', () => {
    const originalJson = res.json;
    dtoTransformerMiddleware(req, res, next);
    
    const data = { nested: { value: new Decimal('9.99') } };
    res.json(data);
    
    expect(originalJson).toHaveBeenCalledWith({ nested: { value: 9.99 } });
  });

  it('deve passar tipos primitivos sem alteração', () => {
    const originalJson = res.json;
    dtoTransformerMiddleware(req, res, next);
    
    const data = { str: 'abc', num: 42, bool: true };
    res.json(data);
    
    expect(originalJson).toHaveBeenCalledWith(data);
  });

  it('deve chamar next()', () => {
    dtoTransformerMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
