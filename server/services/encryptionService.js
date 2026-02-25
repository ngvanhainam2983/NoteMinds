import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { logger } from './logger.js';

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
  logger.warn('[Encryption] Using default encryption key. Set ENCRYPTION_KEY env var for production');
}

logger.warn('[Encryption] Key diagnostics', {
  rawKey: RAW_ENCRYPTION_KEY,
  rawKeyLength: RAW_ENCRYPTION_KEY?.length,
  rawKeyIsHex64: !!(RAW_ENCRYPTION_KEY && RAW_ENCRYPTION_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(RAW_ENCRYPTION_KEY)),
  derivedKeyHex: ENCRYPTION_KEY.toString('hex'),
  algorithm: ALGORITHM
});

function decryptLegacyCryptoJs(encryptedData) {
  logger.warn('[Encryption] Legacy fallback start', {
    iv: encryptedData?.iv,
    encrypted: encryptedData?.encrypted,
    ivLength: encryptedData?.iv?.length,
    encryptedLength: encryptedData?.encrypted?.length
  });

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

  for (let index = 0; index < candidateKeys.length; index += 1) {
    const key = candidateKeys[index];
    try {
      logger.warn('[Encryption] Legacy fallback attempt', {
        attempt: index + 1,
        totalAttempts: candidateKeys.length,
        keyHex: key.toString(),
        ivHex: iv.toString(),
        ciphertextHex: ciphertext.toString()
      });

      const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      if (decryptedString) {
        logger.warn('[Encryption] Legacy fallback success', {
          attempt: index + 1,
          decryptedString
        });
        return decryptedString;
      }
      logger.warn('[Encryption] Legacy fallback empty result', {
        attempt: index + 1
      });
    } catch (error) {
      logger.error('[Encryption] Legacy fallback attempt failed', {
        attempt: index + 1,
        message: error.message,
        stack: error.stack
      });
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

  logger.warn('[Encryption] Encrypt input', {
    data,
    jsonData,
    ivHex: iv.toString('hex'),
    keyHex: ENCRYPTION_KEY.toString('hex'),
    rawKey: RAW_ENCRYPTION_KEY
  });
  
  let encrypted = cipher.update(jsonData, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  logger.warn('[Encryption] Encrypt output', {
    iv: iv.toString('hex'),
    encrypted,
    encryptedLength: encrypted.length
  });
  
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
  logger.warn('[Encryption] Decrypt input', {
    encryptedData,
    iv: encryptedData?.iv,
    encrypted: encryptedData?.encrypted,
    ivLength: encryptedData?.iv?.length,
    encryptedLength: encryptedData?.encrypted?.length,
    keyHex: ENCRYPTION_KEY.toString('hex'),
    rawKey: RAW_ENCRYPTION_KEY
  });

  try {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    logger.warn('[Encryption] Decrypt success', {
      decrypted,
      decryptedLength: decrypted.length
    });
    
    return decrypted;
  } catch (error) {
    logger.error('[Encryption] Primary decrypt failed', {
      message: error.message,
      stack: error.stack,
      encryptedData
    });

    try {
      const decrypted = decryptLegacyCryptoJs(encryptedData);
      logger.warn('[Encryption] Decrypt success via legacy fallback', {
        decrypted,
        decryptedLength: decrypted.length
      });
      return decrypted;
    } catch (legacyError) {
      logger.error('[Encryption] Legacy fallback failed', {
        message: legacyError.message,
        stack: legacyError.stack,
        encryptedData
      });
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
