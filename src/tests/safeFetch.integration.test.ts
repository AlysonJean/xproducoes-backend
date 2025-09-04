import { safeFetch } from '../utils/safeFetch';
import fetch from 'node-fetch';
import dns from 'dns';

jest.mock('node-fetch');
jest.mock('dns');

const mockedFetch = fetch as unknown as jest.MockedFunction<any>;
const mockedLookup = (dns.lookup as unknown) as jest.MockedFunction<any>;

describe('safeFetch integration-like', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows fetch when host resolves to public IP and is allowed', async () => {
    mockedLookup.mockImplementation((host: string, opts: any, cb: any) => {
      if (typeof opts === 'function') cb = opts;
      cb(null, [{ address: '3.3.3.3' }]);
    });

    mockedFetch.mockResolvedValueOnce({ status: 200, headers: { get: () => 'text/plain' }, text: async () => 'ok' });

    const res = await safeFetch('https://example.com/resource', { allowedHosts: new Set(['example.com']) });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe('ok');
  });

  it('rejects when host is not in allowedHosts', async () => {
    mockedLookup.mockImplementation((host: string, opts: any, cb: any) => {
      if (typeof opts === 'function') cb = opts;
      cb(null, [{ address: '3.3.3.3' }]);
    });

    await expect(safeFetch('https://evil.com/'),).rejects.toThrow('Host not allowed');
  });

  it('rejects when redirect resolves to private IP', async () => {
    // initial host ok
    mockedLookup.mockImplementation((host: string, opts: any, cb: any) => {
      if (typeof opts === 'function') cb = opts;
      cb(null, [{ address: '3.3.3.3' }]);
    });

    mockedFetch.mockResolvedValueOnce({ status: 302, headers: new Map([['location','https://internal.local/']]) });

    // redirect target resolves to private IP
    mockedLookup.mockImplementationOnce((host: string, opts: any, cb: any) => {
      if (typeof opts === 'function') cb = opts;
      cb(null, [{ address: '10.0.0.2' }]);
    });

    await expect(safeFetch('https://example.com/redirect', { allowedHosts: new Set(['example.com','internal.local']) })).rejects.toThrow('Host resolves to internal address');
  });
});
