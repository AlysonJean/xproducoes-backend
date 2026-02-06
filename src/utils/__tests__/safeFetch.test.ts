import { safeFetch } from '../safeFetch';
import fetch from 'node-fetch';
import dns from 'dns';

jest.mock('node-fetch');
jest.mock('dns');

const mockedFetch = fetch as unknown as jest.MockedFunction<any>;
const mockedLookup = (dns.lookup as unknown) as jest.MockedFunction<any>;

describe('safeFetch', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should reject when DNS resolves to private IP', async () => {
    mockedLookup.mockImplementation((host: string, opts: any, cb: any) => {
      if (typeof opts === 'function') cb = opts;
      cb(null, [{ address: '127.0.0.1' }]);
    });

    await expect(safeFetch('https://res.cloudinary.com/image.png', { allowedHosts: new Set(['res.cloudinary.com']) })).rejects.toThrow('Host resolves to internal address');
  });

  it('should reject redirect to internal IP', async () => {
    // initial lookup ok
    mockedLookup.mockImplementation((host: string, opts: any, cb: any) => {
      if (typeof opts === 'function') cb = opts;
      cb(null, [{ address: '3.3.3.3' }]);
    });

    // first fetch returns 302 with location to another host
    mockedFetch.mockResolvedValueOnce({ status: 302, headers: new Map([['location','https://internal.example.com/']]) });
    // second lookup returns private IP
    mockedLookup.mockImplementationOnce((host: string, opts: any, cb: any) => {
      if (typeof opts === 'function') cb = opts;
      cb(null, [{ address: '10.0.0.5' }]);
    });

    await expect(safeFetch('https://res.cloudinary.com/redirect', { allowedHosts: new Set(['res.cloudinary.com','internal.example.com']) })).rejects.toThrow('Host resolves to internal address');
  });
});
