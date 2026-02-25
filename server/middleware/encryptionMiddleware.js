import { decryptData, parseDecrypted, encryptData } from '../services/encryptionService.js';
import { logger } from '../services/logger.js';

/**
 * Middleware to decrypt encrypted requests and re-encrypt responses
 * Expects request body in format: { encrypted: string, iv: string }
 * Also allows unencrypted requests for development/testing
 */
export function decryptMiddleware(req, res, next) {
  // Skip decryption for certain routes (like uploads, static files, health checks, etc.)
  const skipEncryption = [
    '/upload',
    '/api/upload',
    '/health',
    '/api/health',
    '/api/rate-limit'
  ];
  
  if (skipEncryption.some(path => req.path.includes(path))) {
    return next();
  }

  // Only process POST, PUT, PATCH requests with body
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  try {
    // Check if request has encrypted data in the expected format
    if (req.body && typeof req.body === 'object' && req.body.encrypted && req.body.iv) {
      logger.warn('[Encryption] Incoming encrypted request payload', {
        path: req.path,
        method: req.method,
        headers: req.headers,
        body: req.body,
        encrypted: req.body.encrypted,
        iv: req.body.iv,
        encryptedLength: req.body.encrypted?.length,
        ivLength: req.body.iv?.length
      });

      try {
        const decryptedString = decryptData({
          encrypted: req.body.encrypted,
          iv: req.body.iv
        });

        const decryptedData = parseDecrypted(decryptedString);

        logger.warn('[Encryption] Decrypted request payload', {
          path: req.path,
          method: req.method,
          decryptedString,
          decryptedData
        });
        
        // Replace body with decrypted data
        req.body = decryptedData;
        logger.debug(`[Encryption] Decrypted request to ${req.path}`);
      } catch (decryptionError) {
        logger.error(`[Encryption] Failed to decrypt request: ${decryptionError.message}`, {
          path: req.path,
          hasEncrypted: !!req.body.encrypted,
          hasIv: !!req.body.iv,
          body: req.body,
          encrypted: req.body.encrypted,
          iv: req.body.iv,
          encryptedLength: req.body.encrypted?.length,
          ivLength: req.body.iv?.length,
          headers: req.headers,
          stack: decryptionError.stack
        });
        
        return res.status(400).json({ 
          error: 'Failed to decrypt request',
          details: process.env.NODE_ENV === 'development' ? decryptionError.message : 'Decryption failed'
        });
      }
    } 
    // Allow unencrypted requests (for development/testing)
    else if (req.body && typeof req.body === 'object') {
      // Request body exists but is not encrypted - allow it to pass through
      logger.warn('[Encryption] Unencrypted request allowed', {
        path: req.path,
        method: req.method,
        headers: req.headers,
        body: req.body
      });
    }

    next();
  } catch (error) {
    logger.error('[Encryption] Middleware error:', error);
    return res.status(500).json({ 
      error: 'Encryption middleware error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    });
  }
}
