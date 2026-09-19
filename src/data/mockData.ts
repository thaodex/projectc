export type KeyStatus = 'active' | 'suspended' | 'revoked' | 'expired';
export type DeviceStatus = 'active' | 'revoked';

export interface Product {
  id: string;
  name: string;
  slug: string;
  version: string;
  bundleId?: string;
}

export interface Device {
  id: string;
  keyId: string;
  deviceUid: string;
  uidDisplay: string;
  deviceName: string;
  os: string;
  osVersion: string;
  appVersion: string;
  ip: string;
  country: string;
  status: DeviceStatus;
  activatedAt: string;
  lastSeenAt: string;
}

export interface LicenseKey {
  id: string;
  keyCode: string;
  productId: string;
  productName: string;
  ownerName: string;
  ownerEmail: string;
  maxDevices: number;
  devicesUsed: number;
  status: KeyStatus;
  plan: string;
  expiresAt: string | null;
  note: string;
  createdAt: string;
  lastSeenAt: string;
  devices: Device[];
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  keyId: string;
  keyCode: string;
  deviceUid: string;
  ip: string;
  createdAt: string;
}

export type ThreatSeverity = 'critical' | 'high' | 'medium';

export interface SecurityAlert {
  id: string;
  keyId: string;
  keyCode: string;
  ownerName: string;
  severity: ThreatSeverity;
  title: string;
  detail: string;
  signals: string[];
  createdAt: string;
  status: 'open' | 'investigating' | 'resolved';
}

export const PRODUCTS: Product[] = [
  { id: 'p1', name: 'ProSuite Enterprise', slug: 'prosuite-enterprise', version: '4.2.1', bundleId: 'com.licensevault.prosuite' },
  { id: 'p2', name: 'DataVault Pro', slug: 'datavault-pro', version: '2.8.0', bundleId: 'com.licensevault.datavault' },
  { id: 'p3', name: 'FlowBuilder SDK', slug: 'flowbuilder-sdk', version: '1.5.3', bundleId: 'com.licensevault.flowbuilder' },
];

const now = new Date('2026-09-19T10:00:00Z');
function daysAgo(n: number) {
  return new Date(now.getTime() - n * 86400000).toISOString();
}
function daysFromNow(n: number) {
  return new Date(now.getTime() + n * 86400000).toISOString();
}

