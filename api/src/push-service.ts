import { connect } from 'node:http2';
import { importPKCS8, SignJWT } from 'jose';
import type { AppConfig } from './config.js';

/**
 * Minimal APNs HTTP/2 provider-token client. It avoids the unmaintained `apn`
 * package and its GitHub tarball dependency, so frozen pnpm installs remain verifiable.
 * APNs is a prompt-to-sync signal; license revision verification remains authoritative.
 */
export class PushService {
  private constructor(
    private readonly topic?: string,
    private readonly teamId?: string,
    private readonly keyId?: string,
    private readonly privateKey?: CryptoKey,
    private readonly production = false,
  ) {}

  static async create(config: AppConfig) {
    if (!config.APNS_KEY_ID || !config.APNS_TEAM_ID || !config.APNS_BUNDLE_ID || !config.APNS_PRIVATE_KEY) return new PushService();
    const privateKey = await importPKCS8(config.APNS_PRIVATE_KEY.replace(/\\n/g, '\n'), 'ES256');
    return new PushService(config.APNS_BUNDLE_ID, config.APNS_TEAM_ID, config.APNS_KEY_ID, privateKey, config.NODE_ENV === 'production');
  }

  get enabled() { return Boolean(this.privateKey && this.topic); }

  async notifyLicenseChanged(tokens: string[], revision: number) {
    if (!this.privateKey || !this.topic || !this.teamId || !this.keyId || tokens.length === 0) return;
    const providerToken = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: this.keyId })
      .setIssuer(this.teamId)
      .setIssuedAt()
      .sign(this.privateKey);
    await Promise.all(tokens.map(token => this.send(token, providerToken, revision)));
  }

  private async send(token: string, providerToken: string, revision: number) {
    const authority = this.production ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com';
    const client = connect(authority);
    try {
      await new Promise<void>((resolve, reject) => {
        client.on('error', reject);
        const request = client.request({
          ':method': 'POST', ':path': `/3/device/${token}`,
          authorization: `bearer ${providerToken}`,
          'apns-topic': this.topic!, 'apns-push-type': 'background', 'apns-priority': '5',
          'content-type': 'application/json',
        });
        let status = 0;
        let response = '';
        request.on('response', headers => { status = Number(headers[':status'] ?? 0); });
        request.on('data', chunk => { response += String(chunk); });
        request.on('error', reject);
        request.on('end', () => status >= 200 && status < 300 ? resolve() : reject(new Error(`APNs ${status}: ${response || 'delivery failed'}`)));
        request.end(JSON.stringify({ aps: { 'content-available': 1 }, type: 'license_changed', revision }));
      });
    } finally {
      client.close();
    }
  }

  async close() {}
}
