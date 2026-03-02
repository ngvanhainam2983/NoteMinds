import CryptoJS from 'crypto-js';

/**
 * ⚠️ SECURITY WARNING: Client-side encryption provides limited security
 * 
 * This implementation encrypts data in the browser before sending to server.
 * However, the encryption key must be embedded in the JavaScript bundle,
 * which means it can be extracted by anyone who downloads your app.
 * 
 * RECOMMENDED APPROACH:
 * - Remove client-side encryption entirely
 * - Rely on HTTPS/TLS for transport encryption
 * - Store all data encrypted server-side with keys in secure environment
 * 
 * CURRENT APPROACH (not recommended for sensitive data):
 * - Client encrypts with shared key before sending
 * - Server decrypts with same key
 * - Key is embedded in frontend code (visible to all users)
 */

// Must match server ENCRYPTION_KEY exactly.
// In production, key is required via VITE_ENCRYPTION_KEY.
const ENV_ENCRYPTION_KEY =
  import.meta.env.VITE_ENCRYPTION_KEY ||
  import.meta.env.REACT_APP_ENCRYPTION_KEY;

const RAW_ENCRYPTION_KEY =
  ENV_ENCRYPTION_KEY ||
  (import.meta.env.DEV ? 'notemind-default-encryption-key-2024-secure' : null);

if (!RAW_ENCRYPTION_KEY) {
  throw new Error('Missing VITE_ENCRYPTION_KEY. Set client/.env before building production assets.');
}

function getCryptoKey(rawKey) {
  if (typeof rawKey === 'string' && rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return CryptoJS.enc.Hex.parse(rawKey);
  }

  return CryptoJS.SHA256(rawKey);
}

const ENCRYPTION_KEY = getCryptoKey(RAW_ENCRYPTION_KEY);

/**
 * Encrypt data for sending to server
 * @param {object} data - Data to encrypt
 * @returns {object} - { iv, encrypted }
 */
export function encryptDataForServer(data) {
  // Generate a random IV (16 bytes for AES)
  const iv = CryptoJS.lib.WordArray.random(16);
  const jsonData = JSON.stringify(data);
  
  // Encrypt using AES-256-CBC
  const encrypted = CryptoJS.AES.encrypt(jsonData, ENCRYPTION_KEY, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  // Extract the raw ciphertext as hex (without salt)
  // CryptoJS produces encrypted.ciphertext which is a WordArray
  // We need to convert it to hex string for the server
  const ciphertextHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  
  return {
    iv: iv.toString(CryptoJS.enc.Hex),
    encrypted: ciphertextHex
  };
}

/**
 * Decrypt data received from server
 * @param {object} encryptedData - { iv, encrypted }
 * @returns {object} - Decrypted data object
 */
export function decryptDataFromServer(encryptedData) {
  try {
    const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
    const ciphertext = CryptoJS.enc.Hex.parse(encryptedData.encrypted);
    const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });
    
    const decrypted = CryptoJS.AES.decrypt(cipherParams, ENCRYPTION_KEY, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('Decryption resulted in empty string');
    }
    
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt response: ' + error.message);
  }
}

export default {
  encryptDataForServer,
  decryptDataFromServer
};
