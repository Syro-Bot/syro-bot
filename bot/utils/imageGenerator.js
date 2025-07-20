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

/**
 * Generate user info image (Syro dashboard style, rounded, 2 columns, message counters)
 * @param {Object} options - Image options
 * @param {string} options.avatarUrl - User avatar URL
 * @param {string} options.username - Username (with tag)
 * @param {string} options.displayName - Display name
 * @param {string[]} options.roles - Role list (names)
 * @param {string[]} options.roleColors - Role hex colors list (same order as roles)
 * @param {string} options.createdAt - Creation date (friendly string)
 * @param {string} options.joinedAt - Join date (friendly string)
 * @param {string[]} options.badges - Badge list (strings, optional)
 * @param {string} options.userId - User ID
 * @param {string} options.guildIconUrl - Guild icon URL
 * @param {string} options.guildName - Guild name
 * @param {string[]} [options.permissions] - Key permissions
 * @param {string} [options.color] - User's main color
 * @param {string} [options.nickname] - Server nickname
 * @param {Object} [options.messageCounts] - {day1, day7, day14}
 * @returns {Promise<Buffer>} - Generated image
 */
async function generateUserInfoImage({
  avatarUrl,
  username,
  displayName,
  roles = [],
  roleColors = [],
  createdAt,
  joinedAt,
  badges = [],
  userId,
  guildIconUrl,
  guildName,
  permissions = [],
  color = '#00bcd4',
  nickname = '',
  messageCounts = { day1: 0, day7: 0, day14: 0 }
}) {
  // Visual configuration
  const width = 1200;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // --- Main flat background with global rounded corners ---
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(width - 40, 0);
  ctx.quadraticCurveTo(width, 0, width, 40);
  ctx.lineTo(width, height - 40);
  ctx.quadraticCurveTo(width, height, width - 40, height);
  ctx.lineTo(40, height);
  ctx.quadraticCurveTo(0, height, 0, height - 40);
  ctx.lineTo(0, 40);
  ctx.quadraticCurveTo(0, 0, 40, 0);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // --- Large square avatar on the left ---
  let avatarImg;
  try {
    let cleanUrl = avatarUrl.split('?')[0] + '?size=512&format=png';
    console.log('[UserInfoImage] Attempting to load avatar:', cleanUrl);
    avatarImg = await loadImage(cleanUrl);
  } catch (e) {
    try {
      console.log('[UserInfoImage] Fallback to original avatarUrl:', avatarUrl);
      avatarImg = await loadImage(avatarUrl);
    } catch (err) {
      console.log('[UserInfoImage] Fallback to default avatar');
      avatarImg = await loadImage('https://cdn.discordapp.com/embed/avatars/0.png');
    }
  }
  // Even larger avatar
  const avatarSize = 380;
  const avatarX = 70;
  const avatarY = height / 2 - avatarSize / 2;
  // Square with rounded corners
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(avatarX + 48, avatarY);
  ctx.lineTo(avatarX + avatarSize - 48, avatarY);
  ctx.quadraticCurveTo(avatarX + avatarSize, avatarY, avatarX + avatarSize, avatarY + 48);
  ctx.lineTo(avatarX + avatarSize, avatarY + avatarSize - 48);
  ctx.quadraticCurveTo(avatarX + avatarSize, avatarY + avatarSize, avatarX + avatarSize - 48, avatarY + avatarSize);
  ctx.lineTo(avatarX + 48, avatarY + avatarSize);
  ctx.quadraticCurveTo(avatarX, avatarY + avatarSize, avatarX, avatarY + avatarSize - 48);
  ctx.lineTo(avatarX, avatarY + 48);
  ctx.quadraticCurveTo(avatarX, avatarY, avatarX + 48, avatarY);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();

  // --- ID above avatar (without 'ID:' text) ---
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.fillText(userId, avatarX + avatarSize / 2, avatarY - 24);

  // --- Name below avatar (without #, div, or icon) ---
  ctx.font = 'bold 38px Arial';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(displayName || username.split('#')[0], avatarX + avatarSize / 2, avatarY + avatarSize + 54);

  // --- Info on the right ---
  // Layout vertically centered without overlap
  const inputCardW = 200;
  const inputCardH = 110;
  const inputGap = 24;
  const bigCardW = 280;
  const bigCardH = 210;
  const bigGap = 32;
  // Horizontal centering of rows
  const totalInputWidth = inputCardW * 3 + inputGap * 2;
  const totalBigWidth = bigCardW * 2 + bigGap;
  const infoBlockHeight = inputCardH + 32 + bigCardH;
  const infoBlockY = (height - infoBlockHeight) / 2;
  // Center top row relative to bottom row
  const bigStartX = Math.max(avatarX + avatarSize + 100, (width - totalBigWidth) / 2);
  const infoX = bigStartX + (totalBigWidth - totalInputWidth) / 2;
  const inputY = infoBlockY;
  const bigY = inputY + inputCardH + 32;
  const inputSections = [
    {
      icon: '🕓',
      label: 'Joined',
      value: joinedAt,
      color: '#6366f1',
      bg: '#23272f'
    },
    {
      icon: '📅',
      label: 'Created',
      value: createdAt,
      color: '#38bdf8',
      bg: '#23272f'
    },
    {
      icon: '🚀',
      label: 'Boosting',
      value: 'No', // You can change to 'Yes' if the user is boosting
      color: '#f472b6',
      bg: '#23272f'
    }
  ];
  for (let i = 0; i < inputSections.length; i++) {
    const x = infoX + i * (inputCardW + inputGap);
    const y = inputY;
    // Card background
    ctx.save();
    ctx.fillStyle = inputSections[i].bg;
    ctx.strokeStyle = inputSections[i].color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, inputCardW, inputCardH, 16);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // Vertically center icon, label and value in card with fixed gap (larger between label and value)
    ctx.textAlign = 'center';
    // Sizes
    ctx.font = 'bold 26px Arial';
    const iconHeight = 28;
    ctx.font = 'bold 18px Arial';
    const labelHeight = 20;
    ctx.font = '22px Arial';
    const valueHeight = 24;
    const gap1 = 12; // icon-title
    const gap2 = 28; // title-value
    // Wrap for value
    ctx.font = '22px Arial';
    const value = inputSections[i].value;
    const maxWidth = inputCardW - 24;
    let lines = [];
    if (ctx.measureText(value).width <= maxWidth) {
      lines = [value];
    } else {
      // Manual wrap
      let words = value.split(' ');
      let line = '';
      for (let w = 0; w < words.length; w++) {
        let testLine = line + (line ? ' ' : '') + words[w];
        if (ctx.measureText(testLine).width > maxWidth) {
          lines.push(line);
          line = words[w];
        } else {
          line = testLine;
        }
      }
      if (line) lines.push(line);
    }
    const valueBlockHeight = lines.length * valueHeight + (lines.length - 1) * 2;
    // Calculate total block height
    const totalBlock = iconHeight + gap1 + labelHeight + gap2 + valueBlockHeight;
    const blockStartY = y + (inputCardH - totalBlock) / 2;
    // Icon
    ctx.font = 'bold 26px Arial';
    ctx.fillStyle = inputSections[i].color;
    ctx.fillText(inputSections[i].icon, x + inputCardW / 2, blockStartY + iconHeight);
    // Label
    ctx.font = 'bold 18px Arial';
    ctx.fillText(inputSections[i].label, x + inputCardW / 2, blockStartY + iconHeight + gap1 + labelHeight);
    // Value (can be multiline)
    ctx.font = '22px Arial';
    ctx.fillStyle = '#fff';
    const valueStartY = blockStartY + iconHeight + gap1 + labelHeight + gap2;
    for (let l = 0; l < lines.length; l++) {
      ctx.fillText(lines[l], x + inputCardW / 2, valueStartY + l * (valueHeight + 2));
    }
  }

  // Row 2: two large cards (Messages, Voice Activity)
  const bigSections = [
    {
      icon: '💬',
      label: 'Messages',
      color: '#38bdf8',
      labelBg: '#0ea5e9',
      rows: [
        { label: '1d', value: `${messageCounts.day1} messages`, color: '#38bdf8', labelBg: '#0ea5e9' },
        { label: '7d', value: `${messageCounts.day7} messages`, color: '#38bdf8', labelBg: '#0ea5e9' },
        { label: '14d', value: `${messageCounts.day14} messages`, color: '#38bdf8', labelBg: '#0ea5e9' }
      ]
    },
    {
      icon: '🔊',
      label: 'Voice Activity',
      color: '#a78bfa',
      labelBg: '#8b5cf6',
      rows: [
        { label: '1d', value: `0h 0m`, color: '#a78bfa', labelBg: '#8b5cf6' },
        { label: '7d', value: `0h 0m`, color: '#a78bfa', labelBg: '#8b5cf6' },
        { label: '14d', value: `0h 0m`, color: '#a78bfa', labelBg: '#8b5cf6' }
      ]
    }
  ];
  for (let i = 0; i < bigSections.length; i++) {
    const x = bigStartX + i * (bigCardW + bigGap);
    const y = bigY;
    // Card background
    ctx.save();
    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = bigSections[i].color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, bigCardW, bigCardH, 24);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // Header: label on left, icon on right
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = bigSections[i].color;
    ctx.textAlign = 'left';
    ctx.fillText(bigSections[i].label, x + 32, y + 44);
    ctx.textAlign = 'right';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(bigSections[i].icon, x + bigCardW - 32, y + 44);
    // Rows (1d, 7d, 14d)
    for (let l = 0; l < bigSections[i].rows.length; l++) {
      const rowY = y + 80 + l * 38;
      // Long background
      ctx.save();
      ctx.fillStyle = bigSections[i].rows[l].color;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.roundRect(x + 32, rowY - 18, bigCardW - 64, 32, 12);
      ctx.fill();
      ctx.restore();
      // Label background
      ctx.save();
      ctx.fillStyle = bigSections[i].rows[l].labelBg;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.roundRect(x + 32, rowY - 18, 60, 32, 12);
      ctx.fill();
      ctx.restore();
      // Label text
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(bigSections[i].rows[l].label, x + 32 + 30, rowY + 6);
      // Message text
      ctx.font = '20px Arial';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(bigSections[i].rows[l].value, x + 32 + 75, rowY + 6);
    }
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateWelcomeImage,
  generateUserInfoImage
}; 