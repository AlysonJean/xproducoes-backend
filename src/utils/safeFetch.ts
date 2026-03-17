import dns from 'dns';
import { promisify } from 'util';
import ipaddr from 'ipaddr.js';

const lookup = promisify(dns.lookup);

export type SafeFetchOptions = {
	maxRedirects?: number;
	timeoutMs?: number;
	allowedHosts?: Set<string>;
	init?: RequestInit;
};

export async function safeFetch(inputUrl: string, options: SafeFetchOptions = {}) {
	const { maxRedirects = 5, timeoutMs = 10000, allowedHosts = new Set<string>() } = options;

	const parsed = new URL(inputUrl);
	if (parsed.username || parsed.password) throw new Error('URL contains credentials which are not allowed');
	if (parsed.protocol !== 'https:') throw new Error('Only https protocol allowed');

	// Validações adicionais de segurança
	const dangerousSchemes = ['file:', 'dict:', 'ftp:', 'gopher:', 'ldap:', 'ldaps:', 'data:', 'javascript:'];
	if (dangerousSchemes.includes(parsed.protocol)) {
		throw new Error('Dangerous URL scheme not allowed');
	}

	// Validar porta se especificada
	if (parsed.port) {
		const port = parseInt(parsed.port, 10);
		// Bloquear portas suspeitas/comuns para serviços internos
		const suspiciousPorts = [22, 23, 25, 53, 110, 143, 993, 995, 3306, 5432, 6379, 27017];
		if (suspiciousPorts.includes(port)) {
			throw new Error('Suspicious port not allowed');
		}
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	// Lista de portas suspeitas
	const suspiciousPorts = [22, 23, 25, 53, 110, 143, 993, 995, 3306, 5432, 6379, 27017];

		const isAddrPrivate = (addr: string) => {
			try {
				const ip = ipaddr.parse(addr);
				if (ip.kind() === 'ipv4') {
					const cidrs = ['10.0.0.0/8','127.0.0.0/8','169.254.0.0/16','172.16.0.0/12','192.168.0.0/16'];
					for (const c of cidrs) {
						const [range, bits] = ipaddr.parseCIDR(c) as any;
						if ((ip as any).match([range, bits])) return true;
					}
				}
				if (ip.kind() === 'ipv6') {
					// ipaddr IPv6 object does not have isLoopback in types, check string
					if (ip.toNormalizedString() === '::1') return true;
					const cidrs6 = ['fe80::/10','fc00::/7'];
					for (const c of cidrs6) {
						const [range, bits] = ipaddr.parseCIDR(c) as any;
						if ((ip as any).match([range, bits])) return true;
					}
				}
			} catch {
				// not an IP literal, treat as not private here — DNS lookup will resolve
			}
			return false;
		};

	const validateHost = async (hostname: string) => {
		if (!allowedHosts.has(hostname)) throw new Error('Host not allowed');
		const addresses = await lookup(hostname, { all: true });
		for (const a of addresses) {
			if (isAddrPrivate(a.address)) throw new Error('Host resolves to internal address');
		}
	};

	try {
		await validateHost(parsed.hostname);

		let currentUrl = new URL(parsed.protocol + '//' + parsed.hostname + (parsed.port ? ':' + parsed.port : '') + parsed.pathname + parsed.search);

		for (let i = 0; i <= maxRedirects; i++) {
				// Merge headers safely: default accept plus any provided init.headers
				const defaultHeaders: any = { accept: '*/*' };
				const providedInit = options.init || {};
				let providedHeaders: any = {};
					if (providedInit.headers) {
						// headers can be Headers, array or plain object
						const h = providedInit.headers as any;
						if (typeof h === 'object' && typeof h.forEach === 'function') {
							// Headers-like
							try {
								// @ts-ignore
								h.forEach((value: any, key: any) => (providedHeaders[key] = value));
							} catch {
								// fallback to entries
								try {
									for (const [k, v] of h.entries()) providedHeaders[k] = v;
								} catch {
									// give up, leave providedHeaders empty
								}
							}
						} else if (Array.isArray(h)) {
							for (const [k, v] of h) providedHeaders[k] = v as any;
						} else {
							providedHeaders = h as any;
						}
					}
				const mergedHeaders = { ...defaultHeaders, ...providedHeaders };

				// Normalize providedInit: avoid null body
				const normalizedInit: any = { ...providedInit };
				if (normalizedInit.body === null) normalizedInit.body = undefined;

				const resp = await fetch(currentUrl.toString(), { signal: controller.signal, redirect: 'manual' as any, headers: mergedHeaders, ...normalizedInit });
			if (resp.status >= 300 && resp.status < 400) {
				const loc = resp.headers.get('location');
				if (!loc) throw new Error('Redirect without location');

				// Validar URL de redirecionamento
				let nextUrl: URL;
				try {
					nextUrl = new URL(loc, currentUrl);
				} catch {
					throw new Error('Invalid redirect URL');
				}

				// Bloquear esquemas perigosos no redirecionamento
				if (dangerousSchemes.includes(nextUrl.protocol)) {
					throw new Error('Redirect to dangerous protocol');
				}

				// Garantir que o redirecionamento seja HTTPS
				if (nextUrl.protocol !== 'https:') {
					throw new Error('Redirect to unsupported protocol');
				}

				// Validar porta no redirecionamento
				if (nextUrl.port) {
					const port = parseInt(nextUrl.port, 10);
					if (suspiciousPorts.includes(port)) {
						throw new Error('Redirect to suspicious port');
					}
				}

				// Validar hostname do redirecionamento
				await validateHost(nextUrl.hostname);
				currentUrl = nextUrl;
				continue;
			}
			clearTimeout(timeout);
			return resp; // caller handles content-type/size
		}
		throw new Error('Too many redirects');
	} catch (err) {
		clearTimeout(timeout);
		throw err;
	}
}
