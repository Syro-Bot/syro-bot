/**
 * Template Model
 * 
 * This model stores Discord server templates that users can submit for review.
 * Templates go through a moderation process before being approved for public use.
 * 
 * @author Syro Development Team
 * @version 1.0.0
 */

const mongoose = require('mongoose');

/**
 * Schema for Discord server templates
 * Manages template submissions, reviews, and approval workflow
 */
const templateSchema = new mongoose.Schema({
  /**
   * Template Name
   * Display name for the template
   * Required and limited to 100 characters
   */
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100,
    index: true
  },
  
  /**
   * Template Tags
   * Comma-separated tags for categorizing the template
   * Used for search and filtering
   */
  tags: { 
    type: String, 
    required: true,
    trim: true
  },
  
  /**
   * Template Link
   * Discord template URL (discord.com/template/ or discord.new/)
   * Validated to ensure it's a proper Discord template link
   */
  link: { 
    type: String, 
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Accepts both discord.com/template/ and discord.new/ formats
        return /^https:\/\/(discord\.com\/template\/[a-zA-Z0-9]+|discord\.new\/[a-zA-Z0-9]+)/.test(v);
      },
      message: 'The link must be a valid Discord template URL'
    }
  },
  
  /**
   * Template Icon
   * URL of the uploaded template icon image
   * Optional - can be null if no icon is provided
   */
  icon: { 
    type: String, // URL of uploaded image
    default: null
  },
  
  /**
   * Review Status
   * Current status in the moderation workflow
   * - pending: Awaiting review
   * - approved: Approved for public use
   * - rejected: Rejected by moderators
   */
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending',
    index: true
  },
  
  /**
   * Submission Information
   * Details about who submitted the template
   */
  submittedBy: {
    userId: { 
      type: String, 
      required: true,
      index: true
    },
    username: { 
      type: String, 
      required: true,
      trim: true
    }
  },
  
  /**
   * Review Information
   * Details about who reviewed the template (if reviewed)
   */
  reviewedBy: {
    userId: { 
      type: String, 
      default: null,
      index: true
    },
    username: { 
      type: String, 
      default: null,
      trim: true
    }
  },
  
  /**
   * Review Timestamp
   * When the template was reviewed (if reviewed)
   */
  reviewedAt: { 
    type: Date, 
    default: null 
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt fields automatically
  collection: 'templates' // Explicit collection name
});

// Create indexes for better query performance
templateSchema.index({ status: 1, createdAt: -1 }); // For pending templates query
templateSchema.index({ 'submittedBy.userId': 1 }); // For user submissions
templateSchema.index({ tags: 'text', name: 'text' }); // For text search

module.exports = mongoose.model('Template', templateSchema); 