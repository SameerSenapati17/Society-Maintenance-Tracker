import { BaseAIProvider } from "./aiProvider.js";

/**
 * Deterministic Mock AI Provider for Automated Testing & Offline Development
 */
export class MockAIProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    this.customMockResponse = config.customMockResponse || null;
    this.shouldFail = config.shouldFail || false;
    this.embeddingModel = config.embeddingModel || "gemini-embedding-2";
  }

  setMockResponse(response) {
    this.customMockResponse = response;
  }

  setShouldFail(shouldFail) {
    this.shouldFail = Boolean(shouldFail);
  }

  async analyzeComplaint(complaintData) {
    if (this.shouldFail) {
      throw new Error("Simulated upstream AI provider service timeout");
    }

    if (this.customMockResponse) {
      return {
        ...this.customMockResponse,
        model: "mock/test-engine"
      };
    }

    // Deterministic rule-informed mock inference for test predictability
    const desc = (complaintData.description || "").toLowerCase();
    let category = "General";
    let severity = "Medium";
    let urgency = "Normal";
    let recommendedPriority = "Medium";
    let summary = "Standard maintenance ticket reported by resident.";
    let suggestedAction = "Dispatch maintenance technician for on-site assessment.";
    let reasoning = "Issue reported in resident premises requires inspection.";
    let confidence = 0.88;

    if (desc.includes("leak") || desc.includes("water") || desc.includes("pipe") || desc.includes("tap") || desc.includes("plumb")) {
      category = "Plumbing";
      severity = desc.includes("flood") || desc.includes("burst") || desc.includes("heavily") ? "Critical" : "High";
      urgency = severity === "Critical" ? "Emergency" : "Urgent";
      recommendedPriority = "High";
      summary = "Active plumbing leakage reported with risk of water damage.";
      suggestedAction = "Dispatch plumbing team immediately and locate main shutoff valve if necessary.";
      reasoning = "Unresolved water leakage presents immediate property risk and secondary water damage.";
      confidence = 0.95;
    } else if (desc.includes("spark") || desc.includes("wire") || desc.includes("light") || desc.includes("shock") || desc.includes("electric")) {
      category = "Electrical";
      severity = desc.includes("spark") || desc.includes("shock") ? "Critical" : "High";
      urgency = severity === "Critical" ? "Emergency" : "Urgent";
      recommendedPriority = "High";
      summary = "Electrical hazard or power delivery failure reported.";
      suggestedAction = "Dispatch licensed electrician and isolate breaker circuit.";
      reasoning = "Exposed or faulty electrical components represent potential fire and safety hazards.";
      confidence = 0.94;
    } else if (desc.includes("lift") || desc.includes("elevator") || desc.includes("stuck")) {
      category = "Lift";
      severity = desc.includes("stuck") || desc.includes("trapped") ? "Critical" : "High";
      urgency = desc.includes("trapped") ? "Emergency" : "Urgent";
      recommendedPriority = "High";
      summary = "Elevator operational failure reported.";
      suggestedAction = "Contact elevator OEM maintenance contractor immediately.";
      reasoning = "Elevator downtime impacts building accessibility and safety.";
      confidence = 0.96;
    } else if (desc.includes("camera") || desc.includes("gate") || desc.includes("lock") || desc.includes("security")) {
      category = "Security";
      severity = "Medium";
      urgency = "Normal";
      recommendedPriority = "Medium";
      summary = "Access control or surveillance anomaly reported.";
      suggestedAction = "Inspect security checkpoint and verify camera feeds.";
      reasoning = "Security hardware malfunctions compromise perimeter monitoring.";
      confidence = 0.90;
    } else if (desc.includes("clean") || desc.includes("garbage") || desc.includes("spill") || desc.includes("trash")) {
      category = "Cleaning";
      severity = "Low";
      urgency = "Low";
      recommendedPriority = "Low";
      summary = "Common area hygiene or cleaning requirement reported.";
      suggestedAction = "Assign housekeeping squad to service designated area.";
      reasoning = "Non-hazardous sanitation task suitable for routine maintenance queues.";
      confidence = 0.92;
    } else if (desc.includes("car") || desc.includes("parking") || desc.includes("vehicle")) {
      category = "Parking";
      severity = "Low";
      urgency = "Normal";
      recommendedPriority = "Low";
      summary = "Parking bay encroachment or access issue.";
      suggestedAction = "Notify security team to verify vehicle registration and bay assignment.";
      reasoning = "Parking management issue without structural hazard.";
      confidence = 0.91;
    } else {
      category = "Other";
      severity = "Medium";
      urgency = "Normal";
      recommendedPriority = "Medium";
      summary = "General residential service request.";
      suggestedAction = "Review ticket details and assign to general facilities squad.";
      reasoning = "Standard maintenance intake.";
      confidence = 0.85;
    }

    return {
      category,
      severity,
      urgency,
      recommendedPriority,
      summary,
      suggestedAction,
      reasoning,
      confidence,
      model: "mock/test-engine"
    };
  }

  async generateEmbedding(text) {
    if (this.shouldFail) {
      throw new Error("Simulated upstream embedding provider failure");
    }
    // Deterministic 768-dim mock vector based on string hash for testing
    const hash = Array.from(text).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0);
    return Array.from({ length: 768 }, (_, i) => Math.sin(hash + i));
  }
}
