/**
 * CAREPATH AI - Autonomous Question Selection Engine (questionSelectionEngine.js)
 * Dynamically selects the next best clinically relevant question based on
 * missing high-value case information, risk indicators, and complaint category.
 * Prevents fixed question sequences and never asks already answered questions.
 */

const questionsCatalog = {
  chief: {
    id: "chief",
    translations: {
      en: "What main health problem or discomfort are you experiencing today?",
      hi: "आज आपको किस मुख्य स्वास्थ्य समस्या या बीमारी का सामना करना पड़ रहा है?",
      te: "ఈ రోజు మీరు ఎదుర్కొంటున్న ప్రధాన ఆరోగ్య సమస్య ఏమిటి?"
    }
  },
  onset: {
    id: "onset",
    attribute: "onset",
    translations: {
      en: "When did this discomfort or problem start, and was it sudden or gradual?",
      hi: "यह समस्या कब और कैसे शुरू हुई (अचानक या धीरे-धीरे)?",
      te: "ఈ సమస్య ఎప్పుడు మరియు ఎలా ప్రారంభమైంది (హఠాత్తుగానా లేదా క్రమంగానా)?"
    }
  },
  severity: {
    id: "severity",
    attribute: "severity",
    translations: {
      en: "On a scale from 1 to 10 (where 10 is unbearable), how severe is the discomfort?",
      hi: "1 से 10 के पैमाने पर यह दर्द या तकलीफ कितनी तीव्र है (10 असहनीय)?",
      te: "1 నుండి 10 వరకు ఈ నొప్పి లేదా తీవ్రత ఎంత ఎక్కువగా ఉంది?"
    }
  },
  location: {
    id: "location",
    attribute: "location",
    translations: {
      en: "Where exactly in your body is the discomfort located?",
      hi: "आपको यह दर्द या समस्या शरीर के किस हिस्से में महसूस हो रही है?",
      te: "మీకు ఈ నొప్పి లేదా సమస్య శరీరంలోని ఏ భాగంలో అనిపిస్తుంది?"
    }
  },
  radiation: {
    id: "radiation",
    attribute: "radiation",
    translations: {
      en: "Does the discomfort spread to your left arm, shoulder, neck, jaw, or back?",
      hi: "क्या यह दर्द आपके हाथ, कंधे, जबड़े, पीठ या किसी अन्य हिस्से में फैलता है?",
      te: "ఈ నొప్పి మీ చెయ్యి, భుజం, దవడ లేదా వెన్నుకు వ్యాపిస్తుందా?"
    }
  },
  breathing: {
    id: "breathing",
    attribute: "breathing",
    translations: {
      en: "Are you experiencing any shortness of breath, cold sweating, or dizziness?",
      hi: "क्या आपको सांस लेने में तकलीफ, ठंडा पसीना या चक्कर आ रहे हैं?",
      te: "మీకు శ్వాస తీసుకోవడంలో ఇబ్బంది, చల్లని చెమటలు లేదా తలతిరుగుడు ఉందా?"
    }
  },
  associated: {
    id: "associated",
    attribute: "associatedSymptoms",
    translations: {
      en: "What other symptoms are you noticing alongside this main issue?",
      hi: "इसके अलावा आपको और कौन-कौन से अन्य लक्षण महसूस हो रहे हैं?",
      te: "దీనితో పాటు మీకు ఇంకా ఏ ఇతర లక్షణాలు కనిపిస్తున్నాయి?"
    }
  },
  food: {
    id: "food",
    attribute: "foodRelation",
    translations: {
      en: "Does the abdominal discomfort change before or after eating, or with specific foods?",
      hi: "क्या खाना खाने के पहले या बाद में यह पेट दर्द बढ़ता या घटता है?",
      te: "ఆహారం తినకముందు లేదా తిన్న తర్వాత ఈ నొప్పి పెరుగుతుందా లేదా తగ్గుతుందా?"
    }
  },
  vomiting: {
    id: "vomiting",
    attribute: "gastrointestinalSymptoms",
    translations: {
      en: "Have you experienced nausea, vomiting, loose stools, or difficulty keeping fluids down?",
      hi: "क्या आपको उल्टी, दस्त, जी मिचलाना या पानी न पचने की शिकायत है?",
      te: "మీకు వాంతులు, విరేచనాలు, వికారం లేదా ద్రవాలు ఆగకపోవడం ఉన్నాయా?"
    }
  },
  fever: {
    id: "fever",
    attribute: "fever",
    translations: {
      en: "Have you checked your temperature, or are you experiencing chills or shivering?",
      hi: "क्या आपने अपना तापमान नापा है, या ठंड व कंपकंपी महसूस हो रही है?",
      te: "మీకు జ్వరం, చలి లేదా వణుకు వస్తున్నాయా?"
    }
  },
  past: {
    id: "past",
    attribute: "pastHistory",
    translations: {
      en: "Do you have any existing medical conditions such as high BP, diabetes, or heart disease?",
      hi: "क्या आपको पहले से कोई बीमारी (जैसे बीपी, शुगर, दिल की बीमारी) है?",
      te: "మీకు గతంలో ఏవైనా వ్యాధులు (బిపి, షుగర్ లేదా గుండె జబ్బులు) ఉన్నాయా?"
    }
  },
  medicines: {
    id: "medicines",
    attribute: "medications",
    translations: {
      en: "Are you currently taking any prescription medicines or over-the-counter tablets?",
      hi: "क्या आप वर्तमान में कोई नियमित या अन्य दवाएं ले रहे हैं?",
      te: "మీరు ప్రస్తుతం క్రమం తప్పకుండా ఏవైనా మందులు వాడుతున్నారా?"
    }
  },
  allergies: {
    id: "allergies",
    attribute: "allergies",
    translations: {
      en: "Do you have any known allergies to medicines, foods, or substances?",
      hi: "क्या आपको किसी दवा, भोजन या पदार्थ से कोई एलर्जी है?",
      te: "మీకు ఏదైనా మందు లేదా ఆహారంతో అలర్జీ ఉందా?"
    }
  }
};

