/**
 * Image Generation Service
 * Handles welcome image generation with security and size limits
 */

const { createCanvas, loadImage } = require('canvas');
const { IMAGE_LIMITS } = require('../config/constants');
const { validateInput } = require('./errorHandler');

/**
 * Generate welcome image with security validations
 * @param {Object} config - Image configuration
 * @param {string} userAvatarUrl - User avatar URL
 * @param {string} username - Username to display
 * @returns {Promise<Buffer>} - Generated image buffer
 */
async function generateWelcomeImage(config, userAvatarUrl, username) {
  try {
    // Security validations
    const validationSchema = {
      config: { required: true, type: 'object' },
      userAvatarUrl: { required: true, type: 'string' },
      username: { required: true, type: 'string' }
    };
    
    const validation = validateInput({ config, userAvatarUrl, username }, validationSchema);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Validate URL format
    try {
      new URL(userAvatarUrl);
    } catch (error) {
      throw new Error('Invalid avatar URL format');
    }
    
    // Validate and limit canvas dimensions
    const canvasWidth = Math.min(config.width || 600, IMAGE_LIMITS.MAX_CANVAS_SIZE);
    const canvasHeight = Math.min(config.height || 300, IMAGE_LIMITS.MAX_CANVAS_SIZE);
    
    // Validate and limit avatar size
    const avatarSize = Math.min(config.imageSize || 120, IMAGE_LIMITS.MAX_IMAGE_SIZE);
    
    // Create canvas with validated dimensions
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    
    // Set background color with validation
    const backgroundColor = config.backgroundColor || '#1a1a1a';
    if (!/^#[0-9A-F]{6}$/i.test(backgroundColor)) {
      throw new Error('Invalid background color format');
    }
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Load and draw background image if provided (with size limits)
    if (config.backgroundImage) {
      try {
        const bgImage = await loadImage(config.backgroundImage);
        
        // Limit background image size
        const bgWidth = Math.min(bgImage.width, IMAGE_LIMITS.MAX_IMAGE_SIZE);
        const bgHeight = Math.min(bgImage.height, IMAGE_LIMITS.MAX_IMAGE_SIZE);
        
        ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
      } catch (error) {
        console.log('Error loading background image, using color only:', error.message);
      }
    }
    
    // Load user avatar with size limits
    let avatarImage;
    try {
      console.log('Loading avatar from URL:', userAvatarUrl);
      avatarImage = await loadImage(userAvatarUrl);
      
      // Validate avatar dimensions
      if (avatarImage.width > IMAGE_LIMITS.MAX_IMAGE_SIZE || avatarImage.height > IMAGE_LIMITS.MAX_IMAGE_SIZE) {
        console.log('Avatar too large, resizing...');
        // Create a temporary canvas to resize
        const tempCanvas = createCanvas(IMAGE_LIMITS.MAX_IMAGE_SIZE, IMAGE_LIMITS.MAX_IMAGE_SIZE);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(avatarImage, 0, 0, IMAGE_LIMITS.MAX_IMAGE_SIZE, IMAGE_LIMITS.MAX_IMAGE_SIZE);
        avatarImage = tempCanvas;
      }
      
      console.log('Avatar loaded successfully');
    } catch (error) {
      console.log('Error loading avatar, trying alternative URL:', error.message);
      // Try alternative avatar URL format
      try {
        const alternativeUrl = userAvatarUrl.replace('?size=512', '?size=256');
        avatarImage = await loadImage(alternativeUrl);
        console.log('Avatar loaded with alternative URL');
      } catch (altError) {
        console.log('Error with alternative URL, using default:', altError.message);
        // Use default avatar
        try {
          avatarImage = await loadImage('https://cdn.discordapp.com/embed/avatars/0.png');
          console.log('Default avatar loaded');
        } catch (defaultError) {
          console.log('Error loading default avatar:', defaultError.message);
          // Create a simple colored circle as fallback
          const avatarX = (canvasWidth - avatarSize) / 2;
          const avatarY = (canvasHeight - avatarSize) / 2;
          ctx.fillStyle = '#7289da';
          ctx.beginPath();
          ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
          ctx.fill();
          return canvas.toBuffer('image/png');
        }
      }
    }
    
    // Draw user avatar in center with validated position
    const avatarX = (canvasWidth - avatarSize) / 2;
    const avatarY = (canvasHeight - avatarSize) / 2;
    
    // Create circular avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
    
    // Configure text styling with validation
    const fontSize = Math.min(config.fontSize || 24, IMAGE_LIMITS.MAX_FONT_SIZE);
    ctx.font = `bold ${fontSize}px Arial`;
    
    // Validate text color
    const textColor = config.textColor || '#ffffff';
    if (!/^#[0-9A-F]{6}$/i.test(textColor)) {
      throw new Error('Invalid text color format');
    }
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    
    // Draw welcome text at top (16px from top, matching frontend top-4)
    const welcomeText = config.welcomeText || 'Welcome';
    ctx.fillText(welcomeText, canvasWidth / 2, 16 + fontSize);
    
    // Draw user text at bottom (32px from bottom, slightly higher than frontend)
    const userText = (config.userText || '{user}').replace('{user}', username);
    ctx.font = `bold ${fontSize * 0.8}px Arial`;
    ctx.fillText(userText, canvasWidth / 2, canvasHeight - 32);
    
    // Return the image buffer
    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error('Error generating welcome image:', error);
    throw error;
  }
}

module.exports = {
  generateWelcomeImage
}; 