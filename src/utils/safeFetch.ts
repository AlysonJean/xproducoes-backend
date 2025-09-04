import fetch from 'node-fetch';
import dns from 'dns';
import { promisify } from 'util';
import ipaddr from 'ipaddr.js';

const lookup = promisify(dns.lookup);

export type SafeFetchOptions = {
	maxRedirects?: number;
	timeoutMs?: number;
	allowedHosts?: Set<string>;
};

export async function safeFetch(inputUrl: string, options: SafeFetchOptions = {}) {
	const { maxRedirects = 5, timeoutMs = 10000, allowedHosts = new Set<string>() } = options;

	const parsed = new URL(inputUrl);
	if (parsed.username || parsed.password) throw new Error('URL contains credentials which are not allowed');
	if (parsed.protocol !== 'https:') throw new Error('Only https protocol allowed');

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
			} catch (err) {
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
			const resp = await fetch(currentUrl.toString(), { signal: controller.signal, redirect: 'manual' as any, headers: { accept: '*/*' } });
			if (resp.status >= 300 && resp.status < 400) {
				const loc = resp.headers.get('location');
				if (!loc) throw new Error('Redirect without location');
				const nextUrl = new URL(loc, currentUrl);
				if (nextUrl.protocol !== 'https:') throw new Error('Redirect to unsupported protocol');
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
