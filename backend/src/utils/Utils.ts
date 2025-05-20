import { execSync } from 'child_process';
import crypto from 'crypto';
import { RGBColor } from './ProtoColors';

export function sleep(milliseconds: number) {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
}

export function encodeRGBObject(color: RGBColor): number {
  return encodeRGB(color.r, color.g, color.b);
}

export function encodeRGB(r: number, g: number, b: number): number {
  // Ensure the values are within the 0-255 range
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  // Combine RGB into a single number (0xRRGGBB format)
  return (r << 16) | (g << 8) | b;
}

export function decodeRGB(value: number): RGBColor {
  // Extract the RGB values from the number
  const r = (value >> 16) & 0xFF;
  const g = (value >> 8) & 0xFF;
  const b = value & 0xFF;

  return { r, g, b };
}

export function compareStringArrays(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
}

export function typeAssert<T>(input: any): T {
  return input as T;
}

export function generateSecretKey(keyLength: number = 64) {
  return crypto.randomBytes(keyLength).toString('hex');
}

/**
 * Function to check the expiration date of the certificate
 */
export function getCertificateExpiry(certFile: string): Date {
  // Extract the expiry date using OpenSSL
  const expiryStr = execSync(`openssl x509 -enddate -noout -in ${certFile}`)
    .toString()
    .trim();

  const match = expiryStr.match(/notAfter=(.*)/);
  if (!match || match.length == 0) {
    throw new Error("Could not parse certificate expiry date.");
  }

  return new Date(match[1]);
}

/**
 * Function to generate a new certificate and private key
 * @param privateKeyPath Path to the private key file
 * @param publicKeyPath Path to generateNewCertificatethe public certificate file
 * @param validDays Number of days the certificate is valid
 */
export function generateNewCertificate(privateKeyPath: string, publicKeyPath: string, validDays: number) {
  console.log(`Generating a new certificate (Valid for ${validDays} days)...`);
  console.log(`Private Key: ${privateKeyPath}`);
  console.log(`Public Certificate: ${publicKeyPath}`);

  // Generate a new private key WITHOUT password protection
  execSync(`openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out ${privateKeyPath}`);

  // Generate a new self-signed certificate
  execSync(
    `openssl req -x509 -new -key ${privateKeyPath} -out ${publicKeyPath} -days ${validDays} -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:192.168.1.67"`
  );
}
