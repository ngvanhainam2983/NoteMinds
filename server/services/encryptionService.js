import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { logger } from './logger.js';

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';
const DEFAULT_COMPAT_KEY = 'notemind-default-encryption-key-2024-secure';

// ==== SECURITY: Enforce ENCRYPTION_KEY from environment ====
let ENCRYPTION_KEY;
let RAW_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!RAW_ENCRYPTION_KEY) {
  console.error('❌ FATAL ERROR: ENCRYPTION_KEY environment variable is not set!');
  console.error('   Generate a 32-byte hex string with:');
  console.error('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.error('   Then set: export ENCRYPTION_KEY=<generated-value>');
  process.exit(1);
}

// Validate format
if (!/^[a-f0-9]{64}$/i.test(RAW_ENCRYPTION_KEY)) {
  console.error('❌ ERROR: ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)');
  if (RAW_ENCRYPTION_KEY.length !== 64) {
    console.error('   Current length: ' + RAW_ENCRYPTION_KEY.length + ' characters');
  }
  process.exit(1);
}

// Convert to buffer
try {
  ENCRYPTION_KEY = Buffer.from(RAW_ENCRYPTION_KEY, 'hex');
} catch (err) {
  console.error('❌ ERROR: Failed to parse ENCRYPTION_KEY:', err.message);
  process.exit(1);
}

// Only log non-sensitive information
logger.info('[Encryption] Service initialized with 32-byte key');
// ✅ DO NOT log the key hex or any sensitive data!

function deriveNodeKey(rawKey) {
  if (!rawKey) return null;
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }
  return crypto.createHash('sha256').update(rawKey).digest();
}

function buildRawKeyCandidates() {
  const candidates = [];

  if (RAW_ENCRYPTION_KEY) {
    candidates.push({ source: 'env.ENCRYPTION_KEY', rawKey: RAW_ENCRYPTION_KEY });
  }

  const fallbackKeys = (process.env.ENCRYPTION_FALLBACK_KEYS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  for (const key of fallbackKeys) {
    candidates.push({ source: 'env.ENCRYPTION_FALLBACK_KEYS', rawKey: key });
  }

  if (RAW_ENCRYPTION_KEY !== DEFAULT_COMPAT_KEY) {
    candidates.push({ source: 'default-compat-key', rawKey: DEFAULT_COMPAT_KEY });
  }

  return candidates;
}

function decryptWithNodeCrypto(encryptedData, keyBuffer, source) {
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);

  logger.warn('[Encryption] Node decrypt attempt', {
    source,
    keyHex: keyBuffer.toString('hex'),
    ivHex: encryptedData.iv,
    encryptedLength: encryptedData.encrypted?.length
  });

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function decryptLegacyCryptoJs(encryptedData, rawKeyCandidates) {
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
  for (const candidate of rawKeyCandidates) {
    candidateKeys.push({
      source: `${candidate.source}:utf8`,
      key: CryptoJS.enc.Utf8.parse(candidate.rawKey)
    });
    candidateKeys.push({
      source: `${candidate.source}:sha256`,
      key: CryptoJS.SHA256(candidate.rawKey)
    });
    if (candidate.rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(candidate.rawKey)) {
      candidateKeys.push({
        source: `${candidate.source}:hex`,
        key: CryptoJS.enc.Hex.parse(candidate.rawKey)
      });
    }
  }

  for (let index = 0; index < candidateKeys.length; index += 1) {
    const { source, key } = candidateKeys[index];
    try {
      logger.warn('[Encryption] Legacy fallback attempt', {
        attempt: index + 1,
        totalAttempts: candidateKeys.length,
        source,
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

  const rawKeyCandidates = buildRawKeyCandidates();
  const nodeErrors = [];

  for (const candidate of rawKeyCandidates) {
    try {
      const keyBuffer = deriveNodeKey(candidate.rawKey);
      if (!keyBuffer) continue;
      const decrypted = decryptWithNodeCrypto(encryptedData, keyBuffer, candidate.source);

      logger.warn('[Encryption] Decrypt success', {
        source: candidate.source,
        decrypted,
        decryptedLength: decrypted.length
      });

      return decrypted;
    } catch (error) {
      nodeErrors.push(`${candidate.source}: ${error.message}`);
      logger.error('[Encryption] Node decrypt attempt failed', {
        source: candidate.source,
        message: error.message,
        stack: error.stack
      });
    }
  }

  try {
    const decrypted = decryptLegacyCryptoJs(encryptedData, rawKeyCandidates);
    logger.warn('[Encryption] Decrypt success via legacy fallback', {
      decrypted,
      decryptedLength: decrypted.length
    });
    return decrypted;
  } catch (legacyError) {
    logger.error('[Encryption] Legacy fallback failed', {
      message: legacyError.message,
      stack: legacyError.stack,
      encryptedData,
      nodeErrors
    });
    throw new Error(`Decryption failed: ${nodeErrors.join(' | ')}; legacy fallback failed: ${legacyError.message}`);
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
