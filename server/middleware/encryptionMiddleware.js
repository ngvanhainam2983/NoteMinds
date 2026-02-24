import { decryptData, parseDecrypted, encryptData } from '../services/encryptionService.js';

/**
 * Middleware to decrypt encrypted requests and re-encrypt responses
 * Expects request body in format: { encrypted: string, iv: string }
 */
export function decryptMiddleware(req, res, next) {
  // Skip decryption for certain routes (like uploads, static files, etc.)
  const skipEncryption = ['/upload', '/api/upload'];
  if (skipEncryption.includes(req.path)) {
    return next();
  }

  // Only process POST, PUT, PATCH requests with body
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  try {
    // Check if request has encrypted data
    if (req.body && req.body.encrypted && req.body.iv) {
      const decryptedString = decryptData({
        encrypted: req.body.encrypted,
        iv: req.body.iv
      });

      const decryptedData = parseDecrypted(decryptedString);
      
      // Replace body with decrypted data
      req.body = decryptedData;
      console.log(`[Encryption] Decrypted request to ${req.path}`);
    }

    next();
  } catch (error) {
    console.error('[Encryption] Decryption error:', error.message);
    return res.status(400).json({ 
      error: 'Failed to decrypt request',
      details: error.message 
    });
  }
}