export const LICENSE_KEYS: LicenseKey[] = [
  {
    id: 'k1',
    keyCode: 'PSE-A3F2-K9M7-XTQR-8WB4',
    productId: 'p1',
    productName: 'ProSuite Enterprise',
    ownerName: 'Nguyễn Văn An',
    ownerEmail: 'an.nguyen@techcorp.vn',
    maxDevices: 5,
    devicesUsed: 3,
    status: 'active',
    plan: 'Enterprise',
    expiresAt: daysFromNow(42),
    note: 'Khách VIP, gia hạn tự động',
    createdAt: daysAgo(180),
    lastSeenAt: daysAgo(0),
    devices: [
      { id: 'd1', keyId: 'k1', deviceUid: 'A1B2C3D4E5F6G7H8', uidDisplay: 'A1B2…7H8', deviceName: 'DESKTOP-ANTV', os: 'Windows', osVersion: '11 23H2', appVersion: '4.2.1', ip: '192.168.1.45', country: 'VN', status: 'active', activatedAt: daysAgo(180), lastSeenAt: daysAgo(0) },
      { id: 'd2', keyId: 'k1', deviceUid: 'B2C3D4E5F6G7H8I9', uidDisplay: 'B2C3…H8I9', deviceName: 'MacBook-Pro-An', os: 'macOS', osVersion: '14.5', appVersion: '4.2.1', ip: '10.0.0.12', country: 'VN', status: 'active', activatedAt: daysAgo(90), lastSeenAt: daysAgo(1) },
      { id: 'd3', keyId: 'k1', deviceUid: 'C3D4E5F6G7H8I9J0', uidDisplay: 'C3D4…I9J0', deviceName: 'LAPTOP-WORK', os: 'Windows', osVersion: '10 22H2', appVersion: '4.1.0', ip: '172.16.0.8', country: 'VN', status: 'active', activatedAt: daysAgo(30), lastSeenAt: daysAgo(2) },
    ],
  },
  {
    id: 'k2',
    keyCode: 'PSE-H7T4-N2YK-DQWM-5PX9',
    productId: 'p1',
    productName: 'ProSuite Enterprise',
    ownerName: 'Trần Thị Bích',
    ownerEmail: 'bich.tran@startup.io',
    maxDevices: 2,
    devicesUsed: 2,
    status: 'active',
    plan: 'Professional',
    expiresAt: daysFromNow(5),
    note: '',
    createdAt: daysAgo(365),
    lastSeenAt: daysAgo(0),
    devices: [
      { id: 'd4', keyId: 'k2', deviceUid: 'D4E5F6G7H8I9J0K1', uidDisplay: 'D4E5…J0K1', deviceName: 'BICH-LAPTOP', os: 'macOS', osVersion: '13.6', appVersion: '4.2.1', ip: '203.162.12.45', country: 'VN', status: 'active', activatedAt: daysAgo(365), lastSeenAt: daysAgo(0) },
      { id: 'd5', keyId: 'k2', deviceUid: 'E5F6G7H8I9J0K1L2', uidDisplay: 'E5F6…K1L2', deviceName: 'OFFICE-DESKTOP', os: 'Windows', osVersion: '11 22H2', appVersion: '4.2.0', ip: '203.162.12.50', country: 'VN', status: 'active', activatedAt: daysAgo(200), lastSeenAt: daysAgo(1) },
    ],
  },
  {
    id: 'k3',
    keyCode: 'DVP-R6Z1-W4BJ-MTQS-9CY7',
    productId: 'p2',
    productName: 'DataVault Pro',
    ownerName: 'Lê Minh Quân',
    ownerEmail: 'quan.le@finance.com',
    maxDevices: 1,
    devicesUsed: 1,
    status: 'active',
    plan: 'Starter',
    expiresAt: daysFromNow(120),
    note: 'Trial extended',
    createdAt: daysAgo(45),
    lastSeenAt: daysAgo(3),
    devices: [
      { id: 'd6', keyId: 'k3', deviceUid: 'F6G7H8I9J0K1L2M3', uidDisplay: 'F6G7…L2M3', deviceName: 'QUAN-DESKTOP', os: 'Windows', osVersion: '11 23H2', appVersion: '2.8.0', ip: '118.71.0.25', country: 'VN', status: 'active', activatedAt: daysAgo(45), lastSeenAt: daysAgo(3) },
    ],
  },
  {
    id: 'k4',
    keyCode: 'FBS-C2P8-V5NX-RKTY-3AQ6',
    productId: 'p3',
    productName: 'FlowBuilder SDK',
    ownerName: 'Phạm Hồng Giang',
    ownerEmail: 'giang@devstudio.net',
    maxDevices: 3,
    devicesUsed: 0,
    status: 'suspended',
    plan: 'Professional',
    expiresAt: daysFromNow(180),
    note: 'Tạm ngưng do thanh toán thất bại',
    createdAt: daysAgo(60),
    lastSeenAt: daysAgo(15),
    devices: [],
  },
  {
    id: 'k5',
    keyCode: 'PSE-J9D3-F7KW-BXNM-4TZ2',
    productId: 'p1',
    productName: 'ProSuite Enterprise',
    ownerName: 'Hoàng Anh Tuấn',
    ownerEmail: 'tuan@enterprise.vn',
    maxDevices: 10,
    devicesUsed: 7,
    status: 'active',
    plan: 'Enterprise',
    expiresAt: daysFromNow(300),
    note: 'Công ty lớn, 10 dev team',
    createdAt: daysAgo(90),
    lastSeenAt: daysAgo(0),
    devices: [
      { id: 'd7', keyId: 'k5', deviceUid: 'G7H8I9J0K1L2M3N4', uidDisplay: 'G7H8…M3N4', deviceName: 'DEV-WORKSTATION-1', os: 'Linux', osVersion: 'Ubuntu 22.04', appVersion: '4.2.1', ip: '10.10.1.1', country: 'VN', status: 'active', activatedAt: daysAgo(90), lastSeenAt: daysAgo(0) },
      { id: 'd8', keyId: 'k5', deviceUid: 'H8I9J0K1L2M3N4O5', uidDisplay: 'H8I9…N4O5', deviceName: 'DEV-WORKSTATION-2', os: 'macOS', osVersion: '14.5', appVersion: '4.2.1', ip: '10.10.1.2', country: 'VN', status: 'active', activatedAt: daysAgo(85), lastSeenAt: daysAgo(0) },
    ],
  },
  {
    id: 'k6',
    keyCode: 'DVP-M4X9-S2CQ-WFGB-7KR1',
    productId: 'p2',
    productName: 'DataVault Pro',
    ownerName: 'Vũ Thị Lan',
    ownerEmail: 'lan.vu@bank.com.vn',
    maxDevices: 5,
    devicesUsed: 1,
    status: 'revoked',
    plan: 'Professional',
    expiresAt: null,
    note: 'Thu hồi do vi phạm điều khoản',
    createdAt: daysAgo(200),
    lastSeenAt: daysAgo(60),
    devices: [],
  },
  {
    id: 'k7',
    keyCode: 'PSE-K1Y6-G8NV-ZCMD-2WP5',
    productId: 'p1',
    productName: 'ProSuite Enterprise',
    ownerName: 'Đinh Bảo Long',
    ownerEmail: 'long.dinh@media.co',
    maxDevices: 2,
    devicesUsed: 1,
    status: 'expired',
    plan: 'Starter',
    expiresAt: daysAgo(10),
    note: '',
    createdAt: daysAgo(375),
    lastSeenAt: daysAgo(10),
    devices: [
      { id: 'd9', keyId: 'k7', deviceUid: 'I9J0K1L2M3N4O5P6', uidDisplay: 'I9J0…O5P6', deviceName: 'LONG-MACBOOK', os: 'macOS', osVersion: '13.6', appVersion: '4.1.0', ip: '27.72.15.88', country: 'VN', status: 'revoked', activatedAt: daysAgo(375), lastSeenAt: daysAgo(10) },
    ],
  },
  {
    id: 'k8',
    keyCode: 'FBS-T7W2-Q4MK-XJNB-9GY3',
    productId: 'p3',
    productName: 'FlowBuilder SDK',
    ownerName: 'Ngô Đức Việt',
    ownerEmail: 'viet@freelance.dev',
    maxDevices: 1,
    devicesUsed: 1,
    status: 'active',
    plan: 'Starter',
    expiresAt: daysFromNow(6),
    note: 'Freelancer, gia hạn ngắn hạn',
    createdAt: daysAgo(30),
    lastSeenAt: daysAgo(0),
    devices: [
      { id: 'd10', keyId: 'k8', deviceUid: 'J0K1L2M3N4O5P6Q7', uidDisplay: 'J0K1…P6Q7', deviceName: 'VIET-DESKTOP', os: 'Linux', osVersion: 'Arch Linux', appVersion: '1.5.3', ip: '42.116.8.99', country: 'VN', status: 'active', activatedAt: daysAgo(30), lastSeenAt: daysAgo(0) },
    ],
  },
];

