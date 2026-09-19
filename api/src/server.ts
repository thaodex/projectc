import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { z } from 'zod';
import { getConfig } from './config.js';
import { fail } from './errors.js';
import { LicenseError, LicenseService } from './license-service.js';
import { createLicenseSigner, hmac, sameSignature } from './security.js';
import { PushService } from './push-service.js';

const deviceBody = z.object({
  key: z.string().min(8).max(96),
  device_uid: z.string().min(8).max(256),
  device_name: z.string().min(1).max(120),
  platform: z.string().min(1).max(40),
  os_version: z.string().max(80).optional(),
  app_version: z.string().max(80).optional(),
});
const publicBody = deviceBody.extend({ enrollment_token: z.string().uuid() });
const enrollmentCompleteBody = z.object({ enrollment_token: z.string().uuid(), udid: z.string().regex(/^[a-fA-F0-9]{40}$/, 'UDID iPhone phải gồm đúng 40 ký tự hexadecimal') });
const loginBody = z.object({ email: z.string().email(), password: z.string().min(8) });
const keyReferenceBody = z.object({ key: z.string().min(8).max(96), device_uid: z.string().min(8).max(256) });
const pushTokenBody = keyReferenceBody.extend({ apns_token: z.string().min(16).max(512) });
const commandAckBody = keyReferenceBody.extend({ command_ids: z.array(z.string()).min(1).max(100) });
const createKeyBody = z.object({
  product_id: z.string().min(1), owner_name: z.string().min(1).max(120), owner_email: z.string().email(),
  max_devices: z.coerce.number().int().min(1).max(1_000), plan: z.string().min(1).max(80),
  expires_at: z.coerce.date().nullable().optional(), note: z.string().max(1_000).optional(), prefix: z.string().regex(/^[A-Z0-9]{2,8}$/).default('LIC'),
});
const createProductBody = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang'),
  bundle_id: z.string().regex(/^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/, 'Bundle ID iOS không hợp lệ').optional(),
  current_version: z.string().min(1).max(40),
  note: z.string().max(1_000).optional(),
});
const updateKeyBody = z.object({
  status: z.enum(['active', 'suspended', 'revoked', 'expired']).optional(),
  expires_at: z.coerce.date().nullable().optional(),
  max_devices: z.coerce.number().int().min(1).max(1_000).optional(),
  note: z.string().max(1_000).nullable().optional(),
});