/**
 * Priority matrix based on complaint category
 */
const categoryPriorityMap = {
  cardiovascular: [
    "onset",
    "severity",
    "radiation",
    "breathing",
    "past",
    "medicines",
    "allergies"
  ],
  respiratory: [
    "onset",
    "severity",
    "breathing",
    "fever",
    "past",
    "medicines",
    "allergies"
  ],
  gastrointestinal: [
    "onset",
    "severity",
    "location",
    "food",
    "vomiting",
    "fever",
    "past",
    "allergies"
  ],
  neurological: [
    "onset",
    "severity",
    "associated",
    "fever",
    "past",
    "medicines",
    "allergies"
  ],
  general: [
    "onset",
    "severity",
    "associated",
    "fever",
    "past",
    "medicines",
    "allergies"
  ]
};

/**
 * Determine what clinical attributes are already collected in case state
 */
function getMissingAttributes(caseState) {
  const missing = [];
  const s = caseState.structured || {};

  if (!s.onset?.value) missing.push("onset");
  if (!s.severity?.value) missing.push("severity");
  if (!s.location?.value) missing.push("location");
  if (!s.radiation?.value && caseState.complaintCategory === "cardiovascular") missing.push("radiation");
  if (!s.breathing?.value && (caseState.complaintCategory === "cardiovascular" || caseState.complaintCategory === "respiratory")) missing.push("breathing");
  if (!s.foodRelation?.value && caseState.complaintCategory === "gastrointestinal") missing.push("food");
  if (!s.gastrointestinalSymptoms?.value && caseState.complaintCategory === "gastrointestinal") missing.push("vomiting");
  if (!s.fever?.value) missing.push("fever");
  if (!s.pastHistory?.value) missing.push("past");
  if (!s.medications?.value) missing.push("medicines");
  if (!s.allergies?.value) missing.push("allergies");

  return missing;
}

/**
 * Select next question dynamically
 */
function selectNextQuestion(caseState, language = "en") {
  const answeredIds = new Set((caseState.responses || []).map(r => r.questionId));
  const category = caseState.complaintCategory || "general";
  const priorityList = categoryPriorityMap[category] || categoryPriorityMap.general;

  // If High Risk escalation condition met, stop asking more questions
  if (caseState.priority === "HIGH" && (caseState.responses || []).length >= 3) {
    return null;
  }

  // Maximum safe autonomous interview depth (6-7 targeted questions)
  if ((caseState.responses || []).length >= 7) {
    return null;
  }

  // Find first clinically prioritized question that hasn't been answered yet
  for (const qId of priorityList) {
    if (!answeredIds.has(qId)) {
      // Check if question's target attribute was already extracted from earlier text
      const targetAttr = questionsCatalog[qId]?.attribute;
      if (targetAttr && caseState.structured?.[targetAttr]?.value) {
        continue;
      }

      const qObj = questionsCatalog[qId];
      if (qObj) {
        return {
          id: qObj.id,
          text: qObj.translations[language] || qObj.translations.en,
          answerType: "text-or-voice"
        };
      }
    }
  }

  return null;
}

module.exports = {
  questionsCatalog,
  categoryPriorityMap,
  getMissingAttributes,
  selectNextQuestion
};