// Generate 30-day activation chart data
export const ACTIVATION_CHART_DATA = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(now.getTime() - (29 - i) * 86400000);
  const label = `${d.getMonth() + 1}/${d.getDate()}`;
  return {
    date: label,
    activations: Math.floor(Math.random() * 15) + 2,
    verifications: Math.floor(Math.random() * 80) + 20,
  };
});

export const AUDIT_LOGS: AuditLog[] = [
  { id: 'al1', actor: 'admin@system', action: 'key.revoke', keyId: 'k6', keyCode: 'DVP-M4X9-S2CQ-WFGB-7KR1', deviceUid: '', ip: '10.0.0.1', createdAt: daysAgo(60) },
  { id: 'al2', actor: 'system', action: 'device.activate', keyId: 'k8', keyCode: 'FBS-T7W2-Q4MK-XJNB-9GY3', deviceUid: 'J0K1…P6Q7', ip: '42.116.8.99', createdAt: daysAgo(30) },
  { id: 'al3', actor: 'admin@system', action: 'key.suspend', keyId: 'k4', keyCode: 'FBS-C2P8-V5NX-RKTY-3AQ6', deviceUid: '', ip: '10.0.0.1', createdAt: daysAgo(15) },
  { id: 'al4', actor: 'system', action: 'device.activate', keyId: 'k3', keyCode: 'DVP-R6Z1-W4BJ-MTQS-9CY7', deviceUid: 'F6G7…L2M3', ip: '118.71.0.25', createdAt: daysAgo(45) },
  { id: 'al5', actor: 'system', action: 'key.expired', keyId: 'k7', keyCode: 'PSE-K1Y6-G8NV-ZCMD-2WP5', deviceUid: '', ip: '', createdAt: daysAgo(10) },
  { id: 'al6', actor: 'system', action: 'device.verify', keyId: 'k1', keyCode: 'PSE-A3F2-K9M7-XTQR-8WB4', deviceUid: 'A1B2…7H8', ip: '192.168.1.45', createdAt: daysAgo(0) },
  { id: 'al7', actor: 'admin@system', action: 'key.create', keyId: 'k5', keyCode: 'PSE-J9D3-F7KW-BXNM-4TZ2', deviceUid: '', ip: '10.0.0.1', createdAt: daysAgo(90) },
  { id: 'al8', actor: 'system', action: 'device.activate', keyId: 'k5', keyCode: 'PSE-J9D3-F7KW-BXNM-4TZ2', deviceUid: 'G7H8…M3N4', ip: '10.10.1.1', createdAt: daysAgo(90) },
];

