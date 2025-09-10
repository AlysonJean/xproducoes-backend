import { sendSuccess, sendError, sendPaginated, addRequestId, HttpStatus } from '../response';

describe('response utils', () => {
  const mockRes = () => {
    const res: any = {
      statusCode: 0,
      jsonData: null,
      headers: {} as Record<string, string>,
      status(code: number) { this.statusCode = code; return this; },
      json(data: any) { this.jsonData = data; return this; },
      get(key: string) { return this.headers[key]; },
      set(key: string, value: string) { this.headers[key] = value; },
    };
    return res;
  };
  let res: any;
  beforeEach(() => { res = mockRes(); });

  it('sendSuccess returns correct response', () => {
    res.set('X-Request-ID', 'abc');
    sendSuccess(res, { foo: 1 }, HttpStatus.CREATED, 'ok');
    expect(res.statusCode).toBe(HttpStatus.CREATED);
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.data).toEqual({ foo: 1 });
    expect(res.jsonData.message).toBe('ok');
    expect(res.jsonData.meta.requestId).toBe('abc');
  });

  it('sendError returns correct response', () => {
    res.set('X-Request-ID', 'xyz');
    sendError(res, 'fail', HttpStatus.FORBIDDEN, ['e1', 'e2']);
    expect(res.statusCode).toBe(HttpStatus.FORBIDDEN);
    expect(res.jsonData.success).toBe(false);
    expect(res.jsonData.message).toBe('fail');
    expect(res.jsonData.errors).toEqual(['e1', 'e2']);
    expect(res.jsonData.meta.requestId).toBe('xyz');
  });

  it('sendPaginated returns correct response', () => {
    res.set('X-Request-ID', 'pqr');
    sendPaginated(res, [1, 2], 10, 2, 2, 'msg');
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.data.items).toEqual([1, 2]);
    expect(res.jsonData.data.pagination.page).toBe(2);
    expect(res.jsonData.data.pagination.total).toBe(10);
    expect(res.jsonData.data.pagination.totalPages).toBe(5);
    expect(res.jsonData.meta.requestId).toBe('pqr');
  });

  it('addRequestId sets X-Request-ID and req.requestId', () => {
    const req: any = { headers: {} };
    const res: any = { set: jest.fn() };
    const next = jest.fn();
    addRequestId(req, res, next);
    expect(res.set).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
    expect(req.requestId).toMatch(/^req_/);
    expect(next).toHaveBeenCalled();
  });
});
