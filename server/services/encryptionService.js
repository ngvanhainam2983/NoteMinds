import crypto from 'crypto';
import CryptoJS from 'crypto-js';

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';

// Get encryption key from environment or generate/use default
let ENCRYPTION_KEY;
let RAW_ENCRYPTION_KEY;
if (process.env.ENCRYPTION_KEY) {
  RAW_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  // If env var is set, convert hex string to buffer
  if (process.env.ENCRYPTION_KEY.length === 64) {
    ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  } else {
    // If it's a plain string, hash it to get exactly 32 bytes
    ENCRYPTION_KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest();
  }
} else {
  // Default development key - MUST MATCH client-side default!
  // Client uses: 'notemind-default-encryption-key-2024-secure'
  // Hash it to 32 bytes like the server does for plain strings
  const defaultKeyString = 'notemind-default-encryption-key-2024-secure';
  RAW_ENCRYPTION_KEY = defaultKeyString;
  ENCRYPTION_KEY = crypto.createHash('sha256').update(defaultKeyString).digest();
  console.warn('⚠️  Using default encryption key. Set ENCRYPTION_KEY env var for production!');
}

function decryptLegacyCryptoJs(encryptedData) {
  const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
  const ciphertext = CryptoJS.enc.Hex.parse(encryptedData.encrypted);
  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });

  const candidateKeys = [];

  if (RAW_ENCRYPTION_KEY) {
    candidateKeys.push(CryptoJS.enc.Utf8.parse(RAW_ENCRYPTION_KEY));
    candidateKeys.push(CryptoJS.SHA256(RAW_ENCRYPTION_KEY));

    if (RAW_ENCRYPTION_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(RAW_ENCRYPTION_KEY)) {
      candidateKeys.push(CryptoJS.enc.Hex.parse(RAW_ENCRYPTION_KEY));
    }
  }

  for (const key of candidateKeys) {
    try {
      const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      if (decryptedString) {
        return decryptedString;
      }
    } catch {
      // Try next candidate key
    }
  }

  throw new Error('Legacy CryptoJS decryption failed');
}

/**
 * Encrypt data
 * @param {string|object} data - Data to encrypt
 * @returns {object} - { iv, encrypted }
 */
export function encryptData(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
  
  let encrypted = cipher.update(jsonData, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    iv: iv.toString('hex'),
    encrypted
  };
}

/**
 * Decrypt data
 * @param {object} encryptedData - { iv, encrypted }
 * @returns {string} - Decrypted data as JSON string
 */
export function decryptData(encryptedData) {
  try {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    try {
      return decryptLegacyCryptoJs(encryptedData);
    } catch (legacyError) {
      throw new Error(`Decryption failed: ${error.message}; legacy fallback failed: ${legacyError.message}`);
    }
  }
}

/**
 * Parse decrypted JSON data
 * @param {string} decryptedString - Decrypted JSON string
 * @returns {object} - Parsed object
 */
export function parseDecrypted(decryptedString) {
  try {
    return JSON.parse(decryptedString);
  } catch (error) {
    throw new Error('Failed to parse decrypted data: ' + error.message);
  }
}

/**
 * Stringify data for encryption
 * @param {object} data - Data to stringify
 * @returns {string} - JSON string
 */
export function stringifyForEncryption(data) {
  return JSON.stringify(data);
}

export { ALGORITHM, ENCRYPTION_KEY };