// Dữ liệu mô phỏng từ bộ phát hiện bất thường phía server. Khi nối API,
// danh sách này sẽ được thay bằng các sự kiện được tính từ IP/quốc gia/UID thực tế.
export const SECURITY_ALERTS: SecurityAlert[] = [
  {
    id: 'sa1', keyId: 'k5', keyCode: 'PSE-J9D3-F7KW-BXNM-4TZ2', ownerName: 'Hoàng Anh Tuấn',
    severity: 'critical', title: 'Nghi ngờ key bị chia sẻ/crack',
    detail: 'Có 14 địa chỉ IP và 5 quốc gia xác thực trong 24 giờ — vượt ngưỡng 3 quốc gia.',
    signals: ['14 IP / 24h', '5 quốc gia', 'UID mới liên tục'], createdAt: daysAgo(0), status: 'open',
  },
  {
    id: 'sa2', keyId: 'k2', keyCode: 'PSE-H7T4-N2YK-DQWM-5PX9', ownerName: 'Trần Thị Bích',
    severity: 'high', title: 'Vượt giới hạn thiết bị nhiều lần',
    detail: '7 yêu cầu activate bị từ chối do hết slot trong 30 phút.',
    signals: ['7 lần từ chối', '3 UID khác nhau'], createdAt: daysAgo(0), status: 'investigating',
  },
  {
    id: 'sa3', keyId: 'k8', keyCode: 'FBS-T7W2-Q4MK-XJNB-9GY3', ownerName: 'Ngô Đức Việt',
    severity: 'medium', title: 'Nhịp heartbeat bất thường',
    detail: 'Client gửi verify dày đặc hơn 12 lần so với cấu hình bình thường.',
    signals: ['Rate spike', '412 verify / giờ'], createdAt: daysAgo(1), status: 'open',
  },
];

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
}

export function daysUntil(iso: string | null): string {
  if (!iso) return 'Lifetime';
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.floor(diff / 86400000);
  if (days < 0) return `Hết hạn ${Math.abs(days)} ngày trước`;
  if (days === 0) return 'Hôm nay';
  if (days <= 7) return `còn ${days} ngày`;
  if (days <= 30) return `còn ${days} ngày`;
  return new Date(iso).toLocaleDateString('vi-VN');
}
