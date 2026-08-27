/**
 * Base AI Provider Abstract Interface
 */
export class BaseAIProvider {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Analyze a maintenance complaint and return structured triage data
   * @param {Object} complaintData - { description, reportedCategory, createdAt, photoUrl }
   * @returns {Promise<Object>} Structured triage payload
   */
  async analyzeComplaint(complaintData) {
    throw new Error("analyzeComplaint() must be implemented by concrete AI provider");
  }

  /**
   * Generate vector embeddings for text (Reserved for Phase 3B Semantic Duplicate Detection)
   * @param {string} text
   * @returns {Promise<Array<number>>}
   */
  async generateEmbedding(text) {
    throw new Error("generateEmbedding() must be implemented by concrete AI provider");
  }
}
