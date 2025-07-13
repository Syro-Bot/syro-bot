/**
 * File Upload Routes Module
 * 
 * Handles secure file uploads for the Syro Discord bot API server
 * with comprehensive validation and security measures.
 * 
 * @author Syro Development Team
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { FILE_UPLOAD_SECURITY, RATE_LIMITS } = require('../config/security');
const { sanitizeFileUploads } = require('../middleware/sanitizer');

/**
 * Configure multer storage with enhanced security
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate secure filename
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Validate extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error('Invalid file extension'));
    }
    
    const filename = `${timestamp}-${random}${ext}`;
    cb(null, filename);
  }
});

/**
 * File filter function with enhanced validation
 */
const fileFilter = (req, file, cb) => {
  try {
    // Check file mimetype
    if (!FILE_UPLOAD_SECURITY.allowedTypes.includes(file.mimetype)) {
      logger.security('Invalid file type attempted', {
        mimetype: file.mimetype,
        originalname: file.originalname,
        ip: req.ip
      });
      return cb(new Error(`Invalid file type. Allowed types: ${FILE_UPLOAD_SECURITY.allowedTypes.join(', ')}`), false);
    }
    
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    if (!allowedExtensions.includes(ext)) {
      logger.security('Invalid file extension attempted', {
        extension: ext,
        originalname: file.originalname,
        ip: req.ip
      });
      return cb(new Error('Invalid file extension'), false);
    }
    
    // Check file size (basic check, detailed check happens after upload)
    if (file.size > FILE_UPLOAD_SECURITY.maxSize) {
      logger.security('File too large attempted', {
        size: file.size,
        maxSize: FILE_UPLOAD_SECURITY.maxSize,
        originalname: file.originalname,
        ip: req.ip
      });
      return cb(new Error(`File too large. Maximum size: ${Math.round(FILE_UPLOAD_SECURITY.maxSize / 1024 / 1024)}MB`), false);
    }
    
    cb(null, true);
  } catch (error) {
    logger.errorWithContext(error, { context: 'File filter validation' });
    cb(error, false);
  }
};

/**
 * Configure multer with security settings
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_UPLOAD_SECURITY.maxSize,
    files: FILE_UPLOAD_SECURITY.maxFiles
  }
});

/**
 * File upload endpoint with comprehensive security
 * @route POST /api/upload
 * @param {File} image - The image file to upload
 * @returns {Object} JSON response with the uploaded file URL
 */
router.post('/upload', 
  RATE_LIMITS.upload,
  sanitizeFileUploads(),
  upload.single('image'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          error: 'No image was uploaded' 
        });
      }

      // Additional validation after upload
      const file = req.file;
      
      // Validate file type again
      if (!FILE_UPLOAD_SECURITY.allowedTypes.includes(file.mimetype)) {
        // Delete the uploaded file
        fs.unlinkSync(file.path);
        logger.security('Invalid file type after upload', {
          mimetype: file.mimetype,
          filename: file.filename,
          ip: req.ip
        });
        return res.status(400).json({ 
          success: false,
          error: `Invalid file type. Allowed types: ${FILE_UPLOAD_SECURITY.allowedTypes.join(', ')}` 
        });
      }

      // Validate file size
      if (file.size > FILE_UPLOAD_SECURITY.maxSize) {
        // Delete the uploaded file
        fs.unlinkSync(file.path);
        logger.security('File too large after upload', {
          size: file.size,
          maxSize: FILE_UPLOAD_SECURITY.maxSize,
          filename: file.filename,
          ip: req.ip
        });
        return res.status(400).json({ 
          success: false,
          error: `File too large. Maximum size: ${Math.round(FILE_UPLOAD_SECURITY.maxSize / 1024 / 1024)}MB` 
        });
      }

      // Validate file exists and is readable
      if (!fs.existsSync(file.path)) {
        logger.error('Uploaded file not found', { filename: file.filename });
        return res.status(500).json({ 
          success: false,
          error: 'File upload failed' 
        });
      }

      // Build the public URL for the uploaded file
      const imageUrl = `/uploads/${file.filename}`;
      
      logger.info('File uploaded successfully', {
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        ip: req.ip
      });

      res.json({ 
        success: true,
        url: imageUrl,
        filename: file.filename,
        size: file.size
      });
    } catch (error) {
      logger.errorWithContext(error, { 
        context: 'File upload processing',
        ip: req.ip
      });
      
      // Clean up file if it was uploaded
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ 
        success: false,
        error: 'File upload failed' 
      });
    }
  }
);

/**
 * Delete uploaded file endpoint
 * @route DELETE /api/upload/:filename
 * @param {string} filename - The filename to delete
 * @returns {Object} JSON response with deletion status
 */
router.delete('/upload/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }
    
    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    const filePath = path.join(__dirname, '..', 'uploads', sanitizedFilename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Delete file
    fs.unlinkSync(filePath);
    
    logger.info('File deleted successfully', {
      filename: sanitizedFilename,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.errorWithContext(error, { 
      context: 'File deletion',
      filename: req.params.filename,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    });
  }
});

/**
 * Get upload statistics endpoint
 * @route GET /api/upload/stats
 * @returns {Object} Upload statistics
 */
router.get('/upload/stats', (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      return res.json({
        success: true,
        stats: {
          totalFiles: 0,
          totalSize: 0,
          allowedTypes: FILE_UPLOAD_SECURITY.allowedTypes,
          maxFileSize: FILE_UPLOAD_SECURITY.maxSize
        }
      });
    }
    
    const files = fs.readdirSync(uploadsDir);
    let totalSize = 0;
    
    files.forEach(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    });
    
    res.json({
      success: true,
      stats: {
        totalFiles: files.length,
        totalSize: totalSize,
        allowedTypes: FILE_UPLOAD_SECURITY.allowedTypes,
        maxFileSize: FILE_UPLOAD_SECURITY.maxSize
      }
    });
  } catch (error) {
    logger.errorWithContext(error, { context: 'Upload stats' });
    res.status(500).json({
      success: false,
      error: 'Failed to get upload statistics'
    });
  }
});

module.exports = router; 