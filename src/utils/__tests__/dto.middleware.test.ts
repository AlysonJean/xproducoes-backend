const { dtoTransformerMiddleware } = require('../../middlewares/dto.middleware');
const { Decimal } = require('@prisma/client/runtime/library');

describe('dtoTransformerMiddleware', () => {
  let req, res, next;
  beforeEach(() => {
    req = {};
    res = { json: jest.fn(function (body) { return body; }) };
    next = jest.fn();
  });

  it('deve transformar Decimal em number', () => {
    dtoTransformerMiddleware(req, res, next);
    const decimal = new Decimal('123.45');
    const data = { price: decimal };
    res.json(data);
    expect(res.json.mock.calls[0][0]).toEqual({ price: 123.45 });
  });

  it('deve transformar arrays de Decimal', () => {
    dtoTransformerMiddleware(req, res, next);
    const decimalArr = [new Decimal('1.1'), new Decimal('2.2')];
    res.json({ arr: decimalArr });
    expect(res.json.mock.calls[0][0]).toEqual({ arr: [1.1, 2.2] });
  });

  it('deve transformar objetos aninhados com Decimal', () => {
    dtoTransformerMiddleware(req, res, next);
    const data = { nested: { value: new Decimal('9.99') } };
    res.json(data);
    expect(res.json.mock.calls[0][0]).toEqual({ nested: { value: 9.99 } });
  });

  it('deve passar tipos primitivos sem alteração', () => {
    dtoTransformerMiddleware(req, res, next);
    res.json({ str: 'abc', num: 42, bool: true });
    expect(res.json.mock.calls[0][0]).toEqual({ str: 'abc', num: 42, bool: true });
  });

  it('deve chamar next()', () => {
    dtoTransformerMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
