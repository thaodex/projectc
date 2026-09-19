import type { PrismaClient, KeyStatus } from '@prisma/client';
import { hmac, displayUid } from './security.js';

type ActivateInput = { key: string; deviceUid: string; deviceName: string; platform: string; enrollmentToken: string; osVersion?: string; appVersion?: string };

export class LicenseError extends Error {
  constructor(public code: string, message: string, public status = 400, public details?: unknown) { super(message); }
}

export class LicenseService {
  constructor(private readonly db: PrismaClient, private readonly uidPepper: string, private readonly enrollmentSecret: string, private readonly sign: (claims: { key: string; uidHash: string; maxDevices: number; features: string[]; expiresAt: Date | null; revision: number }) => Promise<string>) {}

  async activate(input: ActivateInput, ip: string) {
    const uidHash = hmac(input.deviceUid.trim().toUpperCase(), this.uidPepper);
    const keyCode = input.key.trim().toUpperCase();
    const enrollmentHash = hmac(input.enrollmentToken, this.enrollmentSecret);
    let result: { license: { keyCode: string; maxDevices: number; expiresAt: Date | null; deviceCount: number; plan: string; revision: number }; uidHash: string; devicesUsed: number };
    try {
      result = await this.db.$transaction(async tx => {
      const enrollment = await tx.deviceEnrollment.findUnique({ where: { tokenHash: enrollmentHash } });
      if (!enrollment || !enrollment.verifiedAt || enrollment.expiresAt <= new Date() || enrollment.uidHash !== uidHash) {
        throw new LicenseError('UDID_VERIFICATION_REQUIRED', 'Hãy xác thực UDID iPhone trước khi nhập key', 403, { enrollment_url: 'https://udid.tech/' });
      }
      const license = await tx.licenseKey.findUnique({ where: { keyCode } });
      this.assertUsable(license?.status, license?.expiresAt);
      if (!license) throw new LicenseError('KEY_NOT_FOUND', 'Không tìm thấy license key', 404);

      // Same iPhone may use different apps, but only one key inside each Product.
      const existingDevice = await tx.device.findUnique({ where: { productId_uidHash: { productId: license.productId, uidHash } } });
      if (existingDevice) {
        if (existingDevice.keyId !== license.id) {
          throw new LicenseError('DEVICE_ALREADY_BOUND', 'Thiết bị đã được gắn với một key khác', 409, { boundKeyId: existingDevice.keyId });
        }
        if (existingDevice.status === 'revoked') throw new LicenseError('DEVICE_REVOKED', 'Thiết bị đã bị thu hồi', 403);
        await tx.device.update({ where: { id: existingDevice.id }, data: { lastSeenAt: new Date(), ipLast: ip, appVersion: input.appVersion } });
        return { license, uidHash, devicesUsed: license.deviceCount };
      }

      // Atomic conditional increment closes the activation race: only one request can claim the last slot.
      const claimed = await tx.licenseKey.updateMany({ where: { id: license.id, deviceCount: { lt: license.maxDevices }, status: 'active' }, data: { deviceCount: { increment: 1 } } });
      if (claimed.count !== 1) {
        const devices = await tx.device.findMany({ where: { keyId: license.id, status: 'active' }, select: { uidDisplay: true, deviceName: true, platform: true, lastSeenAt: true } });
        throw new LicenseError('DEVICE_LIMIT_REACHED', 'Key đã đạt giới hạn thiết bị', 409, { devices, keyId: license.id });
      }
      await tx.device.create({ data: { keyId: license.id, productId: license.productId, uidHash, uidDisplay: displayUid(input.deviceUid), deviceName: input.deviceName, platform: input.platform, osVersion: input.osVersion, appVersion: input.appVersion, ipFirst: ip, ipLast: ip } });
      await tx.auditLog.create({ data: { action: 'device.activate', keyId: license.id, ip, payload: { platform: input.platform, uidHash } } });
      return { license: { ...license, deviceCount: license.deviceCount + 1 }, uidHash, devicesUsed: license.deviceCount + 1 };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      // Persist the security signal outside the failed transaction so a rejected activation remains visible.
      if (error instanceof LicenseError && error.code === 'DEVICE_ALREADY_BOUND') {
        const boundKeyId = (error.details as { boundKeyId: string }).boundKeyId;
        await this.db.securityAlert.create({ data: { keyId: boundKeyId, severity: 'high', title: 'UDID được thử gắn với key khác', detail: 'Một thiết bị đã được xác thực đang được dùng để kích hoạt key khác.', signals: { attemptedKey: keyCode, ip, uidHash } } });
      }
      if (error instanceof LicenseError && error.code === 'DEVICE_LIMIT_REACHED') {
        const keyId = (error.details as { keyId: string }).keyId;
        await this.db.securityAlert.create({ data: { keyId, severity: 'medium', title: 'Yêu cầu kích hoạt vượt giới hạn thiết bị', detail: 'Có yêu cầu activate mới khi key đã hết slot.', signals: { ip, attemptedUid: displayUid(input.deviceUid) } } });
      }
      throw error;
    }
    const licenseToken = await this.sign({ key: result.license.keyCode, uidHash: result.uidHash, maxDevices: result.license.maxDevices, features: [result.license.plan], expiresAt: result.license.expiresAt, revision: result.license.revision });
    return { ok: true, license_token: licenseToken, expires_at: result.license.expiresAt, devices_used: result.devicesUsed, max_devices: result.license.maxDevices, license_revision: result.license.revision };
  }

  async verify(keyCode: string, deviceUid: string, ip: string) {
    const uidHash = hmac(deviceUid.trim().toUpperCase(), this.uidPepper);
    const key = await this.db.licenseKey.findUnique({ where: { keyCode: keyCode.trim().toUpperCase() } });
    this.assertUsable(key?.status, key?.expiresAt);
    if (!key) throw new LicenseError('KEY_NOT_FOUND', 'Không tìm thấy license key', 404);
    const device = await this.db.device.findUnique({ where: { productId_uidHash: { productId: key.productId, uidHash } } });
    if (!device || device.keyId !== key.id) throw new LicenseError('DEVICE_NOT_ACTIVATED', 'Thiết bị chưa được kích hoạt cho key này', 403);
    if (device.status === 'revoked') throw new LicenseError('DEVICE_REVOKED', 'Thiết bị đã bị thu hồi', 403);
    await this.db.device.update({ where: { id: device.id }, data: { lastSeenAt: new Date(), ipLast: ip } });
    const licenseToken = await this.sign({ key: key.keyCode, uidHash, maxDevices: key.maxDevices, features: [key.plan], expiresAt: key.expiresAt, revision: key.revision });
    return { ok: true, license_token: licenseToken, expires_at: key.expiresAt, devices_used: key.deviceCount, max_devices: key.maxDevices, license_revision: key.revision };
  }

  private assertUsable(status: KeyStatus | undefined, expiresAt: Date | null | undefined) {
    if (!status) return;
    if (status === 'revoked') throw new LicenseError('KEY_REVOKED', 'Key đã bị thu hồi', 403);
    if (status === 'suspended') throw new LicenseError('KEY_SUSPENDED', 'Key đang bị tạm ngưng', 403);
    if (status === 'expired' || (expiresAt && expiresAt <= new Date())) throw new LicenseError('KEY_EXPIRED', 'Key đã hết hạn', 403);
  }
}