function xmlEscape(value: string) {
  return value.replace(/[<>&'\"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char);
}

function plistString(xml: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = xml.match(new RegExp(`<key>\\s*${escaped}\\s*</key>\\s*<string>\\s*([^<]+?)\\s*</string>`, 'i'));
  return match?.[1]?.trim();
}

function profileServicePayload(callbackUrl: string, challenge: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>
  <key>PayloadContent</key><dict>
    <key>URL</key><string>${xmlEscape(callbackUrl)}</string>
    <key>Challenge</key><string>${xmlEscape(challenge)}</string>
    <key>DeviceAttributes</key><array><string>UDID</string><string>PRODUCT</string><string>VERSION</string></array>
  </dict>
  <key>PayloadDisplayName</key><string>LicenseVault Device Verification</string>
  <key>PayloadIdentifier</key><string>com.licensevault.udid-verification</string>
  <key>PayloadOrganization</key><string>LicenseVault</string>
  <key>PayloadType</key><string>Profile Service</string>
  <key>PayloadUUID</key><string>${crypto.randomUUID().toUpperCase()}</string>
  <key>PayloadVersion</key><integer>1</integer>
</dict></plist>`;
}

async function main() {
  const config = getConfig();
  const db = new PrismaClient();
  const sign = await createLicenseSigner(config);
  const licenses = new LicenseService(db, config.DEVICE_UID_PEPPER, config.APP_SECRET, sign);
  const push = await PushService.create(config);
  const app = Fastify({ logger: true, trustProxy: true });

  await app.register(helmet);
  await app.register(cors, { origin: config.CORS_ORIGIN, credentials: true });
  await app.register(rateLimit, { global: false });
  await app.register(jwt, { secret: config.ADMIN_JWT_SECRET });
  app.addContentTypeParser(['application/xml', 'text/xml', 'application/x-apple-aspen-config'], { parseAs: 'string' }, (_request, body, done) => done(null, body));
  const cleanupEphemeralRecords = async () => {
    const now = new Date();
    await Promise.all([db.apiNonce.deleteMany({ where: { expiresAt: { lt: now } } }), db.deviceEnrollment.deleteMany({ where: { expiresAt: { lt: now } } })]);
  };
  await cleanupEphemeralRecords();
  const cleanupTimer = setInterval(() => { void cleanupEphemeralRecords().catch(error => app.log.warn({ error }, 'ephemeral cleanup failed')); }, 5 * 60_000);
  cleanupTimer.unref();

  app.get('/health', async () => ({ ok: true, service: 'licensevault-api' }));

  // This is deliberately outside /api/v1: it is the pre-key iPhone enrollment gate.
  // The mobile app starts here, sends the user to the UDID profile guide, then completes with the returned UDID.
  app.post('/api/public/udid-enrollments/start', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async () => {
    const enrollmentToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    await db.deviceEnrollment.create({ data: { tokenHash: hmac(enrollmentToken, config.APP_SECRET), expiresAt } });
    return { ok: true, enrollment_token: enrollmentToken, expires_at: expiresAt, profile_download_url: `${config.PUBLIC_BASE_URL}/api/public/udid-enrollments/${enrollmentToken}/profile.mobileconfig`, status_url: `${config.PUBLIC_BASE_URL}/api/public/udid-enrollments/${enrollmentToken}` };
  });
  app.get('/api/public/udid-enrollments/:token/profile.mobileconfig', async (request, reply) => {
    const token = z.object({ token: z.string().uuid() }).parse(request.params).token;
    const enrollment = await db.deviceEnrollment.findUnique({ where: { tokenHash: hmac(token, config.APP_SECRET) } });
    if (!enrollment || enrollment.expiresAt <= new Date()) return fail(reply, 410, 'ENROLLMENT_EXPIRED', 'Phiên xác thực UDID đã hết hạn');
    reply.header('Content-Type', 'application/x-apple-aspen-config');
    reply.header('Content-Disposition', 'attachment; filename="licensevault-udid.mobileconfig"');
    reply.header('Cache-Control', 'no-store');
    return reply.send(profileServicePayload(`${config.PUBLIC_BASE_URL}/api/public/udid-enrollments/profile-callback`, token));
  });
  app.post('/api/public/udid-enrollments/profile-callback', async (request, reply) => {
    if (typeof request.body !== 'string') return fail(reply, 400, 'PROFILE_PAYLOAD_INVALID', 'Profile Service payload không hợp lệ');
    const challenge = plistString(request.body, 'CHALLENGE');
    const udid = plistString(request.body, 'UDID')?.toUpperCase();
    if (!challenge || !z.string().uuid().safeParse(challenge).success || !udid || !/^[A-F0-9]{40}$/.test(udid)) return fail(reply, 400, 'PROFILE_PAYLOAD_INVALID', 'Không tìm thấy UDID hợp lệ trong profile callback');
    const enrollment = await db.deviceEnrollment.findUnique({ where: { tokenHash: hmac(challenge, config.APP_SECRET) } });
    if (!enrollment || enrollment.expiresAt <= new Date()) return fail(reply, 410, 'ENROLLMENT_EXPIRED', 'Phiên xác thực UDID đã hết hạn');
    await db.deviceEnrollment.update({ where: { id: enrollment.id }, data: { uidHash: hmac(udid, config.DEVICE_UID_PEPPER), uidDisplay: `${udid.slice(0, 4)}…${udid.slice(-4)}`, verifiedAt: new Date(), source: 'licensevault_profile' } });
    return reply.type('text/html').send('<!doctype html><html><body><p>Device verified. You may return to LicenseVault.</p></body></html>');
  });
  app.get('/api/public/udid-enrollments/:token', async (request, reply) => {
    const token = z.object({ token: z.string().uuid() }).parse(request.params).token;
    const enrollment = await db.deviceEnrollment.findUnique({ where: { tokenHash: hmac(token, config.APP_SECRET) }, select: { verifiedAt: true, expiresAt: true } });
    if (!enrollment || enrollment.expiresAt <= new Date()) return fail(reply, 410, 'ENROLLMENT_EXPIRED', 'Phiên xác thực UDID đã hết hạn');
    return { ok: true, udid_verified: Boolean(enrollment.verifiedAt), expires_at: enrollment.expiresAt };
  });
  app.post('/api/public/udid-enrollments/complete', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = enrollmentCompleteBody.safeParse(request.body);
    if (!parsed.success) return fail(reply, 400, 'VALIDATION_ERROR', 'UDID iPhone không hợp lệ', parsed.error.flatten());
    const uid = parsed.data.udid.toUpperCase();
    const enrollment = await db.deviceEnrollment.findUnique({ where: { tokenHash: hmac(parsed.data.enrollment_token, config.APP_SECRET) } });
    if (!enrollment || enrollment.expiresAt <= new Date()) return fail(reply, 410, 'ENROLLMENT_EXPIRED', 'Phiên lấy UDID đã hết hạn; hãy bắt đầu lại');
    await db.deviceEnrollment.update({ where: { id: enrollment.id }, data: { uidHash: hmac(uid, config.DEVICE_UID_PEPPER), uidDisplay: `${uid.slice(0, 4)}…${uid.slice(-4)}`, verifiedAt: new Date() } });
    return { ok: true, udid_verified: true, next: 'activate_key' };
  });

  // Clients sign timestamp + canonical JSON body. Nonces are persisted for five minutes to prevent replay.
  app.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/api/v1/')) return;
    const timestamp = request.headers['x-timestamp'];
    const nonce = request.headers['x-nonce'];
    const signature = request.headers['x-signature'];
    if (typeof timestamp !== 'string' || typeof nonce !== 'string' || typeof signature !== 'string') {
      return fail(reply, 401, 'SIGNATURE_REQUIRED', 'Thiếu chữ ký request');
    }
    const timestampMs = Number(timestamp);
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60_000) {
      return fail(reply, 401, 'TIMESTAMP_INVALID', 'Timestamp không hợp lệ hoặc đã quá 5 phút');
    }
    const body = JSON.stringify(request.body ?? {});
    if (!sameSignature(signature, hmac(`${timestamp}.${nonce}.${body}`, config.APP_SECRET))) {
      return fail(reply, 401, 'SIGNATURE_INVALID', 'Chữ ký request không hợp lệ');
    }
    try {
      await db.apiNonce.create({ data: { value: nonce, expiresAt: new Date(Date.now() + 5 * 60_000) } });
    } catch {
      return fail(reply, 409, 'REPLAY_DETECTED', 'Nonce đã được sử dụng');
    }
  });

  app.post('/api/v1/activate', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = publicBody.safeParse(request.body);
    if (!parsed.success) return fail(reply, 400, 'VALIDATION_ERROR', 'Dữ liệu activate không hợp lệ', parsed.error.flatten());
    try {
      return await licenses.activate({ key: parsed.data.key, deviceUid: parsed.data.device_uid, deviceName: parsed.data.device_name, platform: parsed.data.platform, enrollmentToken: parsed.data.enrollment_token, osVersion: parsed.data.os_version, appVersion: parsed.data.app_version }, request.ip);
    } catch (error) {
      if (error instanceof LicenseError) return fail(reply, error.status, error.code, error.message, error.details);
      throw error;
    }
  });

  app.post('/api/v1/verify', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = deviceBody.safeParse(request.body);
    if (!parsed.success) return fail(reply, 400, 'VALIDATION_ERROR', 'Dữ liệu verify không hợp lệ', parsed.error.flatten());
    try {
      return await licenses.verify(parsed.data.key, parsed.data.device_uid, request.ip);
    } catch (error) {
      if (error instanceof LicenseError) return fail(reply, error.status, error.code, error.message, error.details);
      throw error;
    }
  });
  app.post('/api/v1/heartbeat', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = deviceBody.safeParse(request.body);
    if (!parsed.success) return fail(reply, 400, 'VALIDATION_ERROR', 'Dữ liệu heartbeat không hợp lệ', parsed.error.flatten());
    try { return await licenses.verify(parsed.data.key, parsed.data.device_uid, request.ip); }
    catch (error) { if (error instanceof LicenseError) return fail(reply, error.status, error.code, error.message, error.details); throw error; }
  });
  app.post('/api/v1/deactivate', async (request, reply) => {
    const parsed = keyReferenceBody.safeParse(request.body);
    if (!parsed.success) return fail(reply, 400, 'VALIDATION_ERROR', 'Dữ liệu deactivate không hợp lệ', parsed.error.flatten());
    const uidHash = hmac(parsed.data.device_uid.trim().toUpperCase(), config.DEVICE_UID_PEPPER);
    const key = await db.licenseKey.findUnique({ where: { keyCode: parsed.data.key.trim().toUpperCase() } });
    if (!key) return fail(reply, 404, 'KEY_NOT_FOUND', 'Không tìm thấy license key');
    const device = await db.device.findUnique({ where: { productId_uidHash: { productId: key.productId, uidHash } } });
    if (!device || device.keyId !== key.id) return fail(reply, 403, 'DEVICE_NOT_ACTIVATED', 'Thiết bị chưa được kích hoạt cho key này');
    await db.$transaction([db.device.delete({ where: { id: device.id } }), db.licenseKey.update({ where: { id: key.id }, data: { deviceCount: { decrement: 1 } } }), db.auditLog.create({ data: { action: 'device.deactivate', keyId: key.id, ip: request.ip, payload: { uidHash } } })]);
    return { ok: true };
  });
  app.post('/api/v1/push-token', async (request, reply) => {
    const parsed = pushTokenBody.safeParse(request.body);
    if (!parsed.success) return fail(reply, 400, 'VALIDATION_ERROR', 'APNs token không hợp lệ', parsed.error.flatten());
    try {
      await licenses.verify(parsed.data.key, parsed.data.device_uid, request.ip);
      const uidHash = hmac(parsed.data.device_uid.trim().toUpperCase(), config.DEVICE_UID_PEPPER);
      const key = await db.licenseKey.findUnique({ where: { keyCode: parsed.data.key.trim().toUpperCase() }, select: { productId: true } });
      if (!key) return fail(reply, 404, 'KEY_NOT_FOUND', 'Không tìm thấy license key');
      await db.device.update({ where: { productId_uidHash: { productId: key.productId, uidHash } }, data: { apnsToken: parsed.data.apns_token, apnsUpdatedAt: new Date() } });
      return { ok: true, push_enabled: push.enabled };
    } catch (error) { if (error instanceof LicenseError) return fail(reply, error.status, error.code, error.message, error.details); throw error; }
  });
  app.post('/api/v1/sync', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = keyReferenceBody.safeParse(request.body);
    if (!parsed.success) return fail(reply, 400, 'VALIDATION_ERROR', 'Dữ liệu sync không hợp lệ', parsed.error.flatten());
    try {
      const license = await licenses.verify(parsed.data.key, parsed.data.device_uid, request.ip);
      const uidHash = hmac(parsed.data.device_uid.trim().toUpperCase(), config.DEVICE_UID_PEPPER);
      const key = await db.licenseKey.findUnique({ where: { keyCode: parsed.data.key.trim().toUpperCase() }, select: { productId: true } });
      const device = key ? await db.device.findUnique({ where: { productId_uidHash: { productId: key.productId, uidHash } }, select: { id: true } }) : null;
      const commands = device ? await db.deviceCommand.findMany({ where: { deviceId: device.id, acknowledgedAt: null }, orderBy: { createdAt: 'asc' }, take: 100 }) : [];
      return { ...license, poll_after_seconds: config.CLIENT_POLL_SECONDS, commands };
    } catch (error) { if (error instanceof LicenseError) return fail(reply, error.status, error.code, error.message, error.details); throw error; }
  });
  app.post('/api/v1/commands/ack', async (request, reply) => {
    const parsed = commandAckBody.safeParse(request.body);
    if (!parsed.success) return fail(reply, 400, 'VALIDATION_ERROR', 'Dữ liệu acknowledge không hợp lệ', parsed.error.flatten());
    try {
      await licenses.verify(parsed.data.key, parsed.data.device_uid, request.ip);
      const uidHash = hmac(parsed.data.device_uid.trim().toUpperCase(), config.DEVICE_UID_PEPPER);
      const key = await db.licenseKey.findUnique({ where: { keyCode: parsed.data.key.trim().toUpperCase() }, select: { productId: true } });
      const device = key ? await db.device.findUnique({ where: { productId_uidHash: { productId: key.productId, uidHash } }, select: { id: true } }) : null;
      if (!device) return fail(reply, 403, 'DEVICE_NOT_ACTIVATED', 'Thiết bị chưa được kích hoạt');
      await db.deviceCommand.updateMany({ where: { id: { in: parsed.data.command_ids }, deviceId: device.id }, data: { acknowledgedAt: new Date() } });
      return { ok: true };
    } catch (error) { if (error instanceof LicenseError) return fail(reply, error.status, error.code, error.message, error.details); throw error; }
  });

  app.post('/api/admin/auth/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    // Brute-force protection for the only password-bearing endpoint.
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) return fail(reply, 400, 'VALIDATION_ERROR', 'Email hoặc mật khẩu không hợp lệ');
    const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user || !(await argon2.verify(user.passwordHash, parsed.data.password))) return fail(reply, 401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
    const token = await reply.jwtSign({ sub: user.id, role: user.role, email: user.email }, { expiresIn: '15m' });
    return { ok: true, access_token: token, user: { id: user.id, email: user.email, role: user.role } };
  });

  app.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/api/admin/') || request.url === '/api/admin/auth/login') return;
    try {
      await request.jwtVerify();
      const role = (request.user as { role?: string }).role;
      if (request.method !== 'GET' && role !== 'owner' && role !== 'admin') return fail(reply, 403, 'FORBIDDEN', 'Tài khoản không có quyền thay đổi dữ liệu');
    }
    catch { return fail(reply, 401, 'UNAUTHORIZED', 'Yêu cầu đăng nhập quản trị'); }
  });

  app.get('/api/admin/keys', async (request) => {
    const query = z.object({ search: z.string().optional(), status: z.enum(['active', 'suspended', 'revoked', 'expired']).optional(), page: z.coerce.number().min(1).default(1), limit: z.coerce.number().min(1).max(100).default(25) }).parse(request.query);
    const where = { ...(query.status ? { status: query.status } : {}), ...(query.search ? { OR: [{ keyCode: { contains: query.search, mode: 'insensitive' as const } }, { ownerEmail: { contains: query.search, mode: 'insensitive' as const } }, { ownerName: { contains: query.search, mode: 'insensitive' as const } }] } : {}) };
    const [items, total] = await db.$transaction([db.licenseKey.findMany({ where, include: { product: true, _count: { select: { devices: true } } }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }), db.licenseKey.count({ where })]);
    return { ok: true, items, total, page: query.page, limit: query.limit };
  });

  app.get('/api/admin/products', async () => {
    const items = await db.product.findMany({ include: { _count: { select: { licenseKeys: true, devices: true } } }, orderBy: { createdAt: 'desc' } });
    return { ok: true, items };
  });

  app.post('/api/admin/products', async (request, reply) => {
    const parsed = createProductBody.safeParse(request.body);
    if (!parsed.success) return fail(reply, 400, 'VALIDATION_ERROR', 'Dữ liệu Project không hợp lệ', parsed.error.flatten());
    try {
      const product = await db.product.create({ data: { name: parsed.data.name, slug: parsed.data.slug, bundleId: parsed.data.bundle_id, currentVersion: parsed.data.current_version, note: parsed.data.note } });
      await db.auditLog.create({ data: { action: 'product.create', ip: request.ip, payload: { productId: product.id, slug: product.slug, bundleId: product.bundleId } } });
      return reply.code(201).send({ ok: true, item: product });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'P2002') return fail(reply, 409, 'PRODUCT_EXISTS', 'Slug hoặc Bundle ID này đã tồn tại');
      throw error;
    }
  });

  app.post('/api/admin/keys', async (request, reply) => {
    const parsed = createKeyBody.safeParse(request.body);
    if (!parsed.success) return fail(reply, 400, 'VALIDATION_ERROR', 'Dữ liệu key không hợp lệ', parsed.error.flatten());
    const product = await db.product.findUnique({ where: { id: parsed.data.product_id } });
    if (!product) return fail(reply, 404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy product');
    const keyCode = `${parsed.data.prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase().match(/.{1,4}/g)?.join('-')}`;
    const key = await db.licenseKey.create({ data: { keyCode, productId: product.id, ownerName: parsed.data.owner_name, ownerEmail: parsed.data.owner_email.toLowerCase(), maxDevices: parsed.data.max_devices, plan: parsed.data.plan, expiresAt: parsed.data.expires_at ?? null, note: parsed.data.note } });
    await db.auditLog.create({ data: { action: 'key.create', keyId: key.id, ip: request.ip } });
    return reply.code(201).send({ ok: true, item: key });
  });

  app.patch('/api/admin/keys/:id', async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const parsed = updateKeyBody.safeParse(request.body);
    if (!parsed.success) return fail(reply, 400, 'VALIDATION_ERROR', 'Dữ liệu cập nhật key không hợp lệ', parsed.error.flatten());
    const result = await db.$transaction(async tx => {
      const current = await tx.licenseKey.findUnique({ where: { id: params.id }, include: { devices: { where: { status: 'active' }, select: { id: true, apnsToken: true } } } });
      if (!current) return null;
      if (parsed.data.max_devices !== undefined && parsed.data.max_devices < current.deviceCount) return { invalidLimit: true as const, deviceCount: current.deviceCount };
      const updated = await tx.licenseKey.update({ where: { id: current.id }, data: {
        ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
        ...(parsed.data.expires_at === undefined ? {} : { expiresAt: parsed.data.expires_at }),
        ...(parsed.data.max_devices === undefined ? {} : { maxDevices: parsed.data.max_devices }),
        ...(parsed.data.note === undefined ? {} : { note: parsed.data.note }),
        revision: { increment: 1 },
      } });
      await tx.deviceCommand.createMany({ data: current.devices.map(device => ({ keyId: current.id, deviceId: device.id, revision: updated.revision, type: 'license_changed', payload: { status: updated.status, expiresAt: updated.expiresAt } })) });
      await tx.auditLog.create({ data: { action: 'key.update', keyId: current.id, ip: request.ip, payload: parsed.data } });
      return { invalidLimit: false as const, updated, tokens: current.devices.flatMap(device => device.apnsToken ? [device.apnsToken] : []) };
    });
    if (!result) return fail(reply, 404, 'KEY_NOT_FOUND', 'Không tìm thấy license key');
    if (result.invalidLimit) return fail(reply, 409, 'DEVICE_LIMIT_CONFLICT', 'Không thể đặt giới hạn thấp hơn số thiết bị đang active', { devices_used: result.deviceCount });
    try { await push.notifyLicenseChanged(result.tokens, result.updated.revision); }
    catch (error) { app.log.warn({ error, keyId: result.updated.id }, 'APNs delivery failed; client will sync on its next poll'); }
    return { ok: true, item: result.updated, push_queued: result.tokens.length, revision: result.updated.revision };
  });

  app.post('/api/admin/keys/:id/devices/:deviceId/revoke', async (request, reply) => {
    const params = z.object({ id: z.string(), deviceId: z.string() }).parse(request.params);
    const changed = await db.$transaction(async tx => {
      const device = await tx.device.findFirst({ where: { id: params.deviceId, keyId: params.id } });
      if (!device) return null;
      if (device.status === 'revoked') return device;
      await tx.device.update({ where: { id: device.id }, data: { status: 'revoked' } });
      await tx.licenseKey.update({ where: { id: params.id }, data: { deviceCount: { decrement: 1 } } });
      await tx.auditLog.create({ data: { action: 'device.revoke', keyId: params.id, deviceId: device.id, ip: request.ip } });
      return device;
    });
    if (!changed) return fail(reply, 404, 'DEVICE_NOT_FOUND', 'Không tìm thấy thiết bị');
    return { ok: true };
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    return fail(reply, 500, 'INTERNAL_ERROR', 'Lỗi hệ thống');
  });
  app.addHook('onClose', async () => { clearInterval(cleanupTimer); await push.close(); await db.$disconnect(); });
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
}

main().catch(error => { console.error(error); process.exit(1); });
