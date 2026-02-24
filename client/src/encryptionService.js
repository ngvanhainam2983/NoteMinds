import CryptoJS from 'crypto-js';

// This key should match ENCRYPTION_KEY on server
// In production, this should be derived from the user's token or a secure key exchange
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'notemind-default-encryption-key-2024-secure';

/**
 * Encrypt data for sending to server
 * @param {object} data - Data to encrypt
 * @returns {object} - { iv, encrypted }
 */
export function encryptDataForServer(data) {
  // Generate a random IV
  const iv = CryptoJS.lib.WordArray.random(16);
  const jsonData = JSON.stringify(data);
  
  // Encrypt using AES-256-CBC
  const encrypted = CryptoJS.AES.encrypt(jsonData, CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return {
    iv: iv.toString(CryptoJS.enc.Hex),
    encrypted: encrypted.toString()
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
    
    const decrypted = CryptoJS.AES.decrypt(encryptedData.encrypted, CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY), {
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
