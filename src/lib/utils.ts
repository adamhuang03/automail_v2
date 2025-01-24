import { ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import crypto from "crypto";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Encryption and decryption key (must be 32 bytes for AES-256)
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'base64'); // Replace with a secure, saved key
const IV_LENGTH = 16; // AES block size

/**
 * Encrypts a plain text string.
 * @param text - The text to encrypt.
 * @returns The encrypted data in base64 format.
 */
export function encryptedText(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  console.log("IV:", iv.toString("base64"));
  console.log("Encrypted:", encrypted);
  return iv.toString("base64") + ":" + encrypted;
}

/**
 * Decrypts an encrypted string.
 * @param encryptedData - The encrypted data in base64 format.
 * @returns The decrypted plain text.
 */
export function decryptedText(encryptedData: string): string {
  const [ivBase64, encryptedText] = encryptedData.split(":");
  if (!ivBase64 || !encryptedText) {
    throw new Error("Invalid encrypted data format.");
  }

  const iv = Buffer.from(ivBase64, "base64");
  const encryptedBuffer = Buffer.from(encryptedText, "base64");
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedBuffer, undefined, "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}