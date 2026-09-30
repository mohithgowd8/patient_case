/**
 * CAREPATH AI - Department Routing Engine (departmentRoutingEngine.js)
 * Formulates preliminary department suggestions based on extracted symptoms,
 * complaint category, and risk urgency.
 * Always marked as 'Suggested Department' for doctor validation.
 */

function recommendDepartment(caseState) {
  const category = caseState.complaintCategory || "general";
  const priority = caseState.priority || "ROUTINE";
  const chief = (caseState.structured?.chiefComplaint?.value || "").toLowerCase();
  const allText = (caseState.responses || []).map(r => r.answer).join(" ").toLowerCase();

  const reasons = [];
  let department = "General Medicine";
  let confidence = "MEDIUM";

  if (priority === "HIGH") {
    if (category === "cardiovascular") {
      department = "Emergency / Cardiology";
      reasons.push("Acute cardiovascular warning indicators detected requiring rapid triage.");
      confidence = "HIGH";
    } else if (category === "respiratory") {
      department = "Emergency / Pulmonology";
      reasons.push("Severe respiratory compromise or low oxygen saturation indicators.");
      confidence = "HIGH";
    } else if (category === "neurological") {
      department = "Emergency / Neurology";
      reasons.push("Acute neurological deficits or syncope indicators detected.");
      confidence = "HIGH";
    } else {
      department = "Emergency";
      reasons.push("High priority risk level requires emergency department evaluation.");
      confidence = "HIGH";
    }
  } else {
    switch (category) {
      case "cardiovascular":
        department = "Cardiology";
        reasons.push("Primary complaint relates to thoracic or cardiac discomfort.");
        confidence = "HIGH";
        break;

      case "respiratory":
        department = "Pulmonology";
        reasons.push("Primary symptoms involve lungs, cough, or airway.");
        confidence = "HIGH";
        break;

      case "gastrointestinal":
        department = "Gastroenterology";
        reasons.push("Symptoms focus on abdominal, digestive, or bowel concerns.");
        confidence = "HIGH";
        break;

      case "neurological":
        department = "Neurology";
        reasons.push("Symptoms involve headache, vertigo, or nerve-related factors.");
        confidence = "HIGH";
        break;

      case "dermatological":
        department = "Dermatology";
        reasons.push("Chief complaint pertains to skin manifestations or rash.");
        confidence = "HIGH";
        break;

      case "musculoskeletal":
        department = "Orthopedics";
        reasons.push("Symptoms involve joint, back, or musculoskeletal pain.");
        confidence = "HIGH";
        break;

      default:
        department = "General Medicine";
        reasons.push("General, systemic, or unspecialized primary symptom profile.");
        confidence = "MEDIUM";
        break;
    }
  }

  // Check for pediatric age (under 14)
  if (caseState.patient?.age && Number(caseState.patient.age) < 14 && priority !== "HIGH") {
    department = "Pediatrics";
    reasons.push("Patient is in pediatric age category (< 14 years).");
    confidence = "HIGH";
  }

  return {
    department,
    reasons,
    confidence,
    disclaimer: "Suggested department based on preliminary AI case analysis. Doctor may override routing."
  };
}

module.exports = {
  recommendDepartment
};
