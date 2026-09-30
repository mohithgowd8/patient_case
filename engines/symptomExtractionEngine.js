/**
 * CAREPATH AI - Symptom Extraction Engine (symptomExtractionEngine.js)
 * Analyzes unstructured natural language input in English, Hindi, and Telugu.
 * Extracts structured clinical attributes without guessing or fabricating data.
 */

function detectCategory(text = "") {
  const t = text.toLowerCase();

  // Cardiovascular
  if (
    /chest|heart|angina|palpitation|छाती|सीने|दिल|ఛాతీ|గుండె|రొమ్ము/i.test(t)
  ) {
    return "cardiovascular";
  }

  // Respiratory
  if (
    /breath|shortness of breath|cough|wheezing|asthma|सांस|खांसी|శ్వాస|దగ్గు/i.test(t)
  ) {
    return "respiratory";
  }

  // Gastrointestinal
  if (
    /stomach|abdomen|abdominal|belly|vomit|nausea|diarrhea|constipation|acidity|gut|पेट|उल्टी|दस्त|కడుపు|వాంతులు|విరేచనాలు/i.test(t)
  ) {
    return "gastrointestinal";
  }

  // Neurological
  if (
    /headache|migraine|dizzy|dizziness|faint|unconscious|numbness|seizure|सिर दर्द|चक्कर|बेहोश|తల|తలనొప్పి|తలతిరుగుడు/i.test(t)
  ) {
    return "neurological";
  }

  // Dermatological
  if (
    /skin|rash|itching|allergy|blister|त्वचा|खुजली|चमड़ी|చర్మం|దురద/i.test(t)
  ) {
    return "dermatological";
  }

  // Musculoskeletal
  if (
    /joint|knee|back pain|neck pain|muscle|bone|कमर दर्द|जोड़ों|వెన్నునొప్పి|కీళ్లనొప్పి/i.test(t)
  ) {
    return "musculoskeletal";
  }

  return "general";
}

function extractSeverity(text = "") {
  // Check for explicit ratings e.g. "8/10", "8 out of 10", "rating 8", "severity 8", "about 9"
  const scoreMatch = text.match(/(?:severity|rating|scale|score)?\s*([1-9]|10)\s*(?:\/|\s*out of\s*)\s*10\b/i) ||
                     text.match(/(?:severity|rating|scale|score|about|around)\s*(?:is|of|:)?\s*([1-9]|10)\b/i);
  if (scoreMatch) {
    return parseInt(scoreMatch[1], 10);
  }

  // If the answer is solely a number, e.g. "8" or "7"
  const bareMatch = text.trim().match(/^([1-9]|10)$/);
  if (bareMatch) {
    return parseInt(bareMatch[1], 10);
  }

  const lower = text.toLowerCase();
  if (/severe|unbearable|excruciating|extreme|तीव्र|असहनीय|తీవ్రమైన/i.test(lower)) {
    return 8;
  }
  if (/moderate|medium|मध्यम|साधारण|మితమైన/i.test(lower)) {
    return 5;
  }
  if (/mild|slight|minor|हल्का|कम|తేలికపాటి/i.test(lower)) {
    return 3;
  }

  return null;
}

function extractDuration(text = "") {
  const match = text.match(/(\d+\s*(?:hour|hr|minute|min|day|week|month|year)s?|today|yesterday|since morning)/i);
  if (match) {
    return match[1].trim();
  }

  const hindiMatch = text.match(/((\d+|दो|तीन|चार|एक)\s*(?:घंटे|दिन|हफ्ते|महीने)|आज|कल|सुबह से)/i);
  if (hindiMatch) {
    return hindiMatch[1].trim();
  }

  const teluguMatch = text.match(/((\d+|రెండు|మూడు|నాలుగు|ఒక)\s*(?:గంటలు|రోజులు|వారాలు|నెలలు)|ఈరోజు|నిన్న|ఉదయం నుండి)/i);
  if (teluguMatch) {
    return teluguMatch[1].trim();
  }

  return null;
}

function extractAssociatedSymptoms(text = "") {
  const lower = text.toLowerCase();
  const symptoms = [];

  const catalog = [
    { key: "Shortness of breath", regex: /shortness of breath|breathless|can't breathe|difficulty breathing|सांस लेने में तकलीफ|శ్వాస ఆడకపోవడం/i },
    { key: "Sweating / Diaphoresis", regex: /sweat|sweating|cold sweat|पसीना|చెమట/i },
    { key: "Dizziness / Lightheadedness", regex: /dizzy|dizziness|lightheaded|vertigo|चक्कर|తలతిరుగుడు/i },
    { key: "Nausea / Vomiting", regex: /nausea|vomit|vomiting|जी मिचलाना|उल्टी|వాంతి|వికారం/i },
    { key: "Radiation to arm / jaw / back", regex: /radiation|spread.*(?:arm|jaw|back|shoulder)|हाथ.*दर्द|భుజం.*నొప్పి/i },
    { key: "Fever / Chills", regex: /fever|chills|high temperature|बुखार|ठंड|జ్వరం/i },
    { key: "Fatigue / Weakness", regex: /fatigue|weakness|tired|exhausted|कमजोरी|थकान|నీరసం/i },
    { key: "Loss of consciousness / Syncope", regex: /faint|fainted|unconscious|blackout|बेहोश|స్పృహ తప్పడం/i },
    { key: "Severe Bleeding", regex: /bleed|blood|खून|రక్తం/i }
  ];

  for (const item of catalog) {
    if (item.regex.test(lower)) {
      symptoms.push(item.key);
    }
  }

  return symptoms;
}

function extractMedicalHistory(text = "") {
  const lower = text.toLowerCase();
  const history = [];

  const conditions = [
    { key: "Hypertension / High BP", regex: /hypertension|high bp|blood pressure|बीपी|బిపి/i },
    { key: "Diabetes Mellitus", regex: /diabetes|sugar|मधुमेह|షుగర్/i },
    { key: "Coronary Artery Disease / Heart Condition", regex: /heart disease|cardiac|bypass|stent|दिल की बीमारी|గుండె జబ్బు/i },
    { key: "Asthma / COPD", regex: /asthma|copd|bronchitis|दमा|ఆస్తమా/i },
    { key: "Thyroid Disorder", regex: /thyroid|थायरॉयड|థైరాయిడ్/i },
    { key: "Kidney Disease", regex: /kidney|renal|गुर्दे|మూత్రపిండాలు/i }
  ];

  for (const c of conditions) {
    if (c.regex.test(lower)) {
      history.push(c.key);
    }
  }

  return history;
}

function extractFromText(rawText = "", questionContext = "general") {
  const clean = String(rawText || "").trim();
  const result = {
    detectedCategory: detectCategory(clean),
    severity: extractSeverity(clean),
    duration: extractDuration(clean),
    associatedSymptoms: extractAssociatedSymptoms(clean),
    medicalHistory: extractMedicalHistory(clean)
  };

  return result;
}

module.exports = {
  detectCategory,
  extractSeverity,
  extractDuration,
  extractAssociatedSymptoms,
  extractMedicalHistory,
  extractFromText
};
