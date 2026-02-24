import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

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
    throw new Error('Decryption failed: ' + error.message);
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
