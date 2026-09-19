import { createHmac, timingSafeEqual } from 'node:crypto';
import { generateKeyPair, importJWK, SignJWT } from 'jose';
import type { AppConfig } from './config.js';

export function hmac(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function sameSignature(left: string, right: string): boolean {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function displayUid(uid: string): string {
  return uid.length <= 8 ? uid : `${uid.slice(0, 4)}…${uid.slice(-4)}`;
}

export async function createLicenseSigner(config: AppConfig) {
  let privateKey: CryptoKey;
  if (config.LICENSE_ED25519_PRIVATE_JWK) {
    privateKey = await importJWK(JSON.parse(config.LICENSE_ED25519_PRIVATE_JWK), 'EdDSA') as CryptoKey;
  } else {
    if (config.NODE_ENV === 'production') throw new Error('LICENSE_ED25519_PRIVATE_JWK is required in production');
    ({ privateKey } = await generateKeyPair('EdDSA'));
  }

  return async (claims: { key: string; uidHash: string; maxDevices: number; features: string[]; expiresAt: Date | null; revision: number }) => {
    const now = Math.floor(Date.now() / 1000);
    const keyExpiry = claims.expiresAt ? Math.floor(claims.expiresAt.getTime() / 1000) : now + config.LICENSE_TOKEN_TTL_SECONDS;
    const exp = Math.min(now + config.LICENSE_TOKEN_TTL_SECONDS, keyExpiry);
    return new SignJWT({ key: claims.key, uid_hash: claims.uidHash, max_devices: claims.maxDevices, features: claims.features, rev: claims.revision })
      .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(privateKey);
  };
}
