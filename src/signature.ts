import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Flatten nested objects/arrays into PHP `http_build_query`-style key/value pairs.
 */
function flattenParams(
  input: Record<string, unknown>,
  prefix = ''
): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;

    const fullKey = prefix ? `${prefix}[${key}]` : key;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          pairs.push(
            ...flattenParams(item as Record<string, unknown>, `${fullKey}[${index}]`)
          );
        } else {
          pairs.push([`${fullKey}[${index}]`, String(item)]);
        }
      });
    } else if (typeof value === 'object') {
      pairs.push(...flattenParams(value as Record<string, unknown>, fullKey));
    } else {
      // PHP casts booleans to 1/0 when building a query string.
      const normalized =
        typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
      pairs.push([fullKey, normalized]);
    }
  }

  return pairs;
}

/**
 * PHP-compatible sorted query string.
 * Mirrors nodejs package: ksort → http_build_query.
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(params).sort()) {
    sorted[key] = params[key];
  }

  const pairs = flattenParams(sorted);
  return pairs
    .map(
      ([k, v]) =>
        `${phpUrlEncode(k)}=${phpUrlEncode(v)}`
    )
    .join('&');
}

/** Encode using PHP's RFC1738 `urlencode`, as used by `http_build_query`. */
function phpUrlEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()~*]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    )
    .replace(/%20/g, '+');
}

export function signPayload(query: string, secretKey: string): string {
  return createHmac('sha256', secretKey).update(query).digest('hex');
}

export function createAuthHeader(publicKey: string, signature: string): string {
  const token = Buffer.from(`${publicKey}:${signature}`).toString('base64');
  return `Bearer ${token}`;
}

export function parseAuthToken(
  authorization?: string | null,
  authStr?: string | null
): { publicKey: string; signature: string } | null {
  let encoded: string | null = null;

  if (authorization) {
    encoded = authorization.replace(/^Bearer\s+/i, '').trim();
  } else if (authStr) {
    encoded = String(authStr).trim();
  }

  if (!encoded) return null;

  // Buffer.from(value, 'base64') silently accepts malformed input.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 === 1) {
    return null;
  }

  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx === -1) return null;
    return {
      publicKey: decoded.slice(0, idx),
      signature: decoded.slice(idx + 1),
    };
  } catch {
    return null;
  }
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
