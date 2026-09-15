import crypto from 'crypto';
import QRCode from 'qrcode';
import { Entitlement } from '../../src/types/index.js';

export function generateOpaqueToken(): string {
  return `gk_tok_${crypto.randomBytes(24).toString('hex')}`;
}

export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('QR code generation failed:', err);
    return '';
  }
}

export async function createEntitlement(
  orderId: string,
  providerId: string,
  facetimeHandle: string,
  appBaseUrl: string,
  options?: {
    customExpiresAt?: Date | string;
    durationMinutes?: number;
    isTrial?: boolean;
    serviceName?: string;
  }
): Promise<Entitlement> {
  const token = generateOpaqueToken();
  const createdAt = new Date();
  
  let expiresAt: Date;
  if (options?.customExpiresAt) {
    expiresAt = new Date(options.customExpiresAt);
    if (isNaN(expiresAt.getTime())) {
      // fallback to 7 days for trial or 24 hours standard
      expiresAt = new Date(createdAt.getTime() + (options.isTrial ? 7 * 24 : 24) * 60 * 60 * 1000);
    }
  } else {
    // Default 7 days for free trial pass, 24 hours for standard paid session
    expiresAt = new Date(createdAt.getTime() + (options?.isTrial ? 7 * 24 : 24) * 60 * 60 * 1000);
  }

  const accessUrl = `${appBaseUrl.replace(/\/$/, '')}/#access=${token}`;
  const qrDataUrl = await generateQrDataUrl(accessUrl);

  const facetimeDeliveryInstruction = facetimeHandle.startsWith('http')
    ? `Join Video Call meeting room: ${facetimeHandle}`
    : `Connect directly via Video Call to: ${facetimeHandle}`;

  return {
    token,
    orderId,
    providerId,
    status: 'active', // active and ready for single-use redemption
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    facetimeDeliveryInstruction,
    qrDataUrl,
    durationMinutes: options?.durationMinutes,
    isTrial: options?.isTrial,
    serviceName: options?.serviceName,
  };
}
