const root = document.getElementById("app");

let me = null;
let patientConsultation = null;
let allPatientConsultations = [];
let doctorCase = null;
let doctorConsultationId = null;
let doctorCompletedCount = 0;
let doctorCompletedConsultations = [];
let hospitals = [];
let doctors = [];
let selectedLanguage = localStorage.getItem("preferred_language") || "en";
let recording = false;
let recognition = null;

const uiText = {
  en: {
    selectLangTitle: "Select Your Preferred Convenient Language",
    heroTitle: "Let your story reach the doctor <span>clearly.</span>",
    heroDesc: "PatiNote listens to patients in their preferred language, asks intelligent complaint-specific questions, and securely gives doctors a concise case summary.",
    patientPortalBtn: "Patient Portal",
    doctorPortalBtn: "Doctor Portal",
    heroCardTitle: "AI-assisted, doctor-led care",
    heroCardDesc: "The AI structures the patient's story. The doctor remains the final clinical decision-maker.",
    listenTitle: "01 · Listen",
    listenDesc: "Patient-first case taking",
    listenSub: "One simple question at a time, through text or voice.",
    structureTitle: "02 · Structure",
    structureDesc: "Complaint-aware questions",
    structureSub: "Different symptoms lead to different relevant questions.",
    protectTitle: "03 · Protect",
    protectDesc: "Privacy by expiration",
    protectSub: "Doctor access is revoked immediately when the visit ends.",
    footerNote: "Prototype uses synthetic patient data only. PatiNote does not diagnose or prescribe autonomously.",
    
    patientWelcome: "Welcome",
    patientSub: "Your PatiNote AI-assisted multilingual patient case workspace",
    bookNewConsultation: "+ Book new consultation",
    consultationHistory: "Your Previous Consultations",
    consultationHistoryDesc: "Access full clinical summaries, doctor notes, and prescriptions from your past visits.",
    consultationNo: "Consultation No",
    dateOfConsultation: "Date of Consultation",
    viewCaseSummary: "📜 View Case Summary",
    downloadPrescription: "📥 Download Prescription File",
    printSavePdf: "🖨 Print / Save PDF",

    aiCaseTaking: "AI CASE TAKING",
    textAndVoice: "TEXT & VOICE",
    questionCount: "question",
    textVoiceDesc: "Question is presented in Text & Voice. You may type or speak naturally.",
    readAloudBtn: "🔊 Read Aloud (Voice)",
    textareaPlaceholder: "Type your answer here or click 'Speak answer' to reply by voice...",
    speakAnswerBtn: "🎤 Speak answer (Voice Input)",
    stopListeningBtn: "⏹ Stop listening",
    continueBtn: "Continue",
    listeningStatus: "Listening… speak clearly in",
    voiceCaptured: "Voice captured. Please review before continuing.",
    voiceNotSupported: "Voice recognition is not supported in this browser. Please type your answer.",
    voiceError: "We couldn't understand your voice. Please try again or type your answer.",
    pleaseProvideAnswer: "Please type or speak an answer before continuing.",

    newConsultationTitle: "Choose your care team & consultation date",
    hospitalLabel: "Hospital",
    departmentLabel: "Department",
    doctorLabel: "Doctor",
    dateLabel: "Date of Consultation (Calendar)",
    requestConsultationBtn: "Request consultation",
    cancelBtn: "Cancel",

    step1Title: "How would you like to speak with PatiNote?",
    step1Sub: "AI questions and voice recognition will use your selected language.",
    consentText: "I understand that this is an AI-assisted history-taking tool and that a doctor will make the clinical decisions.",
    continueSecurely: "Continue securely"
  },
  hi: {
    selectLangTitle: "अपनी सुविधानुसार पसंदीदा भाषा चुनें",
    heroTitle: "अपनी बीमारी की बात डॉक्टर तक <span>स्पष्ट रूप से पहुँचाएँ।</span>",
    heroDesc: "पतिनोट आपकी पसंदीदा भाषा में आपकी बात सुनता है, लक्षण-विशिष्ट प्रश्न पूछता है, और सुरक्षित रूप से डॉक्टर को एक संक्षिप्त सारांश प्रदान करता है।",
    patientPortalBtn: "रोगी पोर्टल (Patient Portal)",
    doctorPortalBtn: "डॉक्टर पोर्टल (Doctor Portal)",
    heroCardTitle: "एआई-सहायक, डॉक्टर-नेतृत्व वाली देखभाल",
    heroCardDesc: "एआई रोगी की कहानी को व्यवस्थित करता है। डॉक्टर अंतिम नैदानिक निर्णयकर्ता बना रहता है।",
    listenTitle: "01 · बनें",
    listenDesc: "रोगी-प्रथम केस लेना",
    listenSub: "एक समय में एक सरल प्रश्न, पाठ या आवाज़ के माध्यम से।",
    structureTitle: "02 · संरचना",
    structureDesc: "लक्षण-जागरूक प्रश्न",
    structureSub: "विभिन्न लक्षण अलग-अलग प्रासंगिक प्रश्नों की ओर ले जाते हैं।",
    protectTitle: "03 · सुरक्षा",
    protectDesc: "समाप्ति द्वारा गोपनीयता",
    protectSub: "विज़िट समाप्त होते ही डॉक्टर की पहुँच तुरंत रद्द कर दी जाती है।",
    footerNote: "प्रोटोटाइप केवल कृत्रिम रोगी डेटा का उपयोग करता है। पतिनोट स्वचालित रूप से निदान या नुस्खा नहीं देता है।",

    patientWelcome: "स्वागत है",
    patientSub: "आपका पतिनोट एआई-सहायक बहुभाषी रोगी केस कार्यक्षेत्र",
    bookNewConsultation: "+ नया परामर्श बुक करें",
    consultationHistory: "आपके पिछले परामर्श",
    consultationHistoryDesc: "अपने पिछले दौरों से पूर्ण नैदानिक सारांश, डॉक्टर के नोट और पर्चे तक पहुँचें।",
    consultationNo: "परामर्श संख्या",
    dateOfConsultation: "परामर्श की तारीख",
    viewCaseSummary: "📜 केस सारांश देखें",
    downloadPrescription: "📥 प्रिस्क्रिप्शन फ़ाइल डाउनलोड करें",
    printSavePdf: "🖨 प्रिंट / पीडीएफ सहेजें",

    aiCaseTaking: "एआई केस लेना",
    textAndVoice: "पाठ और आवाज़",
    questionCount: "प्रश्न",
    textVoiceDesc: "प्रश्न पाठ और आवाज़ दोनों में प्रस्तुत किया गया है। आप टाइप कर सकते हैं या बोल सकते हैं।",
    readAloudBtn: "🔊 जोर से पढ़ें (आवाज़)",
    textareaPlaceholder: "अपना उत्तर यहाँ टाइप करें या आवाज़ से उत्तर देने के लिए 'उत्तर बोलें' पर क्लिक करें...",
    speakAnswerBtn: "🎤 उत्तर बोलें (आवाज़ इनपुट)",
    stopListeningBtn: "⏹ सुनना बंद करें",
    continueBtn: "आगे बढ़ें",
    listeningStatus: "सुन रहा हूँ… कृपया स्पष्ट रूप से बोलें:",
    voiceCaptured: "आवाज़ दर्ज की गई। कृपया आगे बढ़ने से पहले समीक्षा करें।",
    voiceNotSupported: "इस ब्राउज़र में आवाज पहचान समर्थित नहीं है। कृपया अपना उत्तर टाइप करें।",
    voiceError: "हम आपकी आवाज़ नहीं समझ सके। कृपया पुन: प्रयास करें या अपना उत्तर टाइप करें।",
    pleaseProvideAnswer: "आगे बढ़ने से पहले कृपया उत्तर टाइप करें या बोलें।",

    newConsultationTitle: "अपनी देखभाल टीम और परामर्श तिथि चुनें",
    hospitalLabel: "अस्पताल",
    departmentLabel: "विभाग",
    doctorLabel: "डॉक्टर",
    dateLabel: "परामर्श की तिथि (कैलेण्डर)",
    requestConsultationBtn: "परामर्श का अनुरोध करें",
    cancelBtn: "रद्द करें",

    step1Title: "आप पतिनोट के साथ किस भाषा में बात करना चाहते हैं?",
    step1Sub: "एआई प्रश्न और आवाज़ पहचान आपकी चुनी हुई भाषा का उपयोग करेंगे।",
    consentText: "मैं समझता/समझती हूँ कि यह एक एआई-सहायक इतिहास लेने वाला उपकरण है और डॉक्टर नैदानिक निर्णय लेंगे।",
    continueSecurely: "सुरक्षित रूप से जारी रखें"
  },
  te: {
    selectLangTitle: "మీ అనుకూలమైన ప్రాధాన్యత భాషను ఎంచుకోండి",
    heroTitle: "మీ ఆరోగ్య సమస్యను వైద్యుడికి <span>స్పష్టంగా తెలియజేయండి.</span>",
    heroDesc: "PatiNote మీ ప్రాధాన్యత భాషలో రోగులను వింటుంది, లక్షణాలకు సంబంధించిన ప్రశ్నావళిని అడుగుతుంది మరియు వైద్యుడికి సురక్షితమైన సారాంశాన్ని ఇస్తుంది.",
    patientPortalBtn: "పేషెంట్ పోర్టల్ (Patient Portal)",
    doctorPortalBtn: "డాక్టర్ పోర్టల్ (Doctor Portal)",
    heroCardTitle: "AI-సహకార, డాక్టర్-నడిపే వైద్యం",
    heroCardDesc: "AI రోగి కథనాన్ని క్రమబద్ధీకరిస్తుంది. వైద్యుడే చివరి క్లినికల్ నిర్ణేతగా ఉంటారు.",
    listenTitle: "01 · వినడం",
    listenDesc: "రోగి-తొలి ప్రాధాన్యత",
    listenSub: "టెక్స్ట్ లేదా వాయిస్ ద్వారా ఒకసారికి ఒక సులభమైన ప్రశ్న.",
    structureTitle: "02 · నిర్మాణం",
    structureDesc: "లక్షణాల ఆధారిత ప్రశ్నలు",
    structureSub: "విభిన్న లక్షణాలు విభిన్నమైన సంబంధిత ప్రశ్నలకు దారితీస్తాయి.",
    protectTitle: "03 · రక్షణ",
    protectDesc: "గోప్యతా రక్షణ",
    protectSub: "సందర్శన ముగియగానే డాక్టర్ యాక్సెస్ వెంటనే రద్దవుతుంది.",
    footerNote: "ప్రోటోటైప్ సింథటిక్ పేషెంట్ డేటాను మాత్రమే ఉపయోగిస్తుంది. PatiNote స్వయంప్రతిపత్తితో నిర్ధారణ లేదా ప్రిస్క్రిప్షన్ చేయదు.",

    patientWelcome: "స్వాగతం",
    patientSub: "మీ PatiNote AI-సహకార బహుభాషా రోగి కేస్ వర్క్‌స్పేస్",
    bookNewConsultation: "+ కొత్త సంప్రదింపు బుక్ చేయండి",
    consultationHistory: "మీ పూర్వ సంప్రదింపులు",
    consultationHistoryDesc: "మీ గత సందర్శనల నుండి పూర్తి క్లినికల్ సారాంశాలు, డాక్టర్ నోట్స్ మరియు ప్రిస్క్రిప్షన్‌లను చూడండి.",
    consultationNo: "సంప్రదింపు సంఖ్య",
    dateOfConsultation: "సంప్రదింపు తేదీ",
    viewCaseSummary: "📜 కేస్ సారాంశం చూడండి",
    downloadPrescription: "📥 ప్రిస్క్రిప్షన్ ఫైల్ డౌన్‌లోడ్ చేయండి",
    printSavePdf: "🖨 ప్రింట్ / పిడిఎఫ్ సేవ్ చేయండి",

    aiCaseTaking: "AI కేస్ తీసుకోవడం",
    textAndVoice: "టెక్స్ట్ & వాయిస్",
    questionCount: "ప్రశ్న",
    textVoiceDesc: "ప్రశ్న టెక్స్ట్ మరియు వాయిస్ రెండింటిలోనూ ఇవ్వబడుతుంది. మీరు టైప్ చేయవచ్చు లేదా మాట్లాడవచ్చు.",
    readAloudBtn: "🔊 బిగ్గరగా చదవండి (వాయిస్)",
    textareaPlaceholder: "మీ సమాధానాన్ని ఇక్కడ టైప్ చేయండి లేదా వాయిస్ ద్వారా సమాధానం చెప్పడానికి 'సమాధానం చెప్పండి' క్లిక్ చేయండి...",
    speakAnswerBtn: "🎤 సమాధానం చెప్పండి (వాయిస్ ఇన్పుట్)",
    stopListeningBtn: "⏹ వినడం ఆపండి",
    continueBtn: "ముందుకు సాగండి",
    listeningStatus: "వింటున్నాము… స్పష్టంగా మాట్లాడండి:",
    voiceCaptured: "వాయిస్ రికార్డ్ చేయబడింది. కొనసాగించే ముందు సమీక్షించండి.",
    voiceNotSupported: "ఈ బ్రౌజర్‌లో వాయిస్ గుర్తింపు మద్దతు లేదు. దయచేసి టైప్ చేయండి.",
    voiceError: "మీ వాయిస్ అర్థం కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి లేదా టైప్ చేయండి.",
    pleaseProvideAnswer: "కొనసాగించే ముందు దయచేసి సమాధానం టైప్ చేయండి లేదా మాట్లాడండి.",

    newConsultationTitle: "మీ వైద్య బృందం & సంప్రదింపు తేదీని ఎంచుకోండి",
    hospitalLabel: "ఆసుపత్రి",
    departmentLabel: "విభాగం",
    doctorLabel: "వైద్యుడు",
    dateLabel: "సంప్రదింపు తేదీ (క్యాలెండర్)",
    requestConsultationBtn: "సంప్రదింపు అభ్యర్థించండి",
    cancelBtn: "రద్దు చేయండి",

    step1Title: "మీరు PatiNote తో ఏ భాషలో మాట్లాడాలనుకుంటున్నారు?",
    step1Sub: "AI ప్రశ్నలు మరియు వాయిస్ గుర్తింపు మీరు ఎంచుకున్న భాషను ఉపయోగిస్తాయి.",
    consentText: "ఇది AI ఆధారిత కేస్ సేకరణ సాధనమని మరియు వైద్యుడే తుది నిర్ణయాలు తీసుకుంటారని నేను అర్థం చేసుకున్నాను.",
    continueSecurely: "సురక్షితంగా కొనసాగించండి"
  }
};

const clientTranslations = {
  en: {
    chief: "What problem are you experiencing today?",
    onset: "When did this problem start?",
    location: "Where exactly do you feel the problem?",
    severity: "How severe is it on a scale from 1 to 10?",
    radiation: "Does the pain spread to your arm, shoulder, jaw, back, or another area?",
    breathing: "Are you experiencing breathing difficulty, sweating, dizziness, or nausea?",
    associated: "What other symptoms are you experiencing?",
    food: "Does the problem become better or worse after eating?",
    vomiting: "Have you experienced vomiting, diarrhea, or constipation?",
    fever: "Do you have fever or chills?",
    past: "Do you have any previous medical conditions or previous episodes of this problem?",
    medicines: "Are you currently taking any medicines?",
    allergies: "Do you have any medicine or food allergies?"
  },
  hi: {
    chief: "आज आपको किस मुख्य स्वास्थ्य समस्या या बीमारी का सामना करना पड़ रहा है?",
    onset: "यह समस्या कब और कैसे शुरू हुई?",
    location: "आपको यह दर्द या समस्या शरीर के किस हिस्से में महसूस हो रही है?",
    severity: "1 से 10 के पैमाने पर यह दर्द या तकलीफ कितनी तीव्र है?",
    radiation: "क्या यह दर्द आपके हाथ, कंधे, जबड़े, पीठ या शरीर के किसी अन्य हिस्से में फैलता है?",
    breathing: "क्या आपको सांस लेने में तकलीफ, पसीना आना, चक्कर या घबराहट हो रही है?",
    associated: "इसके अलावा आपको और कौन-कौन से अन्य लक्षण महसूस हो रहे हैं?",
    food: "क्या खाना खाने के बाद यह समस्या बढ़ती है या कम होती है?",
    vomiting: "क्या आपको उल्टी, दस्त, जी मिचलाना या कब्ज की शिकायत है?",
    fever: "क्या आपको बुखार, ठंड लगना या कंपकंपी महसूस हो रही है?",
    past: "क्या आपको पहले से कोई बीमारी (जैसे बीपी, शुगर) है या यह समस्या पहले भी हुई है?",
    medicines: "क्या आप वर्तमान में नियमित रूप से कोई दवाएं ले रहे हैं?",
    allergies: "क्या आपको किसी दवा, भोजन या अन्य चीज से एलर्जी है?"
  },
  te: {
    chief: "ఈ రోజు మీరు ఎదుర్కొంటున్న ప్రధాన ఆరోగ్య సమస్య ఏమిటి?",
    onset: "ఈ సమస్య ఎప్పుడు మరియు ఎలా ప్రారంభమైంది?",
    location: "మీకు ఈ నొప్పి లేదా సమస్య శరీరంలోని ఏ భాగంలో అనిపిస్తుంది?",
    severity: "1 నుండి 10 వరకు ఈ నొప్పి లేదా తీవ్రత ఎంత ఎక్కువగా ఉంది?",
    radiation: "ఈ నొప్పి మీ చెయ్యి, భుజం, దవడ, వెన్ను లేదా మరే ఇతర భాగాలకి వ్యాపిస్తుందా?",
    breathing: "మీకు శ్వాస తీసుకోవడంలో ఇబ్బంది, చెమటలు పట్టడం, తల తిరగడం లేదా గుండెదడ ఉందా?",
    associated: "దీనితో పాటు మీకు ఇంకా ఏ ఇతర లక్షణాలు కనిపిస్తున్నాయి?",
    food: "ఆహారం తిన్న తర్వాత ఈ సమస్య పెరుగుతుందా లేదా తగ్గుతుందా?",
    vomiting: "మీకు వాంతులు, విరేచనాలు, వికారం లేదా మలబద్ధకం ఉన్నాయా?",
    fever: "మీకు జ్వరం, చలి లేదా వణుకు వస్తున్నాయా?",
    past: "మీకు గతంలో ఏవైనా వ్యాధులు (బిపి, షుగర్ వంటివి) ఉన్నాయా లేదా ఈ సమస్య గతంలో వచ్చిందా?",
    medicines: "మీరు ప్రస్తుతం క్రమం తప్పకుండా ఏవైనా మందులు వాడుతున్నారా?",
    allergies: "మీకు ఏదైనా మందు, ఆహారం లేదా ఇతర పదార్థాలతో అలర్జీ ఉందా?"
  }
};

const esc = value =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

async function api(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}`, "x-session-token": token } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    credentials: "include",
    headers,
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

function selectStartLanguage(lang) {
  selectedLanguage = lang;
  localStorage.setItem("preferred_language", lang);
  if (patientConsultation) {
    patientConsultation.language = lang;
  }
  if (!me) {
    renderLanding();
  } else {
    route();
  }
}

function nav() {
  return `
    <nav class="navbar">
      <div class="brand" onclick="me ? route() : renderLanding()" style="cursor:pointer">
        <div class="brand-mark">✚</div>
        <div>
          <div style="font-size:19px;font-weight:800;letter-spacing:-0.5px;color:var(--blue)">CAREPATH AI</div>
          <div style="font-size:10px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase">Autonomous Clinical Triage</div>
        </div>
      </div>
      <div class="nav-actions">
        <div class="user-badge" style="gap:2px;padding:3px 8px">
          <span style="font-size:11px;font-weight:700;color:var(--muted);margin-right:4px">🌐</span>
          <button class="btn btn-ghost" style="min-height:26px;padding:2px 6px;font-size:11px;${selectedLanguage==='en'?'font-weight:800;color:var(--blue);background:#e0f2fe':''}" onclick="selectStartLanguage('en')">EN</button>
          <button class="btn btn-ghost" style="min-height:26px;padding:2px 6px;font-size:11px;${selectedLanguage==='hi'?'font-weight:800;color:var(--blue);background:#e0f2fe':''}" onclick="selectStartLanguage('hi')">हिन्दी</button>
          <button class="btn btn-ghost" style="min-height:26px;padding:2px 6px;font-size:11px;${selectedLanguage==='te'?'font-weight:800;color:var(--blue);background:#e0f2fe':''}" onclick="selectStartLanguage('te')">తెలుగు</button>
        </div>
        <button class="btn btn-ghost" style="font-size:12px;font-weight:700;color:var(--blue);padding:6px 12px;border:1px solid #bae6fd;background:#f0f9ff" onclick="renderCaseQueue('ALL')">
          📋 Case Queue
        </button>
        ${
          me
            ? `
                <div class="user-badge">
                  <span style="color:var(--blue)">👤</span>
                  <span>${esc(me.name)}</span>
                  <span class="status ${me.role === 'DOCTOR' ? 'active' : 'warning'}" style="margin-left:4px;font-size:11px;padding:2px 8px">${esc(me.role)}</span>
                </div>
                <button class="btn btn-outline" onclick="logout()">Logout</button>
            `
            : `
                <button class="btn btn-outline" style="font-size:12px;padding:6px 12px" onclick="renderLogin('PATIENT')">Sign In</button>
              `
        }
      </div>
    </nav>
  `;
}

function layout(content) {
  root.innerHTML = `<div class="shell">${nav()}${content}</div>`;
  const mainEl = root.querySelector("main");
  if (mainEl && !mainEl.id) {
    mainEl.id = "main-content";
    mainEl.setAttribute("tabindex", "-1");
  }
}

function showError(error) {
  const element = document.querySelector("[data-error]");
  if (element) element.innerHTML = `<div class="error">⚠️ ${esc(error.message || error)}</div>`;
  else alert(error.message || error);
}

async function boot() {
  try {
    const response = await api("/api/me");
    me = response.user;
    await route();
  } catch {
    renderLanding();
  }
}

async function route() {
  if (!me) return renderLanding();

  if (me.role === "PATIENT") return renderPatient();
  if (me.role === "DOCTOR") return renderDoctor();
  if (me.role === "ADMIN") return renderAdmin();
}

function normalizeRiskLevel(level) {
  if (!level) return "ROUTINE";
  const s = String(level).trim().toUpperCase();
  if (s.includes("HIGH") || s.includes("EMERG") || s.includes("CRITICAL") || s.includes("RED")) return "HIGH";
  if (s.includes("URGENT") || s.includes("MODERATE") || s.includes("YELLOW") || s.includes("AMBER")) return "URGENT";
  return "ROUTINE";
}

let homeOverviewCache = { total: 0, routine: 0, urgent: 0, high: 0 };
let currentCaseQueueFilter = "ALL";
let cachedCases = [];

async function loadHomeOverview() {
  try {
    const res = await api("/api/cases/overview");
    homeOverviewCache = res;
    const elT = document.getElementById("homeStatTotal");
    const elR = document.getElementById("homeStatRoutine");
    const elU = document.getElementById("homeStatUrgent");
    const elH = document.getElementById("homeStatHigh");
    if (elT) elT.innerText = res.total;
    if (elR) elR.innerText = res.routine;
    if (elU) elU.innerText = res.urgent;
    if (elH) elH.innerText = res.high;
  } catch (err) {
    // Keep cache
  }
}

async function launchAutonomousDemo(scenario) {
  try {
    const res = await api("/api/demo/simulate", {
      method: "POST",
      body: JSON.stringify({ scenario })
    });

    const c = res.consultation;
    const targetPriority = normalizeRiskLevel(c.priority);
    loadHomeOverview();

    // Directly navigate to Case Queue filtered by the simulated priority:
    renderCaseQueue(targetPriority, {
      toast: `Autonomous Simulation Completed: Case created for ${c.patientName} (${targetPriority}) with OTP: ${res.otp}. Suggested Dept: ${c.suggestedDepartment || c.department}.`
    });
  } catch (err) {
    showError(err);
  }
}

function renderLanding() {
  const t = uiText[selectedLanguage] || uiText.en;

  layout(`
    <main class="page">
      <!-- Hackathon Autonomous Demo Bar -->
      <section class="demo-bar">
        <div>
          <span style="font-size:10px;font-weight:800;letter-spacing:1px;background:rgba(255,255,255,0.25);padding:2px 8px;border-radius:4px;display:inline-block;margin-bottom:4px">
            HACKATHON TRACK: INTELLIGENT SYSTEMS & AUTONOMOUS COMPUTING
          </span>
          <div style="font-weight:800;font-size:16px">🚀 Try Autonomous Demo Scenarios</div>
          <div style="font-size:12px;opacity:0.9">Run the real autonomous pipeline (Observe → Reason → Decide → Act) in 1-click:</div>
        </div>
        <div class="demo-btn-group">
          <button class="btn-demo" onclick="launchAutonomousDemo('routine')">🟢 Routine (Cold/Cough)</button>
          <button class="btn-demo" onclick="launchAutonomousDemo('urgent')">🟠 Urgent (Fever/Weakness)</button>
          <button class="btn-demo" onclick="launchAutonomousDemo('high-priority')" style="background:#ef4444;border-color:#fca5a5">🔴 High Priority (Chest Discomfort)</button>
        </div>
      </section>

      <!-- Real-Time Dynamic Priority Stratification Overview Cards -->
      <section style="margin-bottom:28px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
          <div>
            <div class="eyebrow" style="color:var(--blue);letter-spacing:1px">REAL-TIME CLINICAL TRIAGE STATUS</div>
            <h2 style="margin:2px 0 0;font-size:20px;color:var(--ink)">Autonomous Priority Stratification & Queue</h2>
          </div>
          <button class="btn btn-outline" style="font-size:12px;padding:6px 14px" onclick="renderCaseQueue('ALL')">
            Open Full Case Queue &rarr;
          </button>
        </div>

        <div class="grid-4" id="homePriorityGrid" style="gap:14px">
          <div class="card stat-card blue" style="cursor:pointer;padding:18px;transition:box-shadow 0.2s" onclick="renderCaseQueue('ALL')">
            <span class="stat-label">TOTAL CASES</span>
            <strong class="stat-value" id="homeStatTotal">${homeOverviewCache.total}</strong>
            <span class="stat-desc">View all intake records &rarr;</span>
          </div>
          <div class="card stat-card green" style="cursor:pointer;padding:18px;border-left:4px solid #10b981;transition:box-shadow 0.2s" onclick="renderCaseQueue('ROUTINE')">
            <span class="stat-label" style="color:#10b981">ROUTINE CARE</span>
            <strong class="stat-value" style="color:#10b981" id="homeStatRoutine">${homeOverviewCache.routine}</strong>
            <span class="stat-desc">Standard queue filter &rarr;</span>
          </div>
          <div class="card stat-card orange" style="cursor:pointer;padding:18px;border-left:4px solid #f59e0b;transition:box-shadow 0.2s" onclick="renderCaseQueue('URGENT')">
            <span class="stat-label" style="color:#f59e0b">URGENT PRIORITY</span>
            <strong class="stat-value" style="color:#f59e0b" id="homeStatUrgent">${homeOverviewCache.urgent}</strong>
            <span class="stat-desc">Prompt triage filter &rarr;</span>
          </div>
          <div class="card stat-card purple" style="cursor:pointer;padding:18px;border-left:4px solid #ef4444;transition:box-shadow 0.2s" onclick="renderCaseQueue('HIGH')">
            <span class="stat-label" style="color:#ef4444">HIGH PRIORITY</span>
            <strong class="stat-value" style="color:#ef4444" id="homeStatHigh">${homeOverviewCache.high}</strong>
            <span class="stat-desc">Immediate escalation filter &rarr;</span>
          </div>
        </div>
      </section>

      <section class="card" style="margin-bottom:28px;background:linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);border:1.5px solid #bae6fd;box-shadow:var(--shadow-md);padding:22px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">
          <div>
            <div class="eyebrow" style="color:var(--blue);letter-spacing:1px">🌐 MULTILINGUAL CASE TAKING / बहुभाषी केस लेना / బహుభాషా కేస్ స్వీకరణ</div>
            <h2 style="margin:4px 0 0;font-size:20px;color:var(--ink)">${t.selectLangTitle}</h2>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap" id="startLangSelector">
            <button class="btn ${selectedLanguage === 'en' ? 'btn-primary' : 'btn-outline'}" onclick="selectStartLanguage('en')">
              🇬🇧 English ${selectedLanguage === 'en' ? '✓' : ''}
            </button>
            <button class="btn ${selectedLanguage === 'hi' ? 'btn-primary' : 'btn-outline'}" onclick="selectStartLanguage('hi')">
              🇮🇳 हिन्दी (Hindi) ${selectedLanguage === 'hi' ? '✓' : ''}
            </button>
            <button class="btn ${selectedLanguage === 'te' ? 'btn-primary' : 'btn-outline'}" onclick="selectStartLanguage('te')">
              🇮🇳 తెలుగు (Telugu) ${selectedLanguage === 'te' ? '✓' : ''}
            </button>
          </div>
        </div>
      </section>

      <section class="hero">
        <div>
          <div class="eyebrow">CAREPATH AI · ${selectedLanguage === 'te' ? 'తెలుగు' : selectedLanguage === 'hi' ? 'हिन्दी' : 'English'}</div>
          <h1>Autonomous Patient Case-Taking & <span>Clinical Triage</span></h1>
          <p>
            An autonomous pre-consultation agent that continuously observes patient responses, determines what information is missing, dynamically chooses the next question, assesses preliminary risk, prioritizes the case, and prepares a structured case sheet for human clinical review.
          </p>
          <div class="feature-row">
            <span class="pill">Autonomous Questioning</span>
            <span class="pill">Risk Urgency Escalation</span>
            <span class="pill">Department Routing</span>
            <span class="pill">Doctor Decision-Support</span>
          </div>
          <div class="nav-actions">
            <button class="btn btn-primary" onclick="renderLogin('PATIENT')">
              ${t.patientPortalBtn}
            </button>
            <button class="btn btn-outline" onclick="renderLogin('DOCTOR')">
              ${t.doctorPortalBtn}
            </button>
          </div>
        </div>
        <div class="hero-card">
          <img src="/hero_medical_ai.jpg" alt="CarePath AI Medical Triage" class="hero-img" />
          <h2>AI-supported, physician-led clinical care</h2>
          <p class="muted">The AI autonomously gathers and structures clinical parameters. The qualified medical doctor remains the final decision-maker.</p>
        </div>
      </section>

      <!-- 3 Key Value Propositions -->
      <section class="grid-3" style="margin-top:28px">
        <div class="card">
          <div class="eyebrow" style="color:var(--blue)">01 · AUTONOMOUS INTERVIEW</div>
          <h3>Dynamic Question Selection</h3>
          <p class="muted">No rigid static surveys. The system identifies missing clinical entities after every answer and asks only the most relevant follow-up.</p>
        </div>
        <div class="card">
          <div class="eyebrow" style="color:var(--orange)">02 · CLINICAL RISK AWARENESS</div>
          <h3>Preliminary Urgency Stratification</h3>
          <p class="muted">Potential warning signs immediately escalate cases to Routine, Urgent, or High Priority, notifying attending staff without delaying care.</p>
        </div>
        <div class="card">
          <div class="eyebrow" style="color:var(--green)">03 · AUDITABLE DECISION TRACE</div>
          <h3>Explainable Autonomous Loop</h3>
          <p class="muted">Every observation, entity extraction, and routing decision is transparently recorded in an auditable trace for clinician review.</p>
        </div>
      </section>

      <!-- How it Works Autonomous Pipeline -->
      <section class="card" style="margin-top:28px;background:#ffffff">
        <div class="eyebrow">AUTONOMOUS COMPUTING PIPELINE · HOW IT WORKS</div>
        <h2 style="margin-bottom:18px">The Autonomous Decision & Triage Loop</h2>
        <div class="grid-4" style="gap:14px">
          <div style="padding:14px;background:#f8fafc;border-radius:10px;border-left:3px solid var(--blue)">
            <strong style="color:var(--blue);display:block;margin-bottom:4px">1. OBSERVE</strong>
            <span style="font-size:13px;color:var(--muted)">Patient speaks or types their chief health concern in English, Hindi, or Telugu.</span>
          </div>
          <div style="padding:14px;background:#f8fafc;border-radius:10px;border-left:3px solid var(--indigo)">
            <strong style="color:var(--indigo);display:block;margin-bottom:4px">2. ANALYZE & EXTRACT</strong>
            <span style="font-size:13px;color:var(--muted)">Symptom extraction engine captures onset, duration, severity, location, and history.</span>
          </div>
          <div style="padding:14px;background:#f8fafc;border-radius:10px;border-left:3px solid var(--orange)">
            <strong style="color:var(--orange);display:block;margin-bottom:4px">3. DECIDE & ACT</strong>
            <span style="font-size:13px;color:var(--muted)">System evaluates missing info, picks the next best question, or halts for emergency triage.</span>
          </div>
          <div style="padding:14px;background:#f8fafc;border-radius:10px;border-left:3px solid var(--green)">
            <strong style="color:var(--green);display:block;margin-bottom:4px">4. ROUTE & REVIEW</strong>
            <span style="font-size:13px;color:var(--muted)">Case sheet generated, department suggested, and physician reviews with override capabilities.</span>
          </div>
        </div>
      </section>

      <p class="footer-note">
        This prototype is designed for demonstration and decision-support purposes only. It does not provide medical diagnosis and does not replace evaluation by a qualified healthcare professional.
      </p>
    </main>
  `);

  loadHomeOverview();
}

/* ------------------------------------------------------------------ */
/* Case Queue & Case Details Views                                    */
/* ------------------------------------------------------------------ */

async function renderCaseQueue(filterRisk = "ALL", options = {}) {
  currentCaseQueueFilter = filterRisk;

  layout(`
    <main class="page">
      <div id="queueToastArea">
        ${options.toast ? `
          <div style="background:#ecfdf5;border:1.5px solid #6ee7b7;color:#065f46;padding:12px 18px;border-radius:10px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:14px;font-weight:700">⚡ ${esc(options.toast)}</div>
            <button class="btn btn-ghost" style="padding:2px 8px;font-size:12px;color:#065f46" onclick="this.parentElement.remove()">✕</button>
          </div>
        ` : ""}
      </div>

      <div class="dashboard-header" style="margin-bottom:20px">
        <div>
          <div class="eyebrow" style="color:var(--blue)">CLINICAL DECISION-SUPPORT & TRIAGE</div>
          <h1>Autonomous Clinical Case Queue</h1>
          <p class="muted">Live cases categorized by autonomous clinical urgency stratification. Physician remains the final diagnostic and prescribing authority.</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <button class="btn btn-ghost" onclick="renderLanding()">← Back to Home</button>
          ${me && me.role === 'DOCTOR' ? `
            <button class="btn btn-outline" onclick="renderDoctor()">🩺 Doctor Console</button>
          ` : `
            <button class="btn btn-primary" onclick="renderLogin('PATIENT')">+ New Patient Intake</button>
          `}
        </div>
      </div>

      <!-- Priority Filter Bar -->
      <section class="card" style="margin-bottom:24px;padding:16px 20px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:12px;font-weight:800;color:var(--muted);margin-right:4px">FILTER BY URGENCY:</span>
            <button class="btn ${currentCaseQueueFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}" style="padding:6px 14px;font-size:13px" onclick="renderCaseQueue('ALL')">
              All Cases <span id="queueCountAll" style="font-size:11px;opacity:0.85"></span>
            </button>
            <button class="btn ${currentCaseQueueFilter === 'HIGH' ? 'btn-primary' : 'btn-outline'}" style="padding:6px 14px;font-size:13px;${currentCaseQueueFilter === 'HIGH' ? 'background:#ef4444;border-color:#ef4444' : 'color:#ef4444'}" onclick="renderCaseQueue('HIGH')">
              🔴 High Priority <span id="queueCountHigh" style="font-size:11px;opacity:0.85"></span>
            </button>
            <button class="btn ${currentCaseQueueFilter === 'URGENT' ? 'btn-primary' : 'btn-outline'}" style="padding:6px 14px;font-size:13px;${currentCaseQueueFilter === 'URGENT' ? 'background:#f59e0b;border-color:#f59e0b' : 'color:#f59e0b'}" onclick="renderCaseQueue('URGENT')">
              🟠 Urgent <span id="queueCountUrgent" style="font-size:11px;opacity:0.85"></span>
            </button>
            <button class="btn ${currentCaseQueueFilter === 'ROUTINE' ? 'btn-primary' : 'btn-outline'}" style="padding:6px 14px;font-size:13px;${currentCaseQueueFilter === 'ROUTINE' ? 'background:#10b981;border-color:#10b981' : 'color:#10b981'}" onclick="renderCaseQueue('ROUTINE')">
              🟢 Routine <span id="queueCountRoutine" style="font-size:11px;opacity:0.85"></span>
            </button>
          </div>

          <div style="display:flex;gap:8px;align-items:center">
            <span style="font-size:11px;font-weight:700;color:var(--muted)">Quick Test Simulation:</span>
            <button class="btn btn-secondary" style="font-size:11px;padding:4px 8px" onclick="launchAutonomousDemo('routine')">+ Routine</button>
            <button class="btn btn-secondary" style="font-size:11px;padding:4px 8px" onclick="launchAutonomousDemo('urgent')">+ Urgent</button>
            <button class="btn btn-secondary" style="font-size:11px;padding:4px 8px" onclick="launchAutonomousDemo('high-priority')">+ High Priority</button>
          </div>
        </div>
      </section>

      <!-- Case Content Container -->
      <div id="caseQueueContent">
        <div style="text-align:center;padding:40px 0;color:var(--muted)">
          <div style="font-size:24px;margin-bottom:8px">⏳</div>
          Loading real-time clinical triage cases...
        </div>
      </div>
    </main>
  `);

  try {
    const [casesRes, overviewRes] = await Promise.all([
      api(`/api/cases${filterRisk !== "ALL" ? `?riskLevel=${filterRisk}` : ""}`),
      api("/api/cases/overview")
    ]);

    // Update filter counts
    const elA = document.getElementById("queueCountAll");
    const elH = document.getElementById("queueCountHigh");
    const elU = document.getElementById("queueCountUrgent");
    const elR = document.getElementById("queueCountRoutine");
    if (elA) elA.innerText = `(${overviewRes.total})`;
    if (elH) elH.innerText = `(${overviewRes.high})`;
    if (elU) elU.innerText = `(${overviewRes.urgent})`;
    if (elR) elR.innerText = `(${overviewRes.routine})`;

    const cases = casesRes.cases || [];
    cachedCases = cases;

    const contentDiv = document.getElementById("caseQueueContent");
    if (!contentDiv) return;

    if (!cases.length) {
      contentDiv.innerHTML = `
        <div class="card" style="text-align:center;padding:48px 24px">
          <div style="font-size:42px;margin-bottom:12px">📋</div>
          <h2 style="font-size:20px;margin-bottom:6px">No cases found in this priority category</h2>
          <p class="muted" style="max-width:440px;margin:0 auto 20px">
            There are currently no patient consultations categorized as <strong>${esc(filterRisk)}</strong> in the database.
          </p>
          <div style="display:flex;gap:10px;justify-content:center">
            <button class="btn btn-primary" onclick="launchAutonomousDemo('${filterRisk === 'HIGH' ? 'high-priority' : filterRisk === 'URGENT' ? 'urgent' : 'routine'}')">
              Simulate ${esc(filterRisk)} Patient Case
            </button>
            <button class="btn btn-outline" onclick="renderCaseQueue('ALL')">
              View All Cases
            </button>
          </div>
        </div>
      `;
      return;
    }

    contentDiv.innerHTML = `
      <div style="display:grid;gap:16px">
        ${cases.map(c => `
          <div class="card" style="border-left:5px solid ${c.priority === 'HIGH' ? '#ef4444' : c.priority === 'URGENT' ? '#f59e0b' : '#10b981'};transition:box-shadow 0.2s">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
              <div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap">
                  <strong style="font-size:18px;color:var(--ink)">${esc(c.patientName)}</strong>
                  ${c.age ? `<span class="pill" style="margin:0;font-size:11px">${esc(c.age)} yrs · ${esc(c.gender || 'Unknown')}</span>` : ""}
                  <span class="priority-badge ${c.priority ? c.priority.toLowerCase() : 'routine'}" style="font-size:11px;padding:3px 10px">
                    ${esc(c.priority)}
                  </span>
                  <span class="pill" style="margin:0;font-size:11px;background:#e0f2fe;color:var(--blue);border-color:#bae6fd">
                    🏥 ${esc(c.suggestedDepartment)}
                  </span>
                  <span class="status ${c.state === 'COMPLETED' ? 'active' : 'warning'}" style="font-size:11px">
                    ${esc(c.state.replaceAll('_', ' '))}
                  </span>
                </div>
                <div style="font-size:14px;color:#334155;margin-bottom:8px">
                  <span style="font-weight:700;color:var(--ink)">Chief Complaint:</span> “${esc(c.chiefComplaint)}”
                </div>
                <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--muted)">
                  <span>Case ID: <strong>${esc(c.displayId || c.id)}</strong></span>
                  <span>Assigned: <strong>${esc(c.doctorName)}</strong></span>
                  ${c.indicatorsCount ? `<span style="color:#e11d48;font-weight:700">⚠️ ${c.indicatorsCount} risk indicators</span>` : ""}
                  ${c.hasVitals ? `<span style="color:var(--blue);font-weight:700">🩺 Vitals recorded</span>` : ""}
                  <span>Date: ${esc(new Date(c.createdAt).toLocaleDateString())}</span>
                </div>
              </div>

              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <button class="btn btn-outline" style="font-size:13px;padding:8px 16px" onclick="renderCaseDetail('${c.id}')">
                  👁️ View Case Sheet
                </button>
                <button class="btn btn-primary" style="font-size:13px;padding:8px 16px" onclick="openDoctorReview('${c.id}')">
                  🩺 Doctor Review
                </button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  } catch (err) {
    const contentDiv = document.getElementById("caseQueueContent");
    if (contentDiv) {
      contentDiv.innerHTML = `
        <div class="card" style="text-align:center;padding:36px;border:1px solid #fecaca;background:#fef2f2">
          <div style="color:#dc2626;font-size:16px;font-weight:700;margin-bottom:8px">Failed to load case queue</div>
          <p class="muted" style="margin-bottom:16px">${esc(err.message || err)}</p>
          <button class="btn btn-outline" onclick="renderCaseQueue('${filterRisk}')">Retry Loading</button>
        </div>
      `;
    }
  }
}

async function renderCaseDetail(caseId) {
  layout(`
    <main class="page">
      <div id="caseDetailLoading" style="text-align:center;padding:60px 0;color:var(--muted)">
        <div style="font-size:28px;margin-bottom:10px">⏳</div>
        Loading clinical case sheet & decision trace...
      </div>
    </main>
  `);

  try {
    const res = await api(`/api/cases/${caseId}`);
    const c = res.case;

    layout(`
      <main class="page">
        <!-- Top Navigation -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px">
          <button class="btn btn-ghost" onclick="renderCaseQueue(currentCaseQueueFilter || 'ALL')">
            ← Back to Case Queue
          </button>
          <div style="display:flex;gap:8px;align-items:center">
            <span class="status ${c.state === 'COMPLETED' ? 'active' : 'warning'}">
              STATUS: ${esc(c.state.replaceAll('_', ' '))}
            </span>
            <button class="btn btn-primary" onclick="openDoctorReview('${c.id}')">
              🩺 Open in Doctor Console
            </button>
          </div>
        </div>

        <!-- Case Overview Header -->
        <div class="dashboard-header" style="margin-bottom:20px">
          <div>
            <div class="eyebrow" style="color:var(--blue)">PATIENT CLINICAL CASE SHEET · CASE ID: ${esc(c.displayId || c.id)}</div>
            <h1>${esc(c.patient?.name || "Patient")}</h1>
            <p class="muted">
              ${c.patient?.age ? `${esc(c.patient.age)} years old` : ""} ${c.patient?.gender ? `· ${esc(c.patient.gender)}` : ""}
              · Hospital: ${esc(c.hospital?.name || "CarePath Central")}
              · Attending Doctor: ${esc(c.doctor?.name || "Dr. Sharma")}
            </p>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <span class="priority-badge ${c.priority ? c.priority.toLowerCase() : 'routine'}" style="font-size:14px;padding:6px 16px">
              ${esc(c.priority)} PRIORITY
            </span>
            <span style="font-size:12px;color:var(--muted)">Assigned Dept: <strong>${esc(c.suggestedDepartment || c.department)}</strong></span>
          </div>
        </div>

        <!-- Clinician Review & Triage Override Card -->
        <section class="card" style="margin-bottom:24px;background:linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);border:1.5px solid var(--border);border-left:6px solid ${c.priority === 'HIGH' ? '#ef4444' : c.priority === 'URGENT' ? '#f59e0b' : '#10b981'}">
          <div class="eyebrow" style="color:var(--blue)">CLINICIAN DECISION-SUPPORT & TRIAGE OVERRIDE</div>
          <h3 style="margin-bottom:12px">Physician Triage Adjustment</h3>
          <p class="muted" style="margin-bottom:16px;font-size:13px">
            The AI provides initial stratification based on reported warning signs and vitals. The attending physician can review and adjust the clinical priority or department. Changes are saved directly to the database.
          </p>

          <form id="detailOverrideForm" onsubmit="event.preventDefault();submitDetailOverride('${c.id}')" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;align-items:end">
            <div>
              <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px">Urgency Priority Level:</label>
              <select id="detailOverridePriority" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:13px">
                <option value="ROUTINE" ${c.priority === 'ROUTINE' ? 'selected' : ''}>🟢 ROUTINE (Standard Consultation)</option>
                <option value="URGENT" ${c.priority === 'URGENT' ? 'selected' : ''}>🟠 URGENT (Prompt Evaluation)</option>
                <option value="HIGH" ${c.priority === 'HIGH' ? 'selected' : ''}>🔴 HIGH (Immediate Medical Attention)</option>
              </select>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px">Target Department:</label>
              <select id="detailOverrideDept" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:13px">
                ${[
                  "General Medicine",
                  "Emergency / Cardiology",
                  "Cardiology",
                  "Pulmonology",
                  "Gastroenterology",
                  "Neurology",
                  "Pediatrics",
                  "Orthopedics",
                  "Dermatology"
                ].map(d => `<option value="${d}" ${(c.department === d || c.suggestedDepartment === d) ? 'selected' : ''}>${d}</option>`).join("")}
              </select>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px">Clinician Notes / Justification:</label>
              <input id="detailOverrideNotes" placeholder="Reasoning context..." value="${esc(c.doctorFeedback?.feedbackNotes || '')}" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:13px" />
            </div>

            <div>
              <button type="submit" class="btn btn-primary" style="width:100%;padding:9px 16px">
                💾 Save Triage Override
              </button>
            </div>
          </form>

          ${c.doctorFeedback ? `
            <div style="margin-top:12px;padding:8px 12px;background:#f0fdf4;border-radius:6px;font-size:12px;color:#166534">
              ✓ Clinician Review Recorded: Assigned <strong>${esc(c.doctorFeedback.doctorPriority)}</strong> to <strong>${esc(c.doctorFeedback.doctorDepartment)}</strong>
              ${c.doctorFeedback.feedbackNotes ? `· Note: "${esc(c.doctorFeedback.feedbackNotes)}"` : ""}
            </div>
          ` : ""}
        </section>

        <!-- Vitals & Red Flags Grid -->
        <div class="grid-2" style="margin-bottom:24px">
          <!-- Vitals Card -->
          <div class="card">
            <div class="eyebrow" style="color:var(--blue)">PHYSIOLOGICAL VITALS</div>
            <h3>Patient Vital Signs</h3>
            ${c.vitals && Object.keys(c.vitals).length ? `
              <div class="vitals-grid">
                <div class="vitals-box">
                  <span style="font-size:11px;color:var(--muted)">Blood Pressure</span>
                  <strong>${esc(c.vitals.bloodPressure || "--")}</strong>
                </div>
                <div class="vitals-box">
                  <span style="font-size:11px;color:var(--muted)">Heart Rate</span>
                  <strong>${esc(c.vitals.heartRate ? `${c.vitals.heartRate} bpm` : "--")}</strong>
                </div>
                <div class="vitals-box">
                  <span style="font-size:11px;color:var(--muted)">SpO2</span>
                  <strong style="${Number(c.vitals.spo2) < 92 ? 'color:#ef4444' : ''}">${esc(c.vitals.spo2 ? `${c.vitals.spo2}%` : "--")}</strong>
                </div>
                <div class="vitals-box">
                  <span style="font-size:11px;color:var(--muted)">Temperature</span>
                  <strong>${esc(c.vitals.temperature ? `${c.vitals.temperature}°F` : "--")}</strong>
                </div>
              </div>
            ` : `<p class="muted">No objective vitals recorded yet for this case.</p>`}

            <!-- Extracted Clinical Entities Chips -->
            <div style="margin-top:16px;padding-top:12px;border-top:1px solid #f1f5f9">
              <span class="eyebrow">EXTRACTED CLINICAL ENTITIES</span>
              <div style="margin-top:6px">
                ${c.structured?.chiefComplaint?.value ? `<span class="extracted-chip"><strong>Chief:</strong> ${esc(c.structured.chiefComplaint.value)}</span>` : ""}
                ${c.structured?.onset?.value ? `<span class="extracted-chip"><strong>Onset:</strong> ${esc(c.structured.onset.value)}</span>` : ""}
                ${c.structured?.severity?.value ? `<span class="extracted-chip"><strong>Severity:</strong> ${esc(c.structured.severity.value)}/10</span>` : ""}
                ${c.structured?.location?.value ? `<span class="extracted-chip"><strong>Location:</strong> ${esc(c.structured.location.value)}</span>` : ""}
                ${c.structured?.radiation?.value ? `<span class="extracted-chip"><strong>Radiation:</strong> ${esc(c.structured.radiation.value)}</span>` : ""}
                ${c.structured?.breathing?.value ? `<span class="extracted-chip"><strong>Breathing:</strong> ${esc(c.structured.breathing.value)}</span>` : ""}
                ${c.structured?.past?.value ? `<span class="extracted-chip"><strong>History:</strong> ${esc(c.structured.past.value)}</span>` : ""}
              </div>
            </div>
          </div>

          <!-- Risk Indicators & Red Flags Card -->
          <div class="card">
            <div class="eyebrow" style="color:${c.priority === 'HIGH' ? 'var(--red)' : c.priority === 'URGENT' ? 'var(--orange)' : 'var(--green)'}">
              TRIAGE RISK ANALYSIS
            </div>
            <h3>Warning Signs & Risk Evaluation</h3>
            ${c.redFlags && c.redFlags.length ? `
              <div style="margin-bottom:12px">
                ${c.redFlags.map(rf => `
                  <div style="padding:8px 12px;background:#fef2f2;border-left:3px solid #ef4444;border-radius:6px;margin-bottom:6px;font-size:13px;color:#991b1b">
                    ⚠️ <strong>${esc(rf)}</strong>
                  </div>
                `).join("")}
              </div>
            ` : `
              <div style="padding:10px 14px;background:#f0fdf4;border-left:3px solid #10b981;border-radius:6px;margin-bottom:12px;font-size:13px;color:#166534">
                ✓ No acute red flags detected in preliminary screening.
              </div>
            `}

            ${c.riskAssessment?.indicators && c.riskAssessment.indicators.length ? `
              <div class="eyebrow" style="margin-top:10px">CLINICAL INDICATORS</div>
              <ul style="padding-left:18px;margin:4px 0 0;font-size:13px;color:#334155">
                ${c.riskAssessment.indicators.map(ind => `<li>${esc(ind)}</li>`).join("")}
              </ul>
            ` : ""}
          </div>
        </div>

        <!-- Dynamic Interview Transcript & Clinical Summary Grid -->
        <div class="grid-2" style="margin-bottom:24px">
          <!-- Dynamic Q&A Transcript -->
          <div class="card">
            <div class="eyebrow" style="color:var(--indigo)">AUTONOMOUS INTERVIEW TRANSCRIPT</div>
            <h3>Dynamic Q&A History</h3>
            ${c.responses && c.responses.length ? `
              <div style="display:grid;gap:12px;max-height:360px;overflow-y:auto;padding-right:6px">
                ${c.responses.map(r => `
                  <div style="padding:10px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
                    <div style="font-size:11px;font-weight:700;color:var(--blue);margin-bottom:2px">
                      AI ASKED (${esc(r.questionId || 'dynamic')}):
                    </div>
                    <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:6px">
                      ${esc(r.question || clientTranslations.en[r.questionId] || r.questionId)}
                    </div>
                    <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:2px">
                      PATIENT ANSWER (${esc(r.method || 'text')}):
                    </div>
                    <div style="font-size:13px;color:#1e293b;background:#ffffff;padding:6px 10px;border-radius:6px;border:1px solid #e2e8f0">
                      “${esc(r.answer)}”
                    </div>
                  </div>
                `).join("")}
              </div>
            ` : `<p class="muted">No interview responses recorded.</p>`}
          </div>

          <!-- Structured Clinical Summary Sheet -->
          <div class="card">
            <div class="eyebrow" style="color:var(--green)">STRUCTURED CLINICAL SUMMARY</div>
            <h3>Physician Handover Sheet</h3>
            <div style="padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;line-height:1.6;white-space:pre-wrap;max-height:360px;overflow-y:auto;font-family:monospace">
${esc(c.summary || "Summary generation in progress...")}
            </div>
          </div>
        </div>

        <!-- Explainable Autonomous Decision Loop Trace -->
        <section class="card" style="margin-bottom:28px">
          <div class="eyebrow" style="color:var(--blue)">AUDITABLE CLINICAL TRACE</div>
          <h3>Autonomous Decision Loop Trace (Observe → Analyze → Decide → Act)</h3>
          ${c.decisionTrace && c.decisionTrace.length ? `
            <div class="decision-trace" style="margin-top:14px">
              ${c.decisionTrace.map(t => `
                <div class="trace-item ${t.riskLevel === 'HIGH' ? 'high-risk' : ''}">
                  <div class="trace-timestamp">${esc(new Date(t.timestamp).toLocaleTimeString())} · Phase: <strong>${esc(t.step)}</strong></div>
                  <div class="trace-event">${esc(t.event)}</div>
                  <div class="trace-detail">${esc(t.detail)}</div>
                  ${t.action ? `<div class="trace-action">⚡ Action: ${esc(t.action)}</div>` : ""}
                </div>
              `).join("")}
            </div>
          ` : `<p class="muted">No decision trace entries recorded for this case.</p>`}
        </section>
      </main>
    `);
  } catch (err) {
    showError(err);
  }
}

async function submitDetailOverride(caseId) {
  try {
    const priority = document.getElementById("detailOverridePriority").value;
    const department = document.getElementById("detailOverrideDept").value;
    const feedbackNotes = document.getElementById("detailOverrideNotes").value;

    const res = await api(`/api/cases/${caseId}/override`, {
      method: "PATCH",
      body: JSON.stringify({ priority, department, feedbackNotes })
    });

    alert(`✓ Clinician override saved! Case priority updated to ${res.case.priority}.`);
    loadHomeOverview();
    await renderCaseDetail(caseId);
  } catch (err) {
    showError(err);
  }
}

async function openDoctorReview(caseId) {
  doctorConsultationId = caseId;
  // If already logged in as DOCTOR
  if (me && me.role === "DOCTOR") {
    try {
      const caseResult = await api(`/api/doctor/case/${caseId}`);
      doctorCase = caseResult.consultation;
      await renderDoctor();
    } catch {
      openOtp(caseId);
    }
    return;
  }

  // If not logged in as doctor, provide quick demo doctor login or direct case inspection
  const modal = document.createElement("div");
  modal.id = "doctorAccessModal";
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(15,23,42,0.6);display:grid;place-items:center;z-index:999;padding:16px">
      <div class="card" style="max-width:440px;width:100%">
        <div class="eyebrow" style="color:var(--blue)">ATTENDING PHYSICIAN ACCESS</div>
        <h3 style="margin-bottom:8px">Doctor Clinical Review</h3>
        <p class="muted" style="font-size:13px;margin-bottom:18px">
          To perform official prescription writing and consultation sign-off, sign in as an attending physician.
        </p>
        <div style="display:grid;gap:10px">
          <button class="btn btn-primary" onclick="quickDoctorLogin('${caseId}')">
            🩺 Sign in as Dr. Sharma (Demo Doctor)
          </button>
          <button class="btn btn-outline" onclick="document.getElementById('doctorAccessModal').remove();renderCaseDetail('${caseId}')">
            👁️ Inspect Case Sheet (Decision-Support Mode)
          </button>
          <button class="btn btn-ghost" onclick="document.getElementById('doctorAccessModal').remove()">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function quickDoctorLogin(caseId) {
  try {
    const res = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "doctor@patinote.demo",
        password: "Demo@123",
        role: "DOCTOR"
      })
    });
    localStorage.setItem("token", res.token);
    me = res.user;
    const modal = document.getElementById("doctorAccessModal");
    if (modal) modal.remove();

    doctorConsultationId = caseId;
    try {
      const caseResult = await api(`/api/doctor/case/${caseId}`);
      doctorCase = caseResult.consultation;
    } catch {
      doctorCase = null;
    }
    await renderDoctor();
  } catch (err) {
    showError(err);
  }
}

function renderLogin(roleValue = "PATIENT") {
  let currentRole = roleValue;

  function getDemoText(role) {
    if (role === "DOCTOR") return "Demo: doctor@patinote.demo / Demo@123";
    if (role === "ADMIN") return "Demo: admin@patinote.demo / Admin@123";
    return "Sign in to start or manage your consultation.";
  }

  layout(`
    <main class="page auth-wrap">
      <section class="card auth-card">
        <div class="eyebrow" id="authEyebrow">${currentRole} PORTAL · ${selectedLanguage.toUpperCase()}</div>
        <h2 id="authHeading">${currentRole === "PATIENT" ? "Welcome back" : currentRole === "DOCTOR" ? "Doctor Login" : "Admin Console"}</h2>
        <p class="muted" id="authSubtext">${getDemoText(currentRole)}</p>

        <div style="display:flex;gap:8px;margin:15px 0" id="roleSelector">
          <button type="button" class="btn ${currentRole === 'PATIENT' ? 'btn-primary' : 'btn-outline'}" data-role="PATIENT" style="flex:1">Patient</button>
          <button type="button" class="btn ${currentRole === 'DOCTOR' ? 'btn-primary' : 'btn-outline'}" data-role="DOCTOR" style="flex:1">Doctor</button>
          <button type="button" class="btn ${currentRole === 'ADMIN' ? 'btn-primary' : 'btn-outline'}" data-role="ADMIN" style="flex:1">Admin</button>
        </div>

        <div data-error></div>
        <form id="loginForm" class="form-grid">
          <label>Email
            <input id="email" type="email" required placeholder="you@example.com" />
          </label>
          <label>Password
            <input id="password" type="password" required placeholder="Your password" />
          </label>
          <input id="role" type="hidden" value="${currentRole}" />
          <button class="btn btn-primary" style="width:100%;margin-top:10px">Sign in</button>
        </form>
        <div id="authFooter" style="margin-top:15px;display:flex;flex-direction:column;gap:8px">
          ${
            currentRole === "PATIENT"
              ? `<button class="btn btn-ghost" onclick="renderRegister('PATIENT')">Create a patient account</button>`
              : currentRole === "DOCTOR"
                ? `<button class="btn btn-ghost" onclick="renderRegister('DOCTOR')">Create a doctor account</button>`
                : ""
          }
          <button class="btn btn-ghost" onclick="renderLanding()">← Back to home</button>
        </div>
      </section>
    </main>
  `);

  document.querySelectorAll("#roleSelector button").forEach(btn => {
    btn.onclick = () => {
      currentRole = btn.dataset.role;
      document.getElementById("role").value = currentRole;
      document.getElementById("authEyebrow").textContent = `${currentRole} PORTAL · ${selectedLanguage.toUpperCase()}`;
      document.getElementById("authHeading").textContent =
        currentRole === "PATIENT" ? "Welcome back" : currentRole === "DOCTOR" ? "Doctor Login" : "Admin Console";
      document.getElementById("authSubtext").textContent = getDemoText(currentRole);

      document.querySelectorAll("#roleSelector button").forEach(b => {
        b.className = `btn ${b.dataset.role === currentRole ? 'btn-primary' : 'btn-outline'}`;
      });

      const footer = document.getElementById("authFooter");
      footer.innerHTML = `
        ${
          currentRole === "PATIENT"
            ? `<button class="btn btn-ghost" onclick="renderRegister('PATIENT')">Create a patient account</button>`
            : currentRole === "DOCTOR"
              ? `<button class="btn btn-ghost" onclick="renderRegister('DOCTOR')">Create a doctor account</button>`
              : ""
        }
        <button class="btn btn-ghost" onclick="renderLanding()">← Back to home</button>
      `;
    };
  });

  document.getElementById("loginForm").onsubmit = async event => {
    event.preventDefault();

    try {
      const result = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("email").value,
          password: document.getElementById("password").value,
          role: document.getElementById("role").value
        })
      });

      if (result.token) {
        localStorage.setItem("token", result.token);
      }
      me = result.user;
      await route();
    } catch (error) {
      showError(error);
    }
  };
}

async function renderRegister(defaultRole = "PATIENT") {
  let availableHospitals = hospitals;
  if (!availableHospitals || !availableHospitals.length) {
    try {
      const res = await api("/api/hospitals");
      availableHospitals = res.hospitals || [];
    } catch {}
  }

  const isDocDefault = defaultRole === "DOCTOR";

  layout(`
    <main class="page auth-wrap">
      <section class="card auth-card">
        <div class="eyebrow">${defaultRole} REGISTRATION</div>
        <h2>Create account</h2>
        <p class="muted">Fill in your details to create your ${defaultRole.toLowerCase()} account.</p>
        <div data-error></div>
        <form id="registerForm" class="form-grid">
          <label>Role
            <select id="regRole">
              <option value="PATIENT" ${defaultRole === "PATIENT" ? "selected" : ""}>Patient</option>
              <option value="DOCTOR" ${defaultRole === "DOCTOR" ? "selected" : ""}>Doctor</option>
            </select>
          </label>
          <label>Full name
            <input id="name" required placeholder="Full Name" />
          </label>
          <div class="form-row">
            <label>Age
              <input id="age" type="number" min="${isDocDefault ? 18 : 1}" max="120" value="${isDocDefault ? 30 : 25}" required />
              <small id="ageHint" style="color:${isDocDefault ? 'var(--red)' : 'var(--muted)'};font-size:11px;font-weight:600">
                ${isDocDefault ? "⚠️ Minimum age for doctors is 18 years." : ""}
              </small>
            </label>
            <label>Gender
              <select id="gender" required>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
                <option selected>Prefer not to say</option>
              </select>
            </label>
          </div>

          <div id="doctorExtraFields" class="form-grid" style="display:${isDocDefault ? "grid" : "none"};gap:12px;padding:16px;background:rgba(11,107,203,0.04);border:1px solid #bae6fd;border-radius:14px;margin:4px 0">
            <div class="eyebrow" style="margin-bottom:-4px">DOCTOR CREDENTIALS & VERIFICATION</div>
            
            <label>Hospital
              <select id="regHospitalId">
                ${availableHospitals.map(h => `<option value="${h.id}">${esc(h.name)} (${esc(h.city)})</option>`).join("")}
              </select>
            </label>

            <label>Department
              <input id="department" placeholder="e.g. General Medicine, Cardiology" value="General Medicine" />
            </label>

            <label>Medical License / Registration Number
              <input id="licenseNumber" placeholder="e.g. MCI-2024-88392" value="${isDocDefault ? 'MCI-2024-' + Math.floor(10000 + Math.random() * 90000) : ''}" />
            </label>

            <label>Upload Medical License Document (Optional)
              <input id="licenseFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
              <small class="muted">Attach copy of license certificate (optional)</small>
            </label>

            <label>Upload Graduation / Degree Certificate (Optional)
              <input id="graduationCertificate" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
              <small class="muted">Attach copy of MBBS / MD graduation certificate (optional)</small>
            </label>
          </div>

          <label>Email
            <input id="email" type="email" required placeholder="you@example.com" />
          </label>
          <label>Password
            <input id="password" type="password" minlength="6" required placeholder="At least 6 characters" />
          </label>
          <button type="submit" class="btn btn-primary" style="margin-top:10px;width:100%">Create account</button>
        </form>
        <button type="button" class="btn btn-ghost" style="margin-top:10px;width:100%" onclick="renderLogin('${defaultRole}')">Already registered? Sign in</button>
      </section>
    </main>
  `);

  const regRoleSelect = document.getElementById("regRole");
  const doctorExtraFields = document.getElementById("doctorExtraFields");
  const ageInput = document.getElementById("age");
  const ageHint = document.getElementById("ageHint");
  const licenseNumberInput = document.getElementById("licenseNumber");

  regRoleSelect.onchange = e => {
    const isDoc = e.target.value === "DOCTOR";
    doctorExtraFields.style.display = isDoc ? "grid" : "none";
    ageInput.min = isDoc ? "18" : "1";
    if (isDoc && parseInt(ageInput.value, 10) < 18) {
      ageInput.value = "18";
    }
    ageHint.textContent = isDoc ? "⚠️ Minimum age for doctors is 18 years." : "";
    ageHint.style.color = isDoc ? "var(--red)" : "var(--muted)";

    if (licenseNumberInput && isDoc && !licenseNumberInput.value) {
      licenseNumberInput.value = `MCI-2024-${Math.floor(10000 + Math.random() * 90000)}`;
    }
  };

  document.getElementById("registerForm").onsubmit = async event => {
    event.preventDefault();
    const roleValue = regRoleSelect.value;

    try {
      const payload = {
        role: roleValue,
        name: document.getElementById("name").value.trim(),
        age: document.getElementById("age").value,
        gender: document.getElementById("gender").value,
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value
      };

      if (!payload.name || !payload.email || !payload.password) {
        showError("Please enter your name, email, and password.");
        return;
      }

      if (roleValue === "DOCTOR") {
        const ageVal = parseInt(payload.age, 10);
        if (isNaN(ageVal) || ageVal < 18) {
          showError("Doctor registration failed: Minimum age requirement is 18 years.");
          return;
        }

        let licNum = document.getElementById("licenseNumber")?.value.trim();
        if (!licNum) {
          licNum = `MCI-2024-${Math.floor(10000 + Math.random() * 90000)}`;
        }

        const licFileElem = document.getElementById("licenseFile");
        const gradFileElem = document.getElementById("graduationCertificate");

        const licFileName = licFileElem?.files?.[0]?.name || `medical_license_${licNum.toLowerCase()}.pdf`;
        const gradFileName = gradFileElem?.files?.[0]?.name || `mbbs_degree_certificate_${licNum.toLowerCase()}.pdf`;

        payload.department = document.getElementById("department")?.value.trim() || "General Medicine";
        payload.hospitalId = document.getElementById("regHospitalId")?.value || "hospital-1";
        payload.licenseNumber = licNum;
        payload.licenseFile = licFileName;
        payload.graduationCertificate = gradFileName;
      }

      const result = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (result.token) {
        localStorage.setItem("token", result.token);
      }
      me = result.user;
      await route();
    } catch (error) {
      showError(error);
    }
  };
}

async function logout() {
  await api("/api/auth/logout", { method: "POST" }).catch(() => {});
  localStorage.removeItem("token");
  me = null;
  patientConsultation = null;
  allPatientConsultations = [];
  doctorCase = null;
  renderLanding();
}

/* ------------------------------------------------------------------ */
/* Patient portal                                                       */
/* ------------------------------------------------------------------ */

async function renderPatient() {
  const result = await api("/api/patient/consultations");
  allPatientConsultations = result.consultations || [];
  
  patientConsultation = allPatientConsultations.find(c => c.state !== "COMPLETED") || allPatientConsultations[0] || null;

  const hospitalResult = await api("/api/hospitals");
  hospitals = hospitalResult.hospitals;

  const t = uiText[selectedLanguage] || uiText.en;
  const langLabel = selectedLanguage === "te" ? "తెలుగు" : selectedLanguage === "hi" ? "हिन्दी" : "English";

  layout(`
    <main class="page">
      <div class="dashboard-header">
        <div>
          <div class="eyebrow">PATIENT PORTAL · ${langLabel.toUpperCase()}</div>
          <h1>${t.patientWelcome}, ${esc(me.name.split(" ")[0])}</h1>
          <p class="muted">${t.patientSub} (${langLabel})</p>
        </div>
        ${
          !patientConsultation || patientConsultation.state === "COMPLETED"
            ? `<button class="btn btn-primary" onclick="renderBooking()">${t.bookNewConsultation}</button>`
            : ""
        }
      </div>

      ${
        patientConsultation
          ? patientConsultationCard(patientConsultation)
          : emptyPatientState()
      }

      ${patientHistorySection(allPatientConsultations)}
    </main>
  `);
}

function patientHistorySection(consultations) {
  if (!consultations || !consultations.length) return "";
  const t = uiText[selectedLanguage] || uiText.en;

  return `
    <section class="card" style="margin-top:28px">
      <div class="eyebrow">CONSULTATION HISTORY</div>
      <h2>${t.consultationHistory} (${consultations.length})</h2>
      <p class="muted">${t.consultationHistoryDesc}</p>

      <div style="display:grid;gap:14px;margin-top:16px">
        ${consultations.map(c => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:#ffffff;border:1px solid var(--border);border-radius:14px;flex-wrap:wrap;gap:12px">
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
                <strong style="font-size:16px;color:var(--ink)">${t.consultationNo}: ${esc(c.displayId || c.id)}</strong>
                <span class="status ${c.state === 'COMPLETED' ? 'active' : 'warning'}" style="font-size:11px">
                  ${esc(c.state.replaceAll("_", " "))}
                </span>
              </div>
              <div class="muted" style="font-size:13px">
                👨‍⚕️ <strong>${esc(c.doctorName || "Doctor")}</strong> · ${esc(c.department || "")} · ${esc(c.hospitalName || "Hospital")}
              </div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px">
                📅 ${t.dateOfConsultation}: <strong>${c.appointmentDate ? new Date(c.appointmentDate + "T00:00:00").toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : new Date(c.createdAt).toLocaleDateString()}</strong>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-outline" style="font-size:13px;padding:6px 14px" onclick="viewSelectedConsultation('${c.id}')">
                ${t.viewCaseSummary}
              </button>
              <button class="btn btn-primary" style="font-size:13px;padding:6px 14px" onclick="downloadPrescriptionFileById('${c.id}')">
                ${t.downloadPrescription}
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function viewSelectedConsultation(consultationId) {
  const found = allPatientConsultations.find(c => c.id === consultationId);
  if (found) {
    patientConsultation = found;
    renderPatientSummary();
  }
}

function downloadPrescriptionFileById(consultationId) {
  const found = (allPatientConsultations && allPatientConsultations.find(c => c.id === consultationId)) ||
                (typeof doctorCompletedConsultations !== "undefined" && doctorCompletedConsultations && doctorCompletedConsultations.find(c => c.id === consultationId)) ||
                (patientConsultation && patientConsultation.id === consultationId ? patientConsultation : null) ||
                (typeof doctorCase !== "undefined" && doctorCase && doctorCase.id === consultationId ? doctorCase : null);
  if (found) {
    downloadPrescriptionFile(found);
  } else if (patientConsultation) {
    downloadPrescriptionFile(patientConsultation);
  } else if (typeof doctorCase !== "undefined" && doctorCase) {
    downloadPrescriptionFile(doctorCase);
  } else {
    alert("Consultation record not found.");
  }
}

function downloadPrescriptionFile(c) {
  const patientName = me?.name || c.patientName || "Patient";
  const doctorName = c.doctorName || "Doctor";
  const hospitalName = c.hospitalName || "PatiNote Care Hospital";
  const dateStr = c.appointmentDate || new Date(c.updatedAt || c.createdAt || Date.now()).toLocaleDateString();
  const displayId = c.displayId || c.id || "CONSULTATION";

  let content = `================================================================================
PATINOTE HEALTHCARE SYSTEM
OFFICIAL CLINICAL CONSULTATION SUMMARY & PRESCRIPTION RECORD
================================================================================

CONSULTATION RECORD NO. : ${displayId} (Date/Month/Year/SerialNo)
DATE OF CONSULTATION    : ${dateStr}
HOSPITAL                : ${hospitalName}
DEPARTMENT              : ${c.department || "General Medicine"}

--------------------------------------------------------------------------------
PATIENT INFORMATION
--------------------------------------------------------------------------------
Full Name              : ${patientName}
Age                    : ${me?.age || c.patient?.age || "N/A"}
Gender                 : ${me?.gender || c.patient?.gender || "N/A"}

--------------------------------------------------------------------------------
ATTENDING DOCTOR INFORMATION
--------------------------------------------------------------------------------
Doctor Name            : ${doctorName}
Department             : ${c.department || "General Medicine"}

--------------------------------------------------------------------------------
CHIEF COMPLAINT
--------------------------------------------------------------------------------
${c.structured?.chiefComplaint?.value || "Chief complaint recorded during consultation."}

--------------------------------------------------------------------------------
AI STRUCTURED CLINICAL CASE SUMMARY
--------------------------------------------------------------------------------
${c.summary || "Case summary compiled by PatiNote AI assistant."}

--------------------------------------------------------------------------------
DOCTOR'S CLINICAL NOTES & OBSERVATIONS
--------------------------------------------------------------------------------
${c.doctorNotes || "No specific clinical notes added by attending doctor."}

--------------------------------------------------------------------------------
FINAL PRESCRIPTION & MEDICATIONS
--------------------------------------------------------------------------------
`;

  if (c.prescription?.items?.length) {
    c.prescription.items.forEach((item, index) => {
      content += `${index + 1}. ${item.medicine}\n`;
      content += `   Dosage       : ${item.dosage || "As directed"}\n`;
      content += `   Frequency    : ${item.frequency || "Daily"}\n`;
      content += `   Duration     : ${item.duration || "5 days"}\n`;
      if (item.instructions) {
        content += `   Instructions : ${item.instructions}\n`;
      }
      content += `\n`;
    });
  } else {
    content += `No specific medicines prescribed for this consultation.\n\n`;
  }

  if (c.prescription?.instructions) {
    content += `--------------------------------------------------------------------------------
GENERAL PRESCRIPTION INSTRUCTIONS
--------------------------------------------------------------------------------
${c.prescription.instructions}

`;
  }

  content += `================================================================================
VERIFIED BY: Dr. ${doctorName}
PATINOTE AI MULTILINGUAL CASE-TAKING SYSTEM
This document is a certified digital record of your medical consultation.
================================================================================
`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Prescription_${displayId.replaceAll('/', '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function patientConsultationCard(c) {
  const dateFormatted = c.appointmentDate ? new Date(c.appointmentDate + "T00:00:00").toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : new Date(c.createdAt).toLocaleDateString();

  if (c.state === "CASE_TAKING") {
    return `<div id="patientWorkspace">${caseTakingView(c)}</div>`;
  }

  if (c.state === "WAITING_FOR_DOCTOR") {
    return `<div id="patientWorkspace">${waitingView(c)}</div>`;
  }

  if (c.state === "ACTIVE") {
    return `<div id="patientWorkspace">${activePatientView(c)}</div>`;
  }

  if (c.state === "COMPLETED") {
    return `<div id="patientWorkspace">${completedPatientView(c)}</div>`;
  }

  return `
    <div id="patientWorkspace">
      <div class="card">
        <div class="eyebrow">CURRENT CONSULTATION NO. ${esc(c.displayId)}</div>
        <div class="dashboard-header" style="background:transparent;padding:0;box-shadow:none;border:0;margin-bottom:15px">
          <div>
            <h2>${esc(c.doctorName)}</h2>
            <p class="muted">${esc(c.department)} · ${esc(c.hospitalName)} · 📅 Date: <strong>${dateFormatted}</strong></p>
          </div>
          <span class="status warning">${esc(c.state.replaceAll("_", " "))}</span>
        </div>

        <div class="otp">
          <div class="muted">Your consultation OTP</div>
          <div class="otp-number">${esc(c.otp)}</div>
          <p>Share this OTP only with ${esc(c.doctorName)} when requested.</p>
          <small class="muted">Valid for this consultation visit on ${dateFormatted}.</small>
        </div>

        <button class="btn btn-primary" onclick="showLanguageSelection('${c.id}')">
          Start AI case taking (${selectedLanguage.toUpperCase()})
        </button>
      </div>
    </div>
  `;
}

function emptyPatientState() {
  return `
    <div class="card" style="text-align:center;padding:50px 25px">
      <div style="font-size:58px">🌿</div>
      <h2>No active consultation</h2>
      <p class="muted">Book a hospital consultation to begin your private AI-assisted case history.</p>
      <button class="btn btn-primary" onclick="renderBooking()">Book a consultation</button>
    </div>
  `;
}

async function renderBooking() {
  if (!hospitals || !hospitals.length) {
    const res = await api("/api/hospitals");
    hospitals = res.hospitals || [];
  }

  const initialHospital = hospitals[0] || { departments: [] };
  const todayStr = new Date().toISOString().split("T")[0];

  layout(`
    <main class="page">
      <div class="dashboard-header">
        <div>
          <div class="eyebrow">NEW CONSULTATION</div>
          <h1>Choose your care team & consultation date</h1>
          <p class="muted">Select hospital, department, doctor, and choose your preferred date from the calendar.</p>
        </div>
        <button class="btn btn-ghost" onclick="renderPatient()">Cancel</button>
      </div>

      <section class="card">
        <form id="bookingForm" class="form-grid">
          <label>Hospital
            <select id="hospitalId">
              ${hospitals.map(h => `<option value="${h.id}">${esc(h.name)} · ${esc(h.city)}</option>`).join("")}
            </select>
          </label>

          <label>Department
            <select id="department">
              ${initialHospital.departments.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join("")}
            </select>
          </label>

          <label>Doctor
            <select id="doctorId"></select>
          </label>

          <label>Date of Consultation (Calendar) *
            <input type="date" id="appointmentDate" value="${todayStr}" min="${todayStr}" required />
            <small class="muted">Choose the date for your doctor consultation visit</small>
          </label>

          <div data-error></div>
          <button class="btn btn-primary">Request consultation</button>
        </form>
      </section>
    </main>
  `);

  function updateDepartments() {
    const selectedHospitalId = document.getElementById("hospitalId").value;
    const selectedHosp = hospitals.find(h => h.id === selectedHospitalId) || hospitals[0];
    const deptSelect = document.getElementById("department");
    if (selectedHosp && selectedHosp.departments) {
      deptSelect.innerHTML = selectedHosp.departments
        .map(d => `<option value="${esc(d)}">${esc(d)}</option>`)
        .join("");
    }
  }

  async function loadDoctors() {
    const hospitalId = document.getElementById("hospitalId").value;
    const department = document.getElementById("department").value;
    if (!department) {
      document.getElementById("doctorId").innerHTML = `<option value="">No department selected</option>`;
      return;
    }
    const result = await api(`/api/doctors?hospitalId=${hospitalId}&department=${encodeURIComponent(department)}`);
    doctors = result.doctors;

    document.getElementById("doctorId").innerHTML = doctors.length
      ? doctors.map(d => `<option value="${d.id}">${esc(d.name)} (${esc(d.department)})</option>`).join("")
      : `<option value="">No doctor available</option>`;
  }

  document.getElementById("hospitalId").onchange = async () => {
    updateDepartments();
    await loadDoctors();
  };
  document.getElementById("department").onchange = loadDoctors;

  updateDepartments();
  await loadDoctors();

  document.getElementById("bookingForm").onsubmit = async event => {
    event.preventDefault();

    try {
      const doctorId = document.getElementById("doctorId").value;
      if (!doctorId) {
        showError("Please select a valid doctor.");
        return;
      }

      const appointmentDate = document.getElementById("appointmentDate").value;
      if (!appointmentDate) {
        showError("Please choose a valid consultation date from the calendar.");
        return;
      }

      const result = await api("/api/consultations", {
        method: "POST",
        body: JSON.stringify({
          hospitalId: document.getElementById("hospitalId").value,
          department: document.getElementById("department").value,
          doctorId: doctorId,
          appointmentDate: appointmentDate
        })
      });

      patientConsultation = result.consultation;
      await renderPatient();
    } catch (error) {
      showError(error);
    }
  };
}

function showLanguageSelection(consultationId) {
  const workspace = document.getElementById("patientWorkspace") ||
    document.querySelector("main");

  workspace.innerHTML = `
    <section class="card">
      <div class="eyebrow">STEP 1 OF 3 · PREFERRED LANGUAGE</div>
      <h2>How would you like to speak with PatiNote?</h2>
      <p class="muted">AI questions and voice recognition will use your selected language.</p>

      <div class="language-grid">
        <button class="language-option ${selectedLanguage === 'en' ? 'selected' : ''}" data-lang="en">English</button>
        <button class="language-option ${selectedLanguage === 'te' ? 'selected' : ''}" data-lang="te">తెలుగు</button>
        <button class="language-option ${selectedLanguage === 'hi' ? 'selected' : ''}" data-lang="hi">हिन्दी</button>
      </div>

      <label style="margin:25px 0">
        <span>
          <input id="consent" type="checkbox" checked />
          I understand that this is an AI-assisted history-taking tool and
          that a doctor will make the clinical decisions.
        </span>
      </label>

      <div data-error></div>
      <button id="beginCase" class="btn btn-primary">Continue securely</button>
    </section>
  `;

  document.querySelectorAll("[data-lang]").forEach(button => {
    button.onclick = () => {
      selectedLanguage = button.dataset.lang;
      localStorage.setItem("preferred_language", selectedLanguage);
      document.querySelectorAll("[data-lang]").forEach(x =>
        x.classList.toggle("selected", x === button)
      );
    };
  });

  document.getElementById("beginCase").onclick = async () => {
    try {
      const result = await api(`/api/consultations/${consultationId}/start`, {
        method: "POST",
        body: JSON.stringify({
          language: selectedLanguage,
          consent: document.getElementById("consent").checked
        })
      });

      patientConsultation = result.consultation;
      renderPatient();
    } catch (error) {
      showError(error);
    }
  };
}

function caseTakingView(c) {
  const t = uiText[selectedLanguage] || uiText.en;
  const progress = Math.min(95, 15 + c.responses.length * 9);
  const qId = c.nextQuestion?.id;
  const questionText = clientTranslations[selectedLanguage]?.[qId] || c.nextQuestion?.text || "Please describe your concern.";
  const langDisplay = selectedLanguage === "te" ? "తెలుగు" : selectedLanguage === "hi" ? "हिन्दी" : "ENGLISH";

  return `
    ${c.otp ? `
      <div class="card" style="margin-bottom:18px;background:#e0f2fe;border:1px solid #7dd3fc;display:flex;justify-content:space-between;align-items:center;padding:14px 20px">
        <div>
          <span style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;display:block">Consultation OTP</span>
          <span style="font-family:monospace;font-size:24px;color:var(--blue);font-weight:800;letter-spacing:4px">${esc(c.otp)}</span>
        </div>
        <span class="pill" style="margin:0">Share this OTP with Dr. ${esc(c.doctorName || "your doctor")}</span>
      </div>
    ` : ""}
    <div class="card">
      <div class="eyebrow">${t.aiCaseTaking} · ${langDisplay} · ${t.textAndVoice}</div>
      <div class="steps">
        <div class="step done" style="flex:${progress}"></div>
        <div class="step" style="flex:${100 - progress}"></div>
      </div>
      <p class="muted">${c.responses.length + 1} ${t.questionCount} · ${t.textVoiceDesc}</p>

      <section class="question-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px;flex-wrap:wrap">
          <div class="question-text" style="margin-bottom:0;flex:1">${esc(questionText)}</div>
          <button id="speakQuestionBtn" class="btn btn-secondary" style="white-space:nowrap" title="Click to hear question spoken aloud">
            ${t.readAloudBtn}
          </button>
        </div>

        <textarea id="answer" rows="5"
          placeholder="${t.textareaPlaceholder}"></textarea>

        <div class="answer-actions">
          <button id="micButton" class="btn btn-secondary">${t.speakAnswerBtn}</button>
          <button id="submitAnswer" class="btn btn-primary">${t.continueBtn}</button>
        </div>

        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
          <button type="button" class="btn btn-outline" style="font-size:12px;padding:5px 12px" onclick="openVitalsModal('${c.id}')">
            🩺 Record Patient Vitals (BP, HR, SpO2)
          </button>
          <button type="button" class="btn btn-outline" style="font-size:12px;padding:5px 12px" onclick="openReportModal('${c.id}')">
            📄 Attach Diagnostic Report
          </button>
        </div>

        <!-- Live Autonomous Extraction Panel -->
        <div style="margin-top:16px;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase">
              🤖 Live Extracted Clinical Parameters
            </span>
            <span style="font-size:11px;color:var(--blue);font-weight:700">Autonomous Observer Active</span>
          </div>
          <div>
            ${c.structured?.chiefComplaint?.value ? `<span class="extracted-chip"><strong>Complaint:</strong> ${esc(c.structured.chiefComplaint.value)}</span>` : `<span class="muted" style="font-size:12px">Waiting for chief complaint...</span>`}
            ${c.structured?.onset?.value ? `<span class="extracted-chip"><strong>Onset:</strong> ${esc(c.structured.onset.value)}</span>` : ""}
            ${c.structured?.severity?.value ? `<span class="extracted-chip"><strong>Severity:</strong> ${esc(c.structured.severity.value)}/10</span>` : ""}
            ${c.structured?.location?.value ? `<span class="extracted-chip"><strong>Location:</strong> ${esc(c.structured.location.value)}</span>` : ""}
            ${c.structured?.associatedSymptoms?.value ? `<span class="extracted-chip"><strong>Associated:</strong> ${esc(c.structured.associatedSymptoms.value)}</span>` : ""}
            ${c.structured?.pastHistory?.value ? `<span class="extracted-chip"><strong>History:</strong> ${esc(c.structured.pastHistory.value)}</span>` : ""}
            ${c.vitals?.bloodPressure ? `<span class="extracted-chip"><strong>BP:</strong> ${esc(c.vitals.bloodPressure)}</span>` : ""}
            ${c.vitals?.spo2 ? `<span class="extracted-chip"><strong>SpO2:</strong> ${esc(c.vitals.spo2)}%</span>` : ""}
          </div>
        </div>

        <p id="voiceStatus" class="muted" style="margin-top:15px"></p>
        <div data-error></div>
      </section>
    </div>
  `;
}

function speakQuestionText(text, lang) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const targetLang = lang || selectedLanguage || "en";
    const targetLangTag =
      targetLang === "te" ? "te-IN" :
      targetLang === "hi" ? "hi-IN" :
      "en-IN";

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLangTag;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const matchVoice = voices.find(
        v => v.lang === targetLangTag ||
             v.lang.startsWith(targetLang) ||
             v.lang.replace('_', '-').startsWith(targetLang)
      );
      if (matchVoice) {
        utterance.voice = matchVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error("TTS error:", e);
  }
}

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

function attachCaseTakingEvents(c) {
  const answerInput = document.getElementById("answer");
  const micButton = document.getElementById("micButton");
  const speakBtn = document.getElementById("speakQuestionBtn");
  const voiceStatus = document.getElementById("voiceStatus");
  const t = uiText[selectedLanguage] || uiText.en;
  const qId = c.nextQuestion?.id;
  const questionText = clientTranslations[selectedLanguage]?.[qId] || c.nextQuestion?.text || "";

  // Automatically speak the question aloud when displayed
  if (questionText) {
    setTimeout(() => {
      speakQuestionText(questionText, selectedLanguage);
    }, 400);
  }

  if (speakBtn) {
    speakBtn.onclick = () => {
      speakQuestionText(questionText, selectedLanguage);
    };
  }

  if (answerInput) {
    answerInput.focus();
    answerInput.onkeydown = e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        document.getElementById("submitAnswer")?.click();
      }
    };
  }

  let mediaRecorder = null;
  let audioChunks = [];

  function stopVoiceRecording() {
    recording = false;
    if (micButton) {
      micButton.classList.remove("mic-recording");
      micButton.innerHTML = t.speakAnswerBtn;
    }
    if (recognition) {
      try { recognition.stop(); } catch(e){}
      recognition = null;
    }
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      try { mediaRecorder.stop(); } catch(e){}
      mediaRecorder = null;
    }
  }

  async function startMediaRecorderFallback(targetLangTag, langName, baseText, existingStream = null) {
    try {
      const stream = existingStream || (navigator.mediaDevices && await navigator.mediaDevices.getUserMedia({ audio: true }));
      if (!stream) {
        voiceStatus.innerHTML = `<div class="error">${t.voiceNotSupported}</div>`;
        return;
      }

      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      mediaRecorder.onstart = () => {
        recording = true;
        if (micButton) {
          micButton.classList.add("mic-recording");
          micButton.innerHTML = t.stopListeningBtn;
        }
        voiceStatus.innerHTML = `<div style="color:var(--teal);font-weight:600;">🎙️ Recording voice in ${langName}… Speak your answer clearly into your microphone, then click "${t.stopListeningBtn}".</div>`;
      };

      mediaRecorder.onstop = () => {
        recording = false;
        if (micButton) {
          micButton.classList.remove("mic-recording");
          micButton.innerHTML = t.speakAnswerBtn;
        }
        stream.getTracks().forEach(track => track.stop());

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          answerInput.dataset.method = "voice";
          if (!answerInput.value.trim()) {
            answerInput.value = baseText ? baseText : `Patient voice answer recorded in ${langName}`;
          }
          voiceStatus.innerHTML = `<div style="color:var(--teal);font-weight:700">✓ ${t.voiceCaptured}</div>`;
        }
      };

      mediaRecorder.start();
    } catch (err) {
      console.error("MediaRecorder fallback error:", err);
      voiceStatus.innerHTML = `<div class="error">${t.voiceError}</div>`;
    }
  }

  document.getElementById("submitAnswer").onclick = async () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    stopVoiceRecording();

    const answer = answerInput.value.trim();

    if (!answer) {
      voiceStatus.innerHTML = `<div class="error">${t.pleaseProvideAnswer}</div>`;
      return;
    }

    try {
      const result = await api(`/api/consultations/${c.id}/answer`, {
        method: "POST",
        body: JSON.stringify({
          questionId: c.nextQuestion.id,
          answer,
          method: answerInput.dataset.method || "text",
          language: selectedLanguage
        })
      });

      patientConsultation = result.consultation;
      renderPatient();
    } catch (error) {
      showError(error);
    }
  };

  if (micButton) {
    micButton.onclick = async () => {
      // Cancel any ongoing question TTS reading so mic doesn't pick up speaker sound
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      if (recording) {
        stopVoiceRecording();
        return;
      }

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      const targetLangTag =
        selectedLanguage === "te" ? "te-IN" :
        selectedLanguage === "hi" ? "hi-IN" :
        "en-IN";
      const langName = selectedLanguage === 'te' ? 'తెలుగు' : selectedLanguage === 'hi' ? 'हिन्दी' : 'English';

      const baseText = answerInput.value.trim();

      // Explicitly request microphone access first to trigger permissions dialog cleanly
      let micStream = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          voiceStatus.innerHTML = `<div style="color:var(--blue);font-weight:600;">🎙️ ${t.listeningStatus} ${langName}… (Checking microphone access)</div>`;
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (permErr) {
          console.warn("Microphone permission denied or unavailable:", permErr);
          voiceStatus.innerHTML = `<div class="error">⚠️ Microphone access was denied. Please allow microphone access in your browser site settings and try again.</div>`;
          return;
        }
      }

      if (SpeechRecognition) {
        try {
          if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
          }

          recognition = new SpeechRecognition();
          recognition.lang = targetLangTag;
          recognition.interimResults = true;
          recognition.continuous = true;

          recognition.onstart = () => {
            recording = true;
            micButton.classList.add("mic-recording");
            micButton.innerHTML = t.stopListeningBtn;
            voiceStatus.innerHTML = `<div style="color:var(--teal);font-weight:600;">🎙️ ${t.listeningStatus} ${langName}… Speak clearly into your microphone now.</div>`;
          };

          recognition.onresult = event => {
            let fullSpeechTranscript = "";
            for (let i = 0; i < event.results.length; i++) {
              fullSpeechTranscript += event.results[i][0].transcript;
            }
            const finalCombined = baseText ? (baseText + " " + fullSpeechTranscript.trim()) : fullSpeechTranscript.trim();
            answerInput.value = finalCombined;
            answerInput.dataset.method = "voice";
            voiceStatus.innerHTML = `<div style="color:var(--teal);font-weight:700">✓ ${t.voiceCaptured}</div>`;
          };

          recognition.onerror = (err) => {
            console.warn("Speech recognition error:", err);
            recording = false;
            micButton.classList.remove("mic-recording");
            micButton.innerHTML = t.speakAnswerBtn;

            if (err.error === 'not-allowed') {
              voiceStatus.innerHTML = `<div class="error">⚠️ Microphone access was denied in browser settings.</div>`;
            } else if (err.error === 'no-speech') {
              voiceStatus.innerHTML = `<div class="muted">No speech was detected. Click "${t.speakAnswerBtn}" to try again.</div>`;
            } else if (err.error === 'network') {
              voiceStatus.innerHTML = `<div class="muted">Network error in speech service. Switching to local voice recording mode…</div>`;
              startMediaRecorderFallback(targetLangTag, langName, baseText);
            } else {
              voiceStatus.innerHTML = `<div class="error">${t.voiceError}</div>`;
            }
          };

          recognition.onend = () => {
            recording = false;
            micButton.classList.remove("mic-recording");
            micButton.innerHTML = t.speakAnswerBtn;
          };

          recognition.start();
          return;
        } catch (startErr) {
          console.warn("Failed to start SpeechRecognition, using MediaRecorder fallback:", startErr);
        }
      }

      startMediaRecorderFallback(targetLangTag, langName, baseText, micStream);
    };
  }
}

function waitingView(c) {
  return `
    <div class="grid-2">
      <section class="card">
        <div class="eyebrow">CASE COMPLETED</div>
        <h2>Your case is ready for the doctor</h2>
        <p class="muted">
          Your responses have been structured and securely attached to this consultation.
        </p>
        <span class="status warning">WAITING FOR DOCTOR</span>
        <div style="margin-top:25px">
          <button class="btn btn-outline" onclick="renderPatientSummary()">Review and correct answers</button>
        </div>
      </section>
      <section class="card">
        <div class="eyebrow">CONSULTATION OTP</div>
        <div class="otp-number">${esc(c.otp)}</div>
        <p class="muted">
          Show this six-digit OTP to ${esc(c.doctorName)}. It is valid only for this consultation.
        </p>
      </section>
    </div>
  `;
}

function renderPatientSummary() {
  const c = patientConsultation;
  const workspace = document.getElementById("patientWorkspace");
  if (!workspace) return;

  if (c.state === "COMPLETED" || !c.nextQuestion) {
    const fields = [
      ["chiefComplaint", "Chief Complaint"],
      ["onset", "Duration / Onset"],
      ["location", "Location"],
      ["severity", "Severity"],
      ["associatedSymptoms", "Associated Symptoms"],
      ["pastHistory", "Past History"],
      ["medications", "Current Medicines"],
      ["allergies", "Allergies"]
    ];

    const dateFormatted = c.appointmentDate ? new Date(c.appointmentDate + "T00:00:00").toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : new Date(c.createdAt).toLocaleDateString();

    workspace.innerHTML = `
      <section class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
          <div>
            <div class="eyebrow">CLINICAL SUMMARY & CASE RECORD</div>
            <h2 style="margin:4px 0 0">Consultation No: ${esc(c.displayId || "Consultation Summary")}</h2>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="downloadPrescriptionFileById('${c.id}')">📥 Download Prescription File</button>
            <button class="btn btn-secondary" onclick="window.print()">🖨 Print / Save PDF</button>
            <button class="btn btn-ghost" onclick="renderPatient()">← Back to Dashboard</button>
          </div>
        </div>

        <div class="grid-4" style="margin-bottom:24px;padding:20px;background:linear-gradient(135deg, #e0f2fe 0%, #f0f7ff 100%);border-radius:16px;border:1px solid #bae6fd">
          <div>
            <span class="muted" style="font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase">CONSULTATION NO.</span>
            <div style="font-weight:800;font-size:16px;color:var(--blue);margin-top:2px">${esc(c.displayId)}</div>
          </div>
          <div>
            <span class="muted" style="font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase">CONSULTATION DATE</span>
            <div style="font-weight:800;font-size:16px;color:var(--ink);margin-top:2px">${dateFormatted}</div>
          </div>
          <div>
            <span class="muted" style="font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase">PATIENT</span>
            <div style="font-weight:800;font-size:16px;color:var(--ink);margin-top:2px">${esc(me.name)}</div>
          </div>
          <div>
            <span class="muted" style="font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase">ATTENDING DOCTOR</span>
            <div style="font-weight:800;font-size:16px;color:var(--ink);margin-top:2px">${esc(c.doctorName || "Doctor")} (${esc(c.department || "")})</div>
          </div>
        </div>

        ${c.summary ? `
          <div class="clear" style="margin-bottom:24px">
            <div class="eyebrow" style="color:var(--green);margin-bottom:6px">AI CLINICAL SUMMARY</div>
            <pre style="white-space:pre-wrap;line-height:1.7;font-family:inherit;margin:0;font-size:15px;color:var(--ink)">${esc(c.summary)}</pre>
          </div>
        ` : ''}

        <div class="grid-2" style="margin-bottom:24px">
          <div class="card" style="background:#ffffff;border:1px solid var(--border)">
            <div class="eyebrow">STRUCTURED CASE HISTORY</div>
            ${fields.map(([key, label]) => `
              <div class="summary-line">
                <span class="summary-label">${label}</span>
                <span class="summary-value">${esc(c.structured?.[key]?.value || "Not reported")}</span>
              </div>
            `).join("")}
          </div>

          <div>
            <div class="card" style="background:#ffffff;border:1px solid var(--border);margin-bottom:20px">
              <div class="eyebrow">DOCTOR'S CLINICAL NOTES</div>
              <p style="white-space:pre-wrap;margin-top:8px;font-size:14px">${esc(c.doctorNotes || "No notes added by doctor.")}</p>
            </div>

            <div class="card" style="background:#ffffff;border:1px solid var(--border)">
              <div class="eyebrow">FINAL PRESCRIPTION</div>
              <img src="/patient_prescription_ui.jpg" alt="Official Prescription Record" class="summary-ui-img" />
              ${c.prescription?.items?.length ? `
                <div style="margin-top:10px">
                  ${c.prescription.items.map((item, idx) => `
                    <div style="padding:10px 0;border-bottom:1px solid #f1f5f9">
                      <strong style="color:var(--blue)">${idx + 1}. ${esc(item.medicine)}</strong>
                      <div style="font-size:13px;color:var(--muted);margin-top:4px">
                        Dosage: <strong>${esc(item.dosage)}</strong> · Frequency: <strong>${esc(item.frequency)}</strong> · Duration: <strong>${esc(item.duration)}</strong>
                      </div>
                      ${item.instructions ? `<div style="font-size:12px;color:var(--ink);margin-top:4px"><em>Note: ${esc(item.instructions)}</em></div>` : ''}
                    </div>
                  `).join("")}
                </div>
              ` : `<p class="muted" style="margin-top:8px">No medicines prescribed.</p>`}
              ${c.prescription?.instructions ? `
                <div style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:10px;font-size:13px;border:1px solid var(--border)">
                  <strong>Instructions:</strong> ${esc(c.prescription.instructions)}
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        ${c.responses?.length ? `
          <details style="margin-top:15px">
            <summary style="cursor:pointer;font-weight:700;color:var(--blue)">📋 View Full Question & Answer Transcript (${c.responses.length} responses)</summary>
            <div style="margin-top:12px;display:grid;gap:10px">
              ${c.responses.map(r => `
                <div class="response">
                  <strong>${esc(r.question)}</strong>
                  <p style="margin:4px 0 0">“${esc(r.answer)}”</p>
                  <small class="muted">${esc(r.source)} · ${new Date(r.timestamp).toLocaleString()}</small>
                </div>
              `).join("")}
            </div>
          </details>
        ` : ''}

        <div style="margin-top:25px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <button class="btn btn-ghost" onclick="renderPatient()">← Return to Patient Portal</button>
          <button class="btn btn-primary" onclick="downloadPrescriptionFileById('${c.id}')">📥 Download Prescription File (.txt)</button>
        </div>
      </section>
    `;
    return;
  }

  // Edit / Review form for pending consultation (state === "WAITING_FOR_DOCTOR")
  const fields = [
    ["chiefComplaint", "Chief complaint"],
    ["onset", "Duration / onset"],
    ["location", "Location"],
    ["severity", "Severity"],
    ["associatedSymptoms", "Associated symptoms"],
    ["pastHistory", "Past history"],
    ["medications", "Current medicines"],
    ["allergies", "Allergies"]
  ];

  workspace.innerHTML = `
    <section class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">
        <div class="eyebrow">ANSWER REVIEW</div>
        <button class="btn btn-ghost" onclick="renderPatient()">← Back to workspace</button>
      </div>
      <h2>We understood the following</h2>
      <p class="muted">Correct anything that is not accurate before the doctor reviews it.</p>

      <form id="reviewForm" class="form-grid">
        ${fields.map(([key, label]) => `
          <label>${label}
            <input data-field="${key}" value="${esc(c.structured?.[key]?.value || "")}" />
          </label>
        `).join("")}
        <div data-error></div>
        <div style="display:flex;gap:10px;margin-top:10px">
          <button class="btn btn-primary" style="flex:1">Save corrections</button>
          <button type="button" class="btn btn-outline" onclick="renderPatient()">Cancel</button>
        </div>
      </form>
    </section>
  `;

  document.getElementById("reviewForm").onsubmit = async event => {
    event.preventDefault();

    const values = {};
    document.querySelectorAll("[data-field]").forEach(input => {
      values[input.dataset.field] = input.value;
    });

    try {
      const result = await api(`/api/consultations/${c.id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ fields: values })
      });

      patientConsultation = result.consultation;
      renderPatient();
    } catch (error) {
      showError(error);
    }
  };
}

function activePatientView(c) {
  return `
    <div class="grid-2">
      <section class="card">
        <div class="eyebrow">CONSULTATION ACTIVE</div>
        <h2>Your doctor is reviewing your case</h2>
        <span class="status active">DOCTOR VERIFIED</span>
        <p class="muted" style="margin-top:18px">
          Your doctor has temporary access to this consultation. Access will expire as soon as the visit ends.
        </p>
      </section>
      <section class="card">
        <h3>Privacy status</h3>
        <p class="clear">✓ Temporary doctor access is active for this visit only.</p>
        <button class="btn btn-danger" onclick="endPatientVisit('${c.id}')">End visit</button>
      </section>
    </div>
  `;
}

function completedPatientView(c) {
  return `
    <section class="card">
      <div class="eyebrow">CONSULTATION COMPLETED</div>
      <div class="dashboard-header" style="background:transparent;padding:0;box-shadow:none;border:0;margin-bottom:15px">
        <div>
          <h2>✓ Visit completed</h2>
          <p class="muted">${esc(c.doctorName)} · ${esc(c.department)} · 📅 Date: <strong>${c.appointmentDate || 'N/A'}</strong></p>
        </div>
        <span class="status active">COMPLETED</span>
      </div>

      <p class="success">
        Doctor access to this consultation has expired and the OTP has been invalidated.
      </p>

      <h3>Final prescription</h3>
      ${
        c.prescription?.items?.length
          ? c.prescription.items.map((item, index) => `
              <div class="summary-line">
                <span class="summary-label">${index + 1}. Medicine</span>
                <span class="summary-value">
                  ${esc(item.medicine)} · ${esc(item.dosage)} · ${esc(item.frequency)} · ${esc(item.duration)}
                </span>
                <div class="muted">${esc(item.instructions)}</div>
              </div>
            `).join("")
          : `<p class="muted">No medicines were prescribed.</p>`
      }

      ${
        c.prescription?.instructions
          ? `<p class="muted"><strong>Instructions:</strong> ${esc(c.prescription.instructions)}</p>`
          : ""
      }

      <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="downloadPrescriptionFileById('${c.id}')">📥 Download Prescription File</button>
        <button class="btn btn-secondary" onclick="renderPatientSummary()">View case summary</button>
        <button class="btn btn-outline" onclick="window.print()">🖨 Print summary</button>
      </div>
    </section>
  `;
}

async function endPatientVisit(idValue) {
  if (!confirm("End this consultation? Doctor access will be revoked immediately.")) return;

  try {
    await api(`/api/patient/consultations/${idValue}/end`, {
      method: "POST"
    });
    await renderPatient();
  } catch (error) {
    showError(error);
  }
}

/* ------------------------------------------------------------------ */
/* Doctor portal                                                        */
/* ------------------------------------------------------------------ */

async function ackAlert(alertId) {
  try {
    await api(`/api/doctor/alerts/${alertId}/ack`, { method: "POST" });
    await renderDoctor();
  } catch (err) {
    showError(err);
  }
}

async function saveTriageOverride(consultationId) {
  try {
    const priority = document.getElementById("overridePrioritySelect").value;
    const department = document.getElementById("overrideDeptSelect").value;
    const feedbackNotes = document.getElementById("overrideNotesInput").value;

    const res = await api(`/api/doctor/case/${consultationId}/override`, {
      method: "PATCH",
      body: JSON.stringify({ priority, department, feedbackNotes })
    });

    doctorCase = res.consultation;
    alert("✓ Clinical triage decision & feedback recorded successfully.");
    await renderDoctor();
  } catch (err) {
    showError(err);
  }
}

function openVitalsModal(consultationId) {
  const modal = document.createElement("div");
  modal.id = "vitalsModal";
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(15,23,42,0.6);display:grid;place-items:center;z-index:999;padding:16px">
      <div class="card" style="max-width:480px;width:100%">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="eyebrow">CLINICAL PARAMETERS</div>
          <button class="btn btn-ghost" onclick="document.getElementById('vitalsModal').remove()">✕</button>
        </div>
        <h2>Record Patient Vitals</h2>
        <form id="vitalsForm" class="form-grid">
          <div class="form-row">
            <label>Blood Pressure (mmHg)
              <input id="vBp" placeholder="120/80" />
            </label>
            <label>Heart Rate (BPM)
              <input id="vHr" type="number" placeholder="72" />
            </label>
          </div>
          <div class="form-row">
            <label>SpO2 (% Oxygen)
              <input id="vSpo2" type="number" placeholder="98" />
            </label>
            <label>Temperature (°F)
              <input id="vTemp" placeholder="98.6" />
            </label>
          </div>
          <label>Respiratory Rate (breaths/min)
            <input id="vResp" type="number" placeholder="16" />
          </label>
          <div style="display:flex;gap:10px;margin-top:10px">
            <button class="btn btn-primary" type="submit" style="flex:1">Save Vitals</button>
            <button class="btn btn-outline" type="button" onclick="document.getElementById('vitalsModal').remove()">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("vitalsForm").onsubmit = async e => {
    e.preventDefault();
    try {
      const body = {};
      if (document.getElementById("vBp").value) body.bloodPressure = document.getElementById("vBp").value;
      if (document.getElementById("vHr").value) body.heartRate = document.getElementById("vHr").value;
      if (document.getElementById("vSpo2").value) body.spo2 = document.getElementById("vSpo2").value;
      if (document.getElementById("vTemp").value) body.temperature = document.getElementById("vTemp").value;
      if (document.getElementById("vResp").value) body.respiratoryRate = document.getElementById("vResp").value;

      const res = await api(`/api/consultations/${consultationId}/vitals`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      document.getElementById("vitalsModal").remove();
      if (doctorCase) doctorCase = res.consultation;
      if (patientConsultation) patientConsultation = res.consultation;
      if (me?.role === "DOCTOR") await renderDoctor();
      else await renderPatient();
    } catch (err) {
      showError(err);
    }
  };
}

function openReportModal(consultationId) {
  const modal = document.createElement("div");
  modal.id = "reportModal";
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(15,23,42,0.6);display:grid;place-items:center;z-index:999;padding:16px">
      <div class="card" style="max-width:480px;width:100%">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="eyebrow">DIAGNOSTIC DATA</div>
          <button class="btn btn-ghost" onclick="document.getElementById('reportModal').remove()">✕</button>
        </div>
        <h2>Attach Diagnostic Report</h2>
        <form id="reportForm" class="form-grid">
          <label>Report Title / Type
            <input id="rName" placeholder="Chest_XRay_Report.pdf or Blood_Panel.pdf" required />
          </label>
          <label>Summary of Diagnostic Findings
            <textarea id="rSummary" rows="3" placeholder="Enter findings (e.g. Normal sinus rhythm, bilateral clear lung fields, Hb: 13.5)"></textarea>
          </label>
          <div style="display:flex;gap:10px;margin-top:10px">
            <button class="btn btn-primary" type="submit" style="flex:1">Attach & Ingest</button>
            <button class="btn btn-outline" type="button" onclick="document.getElementById('reportModal').remove()">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("reportForm").onsubmit = async e => {
    e.preventDefault();
    try {
      const res = await api(`/api/consultations/${consultationId}/report`, {
        method: "POST",
        body: JSON.stringify({
          fileName: document.getElementById("rName").value,
          fileType: "application/pdf",
          extractedText: document.getElementById("rSummary").value
        })
      });
      document.getElementById("reportModal").remove();
      if (doctorCase) doctorCase = res.consultation;
      if (patientConsultation) patientConsultation = res.consultation;
      if (me?.role === "DOCTOR") await renderDoctor();
      else await renderPatient();
    } catch (err) {
      showError(err);
    }
  };
}

/* ------------------------------------------------------------------ */
/* Doctor Portal                                                      */
/* ------------------------------------------------------------------ */

let doctorPriorityFilter = "ALL";

async function renderDoctor() {
  const result = await api("/api/doctor/queue");
  const queue = result.queue || [];
  const alerts = result.alerts || [];
  doctorCompletedCount = result.completedCount || 0;
  doctorCompletedConsultations = result.completedConsultations || [];

  if (doctorConsultationId && !doctorCase) {
    try {
      const caseResult = await api(`/api/doctor/case/${doctorConsultationId}`);
      doctorCase = caseResult.consultation;
    } catch {
      doctorConsultationId = null;
    }
  }

  layout(`
    <main class="page">
      <div class="dashboard-header">
        <div>
          <div class="eyebrow">DOCTOR CLINICAL CONSOLE</div>
          <h1>Good morning, ${esc(me.name)}</h1>
          <p class="muted">${esc(me.department || "Clinical care")} · ${esc(hospitals.find(h=>h.id===me.hospitalId)?.name || "CarePath Central Hospital")}</p>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <span class="status ${doctorCase ? "active" : ""}">
            ${doctorCase ? "ACTIVE CONSULTATION SESSION" : "TRIAGE QUEUE READY"}
          </span>
          <span class="pill" style="margin:0;font-size:11px">📜 License: ${esc(me.licenseNumber || "MCI-2024-88392")}</span>
        </div>
      </div>

      ${
        doctorCase
          ? doctorDashboard()
          : doctorQueue(queue, alerts)
      }
    </main>
  `);
}

function doctorQueue(queue, alerts = []) {
  const highCount = queue.filter(c => c.priority === "HIGH").length;
  const urgentCount = queue.filter(c => c.priority === "URGENT").length;
  const routineCount = queue.filter(c => c.priority === "ROUTINE" || !c.priority).length;

  const filteredQueue = doctorPriorityFilter === "ALL"
    ? queue
    : queue.filter(c => (c.priority || "ROUTINE") === doctorPriorityFilter);

  return `
    <!-- Staff Alert Banner for High Priority Cases -->
    ${alerts && alerts.length ? `
      <div style="margin-bottom:24px">
        ${alerts.map(a => `
          <div class="staff-alert-banner">
            <div>
              <strong style="color:#e11d48;font-size:14px;display:flex;align-items:center;gap:6px">
                🚨 CLINICAL ESCALATION ALERT: HIGH PRIORITY CASE DETECTED
              </strong>
              <div style="font-size:13px;font-weight:700;margin-top:4px">
                Patient: ${esc(a.patientName)} · Suggested Dept: ${esc(a.suggestedDepartment || 'Emergency / Cardiology')}
              </div>
              <div style="font-size:12px;color:#475569;margin-top:2px">
                Clinical Finding: ${esc(a.reason)}
              </div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary" style="background:#e11d48;border-color:#e11d48" onclick="openOtp('${a.consultationId}')">
                Verify & Open Case
              </button>
              <button class="btn btn-outline" onclick="ackAlert('${a.id}')">
                Acknowledge
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    ` : ""}

    <!-- Triage Stats Row -->
    <div class="grid-4" style="margin-bottom:24px">
      <div class="card stat-card blue">
        <span class="stat-label">TOTAL QUEUE</span>
        <strong class="stat-value">${queue.length}</strong>
        <span class="stat-desc">Waiting patients</span>
      </div>
      <div class="card stat-card purple" style="border-left:4px solid #ef4444">
        <span class="stat-label">HIGH PRIORITY</span>
        <strong class="stat-value" style="color:#ef4444">${highCount}</strong>
        <span class="stat-desc">Immediate review required</span>
      </div>
      <div class="card stat-card orange" style="border-left:4px solid #f59e0b">
        <span class="stat-label">URGENT PRIORITY</span>
        <strong class="stat-value" style="color:#f59e0b">${urgentCount}</strong>
        <span class="stat-desc">Prompt evaluation</span>
      </div>
      <div class="card stat-card green" style="border-left:4px solid #10b981">
        <span class="stat-label">ROUTINE PRIORITY</span>
        <strong class="stat-value" style="color:#10b981">${routineCount}</strong>
        <span class="stat-desc">Standard consultation</span>
      </div>
    </div>

    <!-- Interactive Priority Filter & Simulation -->
    <div class="card" style="margin-bottom:20px;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:12px;font-weight:700;color:var(--muted)">FILTER PRIORITY:</span>
        <button class="btn ${doctorPriorityFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}" style="padding:4px 10px;font-size:12px" onclick="doctorPriorityFilter='ALL';renderDoctor()">All (${queue.length})</button>
        <button class="btn ${doctorPriorityFilter === 'HIGH' ? 'btn-primary' : 'btn-outline'}" style="padding:4px 10px;font-size:12px" onclick="doctorPriorityFilter='HIGH';renderDoctor()">🔴 High (${highCount})</button>
        <button class="btn ${doctorPriorityFilter === 'URGENT' ? 'btn-primary' : 'btn-outline'}" style="padding:4px 10px;font-size:12px" onclick="doctorPriorityFilter='URGENT';renderDoctor()">🟠 Urgent (${urgentCount})</button>
        <button class="btn ${doctorPriorityFilter === 'ROUTINE' ? 'btn-primary' : 'btn-outline'}" style="padding:4px 10px;font-size:12px" onclick="doctorPriorityFilter='ROUTINE';renderDoctor()">🟢 Routine (${routineCount})</button>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-secondary" style="font-size:11px" onclick="launchAutonomousDemo('high-priority')">⚡ Run High-Risk Demo</button>
        <button class="btn btn-secondary" style="font-size:11px" onclick="launchAutonomousDemo('routine')">⚡ Run Routine Demo</button>
      </div>
    </div>

    <div class="grid-2">
      <section class="card">
        <div class="eyebrow">CLINICAL TRIAGE QUEUE</div>
        <h2>Prioritized Patient Queue</h2>
        ${
          filteredQueue.length
            ? filteredQueue.map(c => `
              <div class="queue-item" style="border-left:4px solid ${c.priority === 'HIGH' ? '#ef4444' : c.priority === 'URGENT' ? '#f59e0b' : '#10b981'}">
                <div>
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                    <strong style="font-size:15px">${esc(c.patientName)}</strong>
                    <span class="priority-badge ${c.priority ? c.priority.toLowerCase() : 'routine'}">
                      ${esc(c.priority || 'ROUTINE')}
                    </span>
                  </div>
                  <div class="muted" style="font-size:12px">
                    No: <strong>${esc(c.displayId)}</strong> · Dept: <strong>${esc(c.suggestedDepartment || c.department)}</strong>
                    ${c.indicatorsCount ? ` · <span style="color:#e11d48;font-weight:700">⚠️ ${c.indicatorsCount} risk indicators</span>` : ""}
                  </div>
                </div>
                <div class="nav-actions">
                  <button class="btn btn-primary" onclick="openOtp('${c.id}')">Enter OTP / Open</button>
                </div>
              </div>
            `).join("")
            : `<p class="muted">No patient consultations matching the selected priority filter.</p>`
        }
      </section>

      <section class="card">
        <div class="eyebrow">TEMPORARY CONSULTATION ACCESS</div>
        <h2>Privacy-Enforced Access</h2>
        <p class="muted">
          Patient cases are accessible only with the patient-authorized six-digit OTP. Attending physician access is automatically revoked when the consultation completes.
        </p>
        <p class="clear" style="margin-bottom:20px">✓ Total finished consultations: <strong>${doctorCompletedCount} patients</strong></p>

        ${
          doctorCompletedConsultations.length ? `
            <div class="eyebrow" style="margin-bottom:10px">RECENT ARCHIVED CASES (${doctorCompletedConsultations.length})</div>
            <div style="display:grid;gap:10px;max-height:260px;overflow-y:auto">
              ${doctorCompletedConsultations.map(c => `
                <div style="padding:10px 14px;background:#ffffff;border:1px solid var(--border);border-radius:10px;display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <strong style="font-size:14px">${esc(c.patientName)}</strong>
                    <div style="font-size:12px;color:var(--muted)">No: ${esc(c.displayId)} · Dept: ${esc(c.department)}</div>
                  </div>
                  <span class="status active" style="font-size:11px">Completed</span>
                </div>
              `).join("")}
            </div>
          ` : ""
        }
      </section>
    </div>

    <div id="otpDialog"></div>
  `;
}

function openOtp(consultationId) {
  document.getElementById("otpDialog").innerHTML = `
    <section class="card" style="margin-top:22px;max-width:600px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div class="eyebrow">TEMPORARY ACCESS VERIFICATION</div>
        <button type="button" class="btn btn-ghost" onclick="document.getElementById('otpDialog').innerHTML=''">✕ Close</button>
      </div>
      <h2>Verify consultation OTP</h2>
      <p class="muted">Enter the six-digit OTP displayed on the patient's portal to unlock their case history.</p>
      <div data-error></div>
      <form id="otpForm" class="form-grid">
        <input id="consultationId" type="hidden" value="${consultationId}" />
        <label>Six-digit consultation OTP
          <input id="otp" inputmode="numeric" maxlength="6" required placeholder="482731" autofocus />
        </label>
        <div style="display:flex;gap:10px">
          <button class="btn btn-primary" style="flex:1">Verify & Open Case</button>
          <button type="button" class="btn btn-outline" onclick="document.getElementById('otpDialog').innerHTML=''">Cancel</button>
        </div>
      </form>
    </section>
  `;

  document.getElementById("otpForm").onsubmit = async event => {
    event.preventDefault();

    try {
      await api("/api/doctor/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          consultationId,
          otp: document.getElementById("otp").value
        })
      });

      doctorConsultationId = consultationId;
      const result = await api(`/api/doctor/case/${consultationId}`);
      doctorCase = result.consultation;
      await renderDoctor();
    } catch (error) {
      showError(error);
    }
  };
}

function fieldValue(structured, key) {
  return structured?.[key]?.value || "Not reported";
}

function doctorDashboard() {
  const c = doctorCase;

  return `
    <div class="dashboard-header" style="margin-bottom:20px">
      <div>
        <button class="btn btn-ghost" onclick="closeDoctorCase()">← Back to triage queue</button>
      </div>
      <div class="nav-actions">
        <span class="status active">AUTHORIZED CLINICAL ACCESS</span>
        <button class="btn btn-danger" onclick="endDoctorConsultation('${c.id}')">
          End consultation
        </button>
      </div>
    </div>

    <!-- Preliminary AI Risk Assessment Banner & Override Panel -->
    <section class="card" style="margin-bottom:22px;border-left:6px solid ${c.priority === 'HIGH' ? '#e11d48' : c.priority === 'URGENT' ? '#f59e0b' : '#10b981'};box-shadow:var(--shadow-md)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">
        <div>
          <span class="eyebrow">PRELIMINARY AI RISK ASSESSMENT · DECISION-SUPPORT ONLY</span>
          <div style="display:flex;align-items:center;gap:12px;margin-top:4px">
            <span class="priority-badge ${c.priority ? c.priority.toLowerCase() : 'routine'}" style="font-size:13px;padding:6px 14px">
              ${esc(c.priority || 'ROUTINE')}
            </span>
            <span style="font-size:16px;font-weight:700">
              Suggested Department: <span style="color:var(--blue)">${esc(c.suggestedDepartment || c.department)}</span>
            </span>
          </div>
        </div>

        <!-- Clinician Review & Override Controls -->
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <label style="margin:0;font-size:12px;font-weight:700">Override Dept:
            <select id="overrideDeptSelect" style="padding:5px 8px;font-size:12px;border-radius:6px;border:1px solid var(--border)">
              ${[
                "General Medicine",
                "Emergency / Cardiology",
                "Emergency",
                "Cardiology",
                "Pulmonology",
                "Gastroenterology",
                "Neurology",
                "Pediatrics",
                "Dermatology",
                "Orthopedics"
              ].map(d => `<option value="${d}" ${(c.department === d || c.suggestedDepartment === d) ? 'selected' : ''}>${d}</option>`).join("")}
            </select>
          </label>

          <label style="margin:0;font-size:12px;font-weight:700">Override Priority:
            <select id="overridePrioritySelect" style="padding:5px 8px;font-size:12px;border-radius:6px;border:1px solid var(--border)">
              <option value="ROUTINE" ${c.priority === 'ROUTINE' ? 'selected' : ''}>ROUTINE</option>
              <option value="URGENT" ${c.priority === 'URGENT' ? 'selected' : ''}>URGENT</option>
              <option value="HIGH" ${c.priority === 'HIGH' ? 'selected' : ''}>HIGH</option>
            </select>
          </label>

          <input id="overrideNotesInput" placeholder="Clinical reasoning context..." style="font-size:12px;padding:5px 8px;width:180px;border-radius:6px;border:1px solid var(--border)" value="${esc(c.doctorFeedback?.feedbackNotes || '')}" />

          <button class="btn btn-secondary" style="font-size:12px" onclick="saveTriageOverride('${c.id}')">
            Save Clinician Decision
          </button>
        </div>
      </div>

      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--muted)">
        <span>⚠️ This assessment is an automated decision-support suggestion. The physician remains the final clinical authority.</span>
        ${c.doctorFeedback?.priorityChanged || c.doctorFeedback?.departmentChanged ? `<span style="color:var(--blue);font-weight:700">✓ Clinician override active</span>` : ""}
      </div>
    </section>

    <!-- Patient Info & Chief Complaint -->
    <section class="grid-2">
      <div class="card">
        <div class="eyebrow">PATIENT INFORMATION</div>
        <h2>${esc(c.patient?.name || c.patientName)}</h2>
        <div class="grid-3">
          <div><span class="summary-label">Age</span><strong>${esc(c.patient?.age || c.structured?.age?.value || 'N/A')}</strong></div>
          <div><span class="summary-label">Gender</span><strong>${esc(c.patient?.gender || c.structured?.gender?.value || 'N/A')}</strong></div>
          <div><span class="summary-label">Consultation Date</span><strong>${esc(c.appointmentDate || 'Today')}</strong></div>
        </div>
      </div>

      <div class="card">
        <div class="eyebrow">CHIEF COMPLAINT</div>
        <h2>${esc(fieldValue(c.structured, "chiefComplaint"))}</h2>
        <p class="muted">
          Category: <strong>${esc(c.complaintCategory ? c.complaintCategory.toUpperCase() : "GENERAL")}</strong> ·
          Source: ${esc(c.structured?.chiefComplaint?.source || "Patient narrative")}
        </p>
      </div>
    </section>

    <!-- Vitals & Reports Cards -->
    <section class="card" style="margin-top:22px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="eyebrow">PATIENT VITALS & DIAGNOSTIC REPORTS</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline" style="font-size:11px;padding:4px 10px" onclick="openVitalsModal('${c.id}')">🩺 Record / Update Vitals</button>
          <button class="btn btn-outline" style="font-size:11px;padding:4px 10px" onclick="openReportModal('${c.id}')">📄 Attach Diagnostic Report</button>
        </div>
      </div>
      <div class="vitals-grid">
        <div class="vitals-box">
          <span class="summary-label">Blood Pressure</span>
          <strong>${esc(c.vitals?.bloodPressure || "Not recorded")}</strong>
        </div>
        <div class="vitals-box">
          <span class="summary-label">Heart Rate</span>
          <strong>${esc(c.vitals?.heartRate ? c.vitals.heartRate + " BPM" : "Not recorded")}</strong>
        </div>
        <div class="vitals-box">
          <span class="summary-label">SpO2 (Oxygen)</span>
          <strong>${esc(c.vitals?.spo2 ? c.vitals.spo2 + "%" : "Not recorded")}</strong>
        </div>
        <div class="vitals-box">
          <span class="summary-label">Temperature</span>
          <strong>${esc(c.vitals?.temperature ? c.vitals.temperature + "°F" : "Not recorded")}</strong>
        </div>
        <div class="vitals-box">
          <span class="summary-label">Respiratory Rate</span>
          <strong>${esc(c.vitals?.respiratoryRate ? c.vitals.respiratoryRate + "/min" : "Not recorded")}</strong>
        </div>
      </div>

      ${c.reports && c.reports.length ? `
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid #e2e8f0">
          <span class="summary-label">Attached Diagnostic Reports (${c.reports.length})</span>
          <div style="display:grid;gap:6px;margin-top:6px">
            ${c.reports.map(r => `
              <div style="font-size:12px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;display:flex;justify-content:space-between">
                <span>📄 <strong>${esc(r.fileName)}</strong> · ${esc(r.extractedText)}</span>
                <span class="muted">${new Date(r.uploadedAt).toLocaleTimeString()}</span>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
    </section>

    <!-- Critical Hackathon Feature: Autonomous Decision Trace -->
    <section class="card" style="margin-top:22px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <div class="eyebrow" style="color:var(--blue)">AUTONOMOUS DECISION TRACE (AUDITABLE AI COMPUTING LOG)</div>
        <span class="pill" style="margin:0;font-size:11px">Intelligent Systems & Autonomous Computing</span>
      </div>
      <p class="muted" style="margin-top:0;font-size:13px">
        Continuous autonomous cycle execution showing: Observe → Entity Extraction → Missing Info Evaluation → Dynamic Question Selection → Risk Urgency Stratification.
      </p>
      <div class="trace-panel">
        ${(c.decisionTrace && c.decisionTrace.length > 0) ? c.decisionTrace.map(t => `
          <div class="trace-item ${t.event.toLowerCase().includes('high') || t.event.toLowerCase().includes('alert') ? 'high-risk' : ''}">
            <div class="trace-timestamp">${new Date(t.timestamp).toLocaleTimeString()}</div>
            <div class="trace-event">✓ ${esc(t.event)}</div>
            <div class="trace-detail">${esc(t.detail)}</div>
            <div class="trace-action">→ ${esc(t.action)}</div>
          </div>
        `).join("") : `<div class="muted">No trace records available.</div>`}
      </div>
    </section>

    <!-- Detected Risk Indicators -->
    <section style="margin-top:22px">
      ${
        c.redFlags?.length
          ? c.redFlags.map(flag => `
            <div class="alert" style="margin-bottom:12px">
              <h3>🚨 Potential Warning Indicator</h3>
              <strong>${esc(flag.trigger)}</strong>
              <p>${esc(flag.why)}</p>
              <details>
                <summary>View indicator details</summary>
                <p><strong>Trigger:</strong> ${esc(flag.trigger)}</p>
                <p><strong>Patient response evidence:</strong> “${esc(flag.evidence)}”</p>
                <p><strong>Urgency Rating:</strong> ${esc(flag.severity)}</p>
                <p><strong>Timestamp:</strong> ${new Date(flag.timestamp).toLocaleString()}</p>
              </details>
            </div>
          `).join("")
          : `<div class="clear">🟢 No critical warning indicators detected from available case responses.</div>`
      }
    </section>

    <!-- AI Case Sheet -->
    <section class="card" style="margin-top:22px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div class="eyebrow">STRUCTURED CLINICAL CASE SHEET</div>
        <button class="btn btn-outline" style="font-size:11px" onclick="window.print()">🖨 Print Case Sheet</button>
      </div>
      <pre style="white-space:pre-wrap;line-height:1.8;font-family:inherit;margin:0;font-size:14px;color:var(--ink)">${esc(c.summary)}</pre>
    </section>

    <!-- Structured History & Transcripts -->
    <section class="grid-2" style="margin-top:22px">
      <div class="card">
        <div class="eyebrow">STRUCTURED CLINICAL ATTRIBUTES</div>
        ${[
          ["onset", "Duration / Onset"],
          ["location", "Location"],
          ["severity", "Severity"],
          ["radiation", "Radiation"],
          ["associatedSymptoms", "Associated Symptoms"],
          ["pastHistory", "Past Medical History"],
          ["medications", "Current Medicines"],
          ["allergies", "Allergies"]
        ].map(([key, label]) => `
          <div class="summary-line">
            <span class="summary-label">${label}</span>
            <span class="summary-value">${esc(fieldValue(c.structured, key))}</span>
            <small class="muted">Source: ${esc(c.structured?.[key]?.source || "Not reported")}</small>
          </div>
        `).join("")}

        <details style="margin-top:16px">
          <summary>View complete patient interview responses (${c.responses?.length || 0})</summary>
          ${(c.responses || []).map(r => `
            <div class="response">
              <strong>${esc(r.question)}</strong>
              <p style="margin:4px 0 0">“${esc(r.answer)}”</p>
              <small>${esc(r.source)} · ${new Date(r.timestamp).toLocaleTimeString()}</small>
            </div>
          `).join("")}
        </details>
      </div>

      <div>
        ${doctorNotesPanel(c)}
        ${prescriptionPanel(c)}
      </div>
    </section>
  `;
}

function doctorNotesPanel(c) {
  return `
    <section class="card">
      <div class="eyebrow">DOCTOR NOTES</div>
      <textarea id="doctorNotes" placeholder="Add consultation notes...">${esc(c.doctorNotes || "")}</textarea>
      <button class="btn btn-outline" style="margin-top:10px" onclick="saveNotes('${c.id}')">
        Save notes
      </button>
    </section>
  `;
}

function prescriptionPanel(c) {
  const items = c.prescription?.items || [];

  return `
    <section class="card" style="margin-top:22px">
      <div class="eyebrow">PRESCRIPTION</div>
      <p class="muted">Medicines must be entered and confirmed by the doctor.</p>

      <div id="medicineRows">
        ${items.map((item, index) => medicineRow(item, index)).join("")}
      </div>

      <button class="btn btn-secondary" onclick="addMedicineRow()">+ Add medicine</button>

      <label style="margin-top:14px">General instructions
        <textarea id="prescriptionInstructions">${esc(c.prescription?.instructions || "")}</textarea>
      </label>

      <button class="btn btn-primary" style="margin-top:12px" onclick="savePrescription('${c.id}')">
        Save prescription
      </button>
    </section>
  `;
}

function medicineRow(item = {}, index = Date.now()) {
  return `
    <div class="medicine-row" data-medicine-row="${index}">
      <input data-med="medicine" placeholder="Medicine" value="${esc(item.medicine)}" />
      <input data-med="dosage" placeholder="Dosage" value="${esc(item.dosage)}" />
      <input data-med="frequency" placeholder="Frequency" value="${esc(item.frequency)}" />
      <input data-med="duration" placeholder="Duration" value="${esc(item.duration)}" />
      <input data-med="instructions" placeholder="Instructions" value="${esc(item.instructions)}" />
      <button class="btn btn-ghost" onclick="this.parentElement.remove()">Remove</button>
    </div>
  `;
}

function addMedicineRow() {
  document.getElementById("medicineRows").insertAdjacentHTML(
    "beforeend",
    medicineRow()
  );
}

async function saveNotes(idValue) {
  try {
    const result = await api(`/api/doctor/case/${idValue}/notes`, {
      method: "PATCH",
      body: JSON.stringify({
        notes: document.getElementById("doctorNotes").value
      })
    });

    doctorCase = result.consultation;
    await renderDoctor();
  } catch (error) {
    showError(error);
  }
}

async function savePrescription(idValue) {
  const items = [];

  document.querySelectorAll("[data-medicine-row]").forEach(row => {
    const item = {};

    row.querySelectorAll("[data-med]").forEach(input => {
      item[input.dataset.med] = input.value.trim();
    });

    if (item.medicine) items.push(item);
  });

  try {
    const result = await api(`/api/doctor/case/${idValue}/prescription`, {
      method: "PUT",
      body: JSON.stringify({
        items,
        instructions: document.getElementById("prescriptionInstructions").value
      })
    });

    doctorCase = result.consultation;
    await renderDoctor();
  } catch (error) {
    showError(error);
  }
}

async function endDoctorConsultation(idValue) {
  if (!confirm("End this consultation and revoke temporary access?")) return;

  try {
    await api(`/api/doctor/case/${idValue}/end`, {
      method: "POST"
    });

    alert("Consultation completed. Doctor access has expired.");
    doctorCase = null;
    doctorConsultationId = null;
    await renderDoctor();
  } catch (error) {
    showError(error);
  }
}

async function closeDoctorCase() {
  doctorCase = null;
  doctorConsultationId = null;
  await renderDoctor();
}

/* ------------------------------------------------------------------ */
/* Admin portal                                                         */
/* ------------------------------------------------------------------ */

async function renderAdmin() {
  const result = await api("/api/admin/overview");
  const c = result.counts;

  layout(`
    <main class="page">
      <div class="dashboard-header">
        <div>
          <div class="eyebrow">ADMIN CONSOLE</div>
          <h1>System Overview</h1>
          <p class="muted">PatiNote administration, doctor credentials verification, and audit monitoring</p>
        </div>
      </div>

      <div class="grid-4" style="margin-bottom:24px">
        <div class="card stat-card blue">
          <span class="stat-label">TOTAL USERS</span>
          <strong class="stat-value">${c.users}</strong>
          <span class="stat-desc">Patients: ${c.patients} · Doctors: ${c.doctors}</span>
        </div>
        <div class="card stat-card green">
          <span class="stat-label">VERIFIED DOCTORS</span>
          <strong class="stat-value">${c.doctors}</strong>
          <span class="stat-desc">Licensed Practitioners</span>
        </div>
        <div class="card stat-card purple">
          <span class="stat-label">CONSULTATIONS</span>
          <strong class="stat-value">${c.consultations}</strong>
          <span class="stat-desc">Total Recorded Cases</span>
        </div>
        <div class="card stat-card orange">
          <span class="stat-label">ACTIVE VISITS</span>
          <strong class="stat-value">${c.activeConsultations || 0}</strong>
          <span class="stat-desc">Live Doctor Sessions</span>
        </div>
      </div>

      <section class="card" style="margin-top:22px">
        <div class="eyebrow">DOCTOR DIRECTORY & VERIFIED CREDENTIALS</div>
        <div class="table-wrap" style="margin-top:10px">
          <table>
            <thead>
              <tr>
                <th>Doctor Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Hospital</th>
                <th>License No.</th>
                <th>License Document</th>
                <th>Graduation Certificate</th>
              </tr>
            </thead>
            <tbody>
              ${result.doctors.map(d => `
                <tr>
                  <td><strong>${esc(d.name)}</strong></td>
                  <td>${esc(d.email)}</td>
                  <td><span class="pill" style="margin:0">${esc(d.department)}</span></td>
                  <td>${esc(result.hospitals.find(h => h.id === d.hospitalId)?.name || "PatiNote Care Hospital")}</td>
                  <td><code style="background:#e0f2fe;padding:2px 6px;border-radius:4px;color:var(--blue);font-weight:700">${esc(d.licenseNumber || "MCI-2024-88392")}</code></td>
                  <td>
                    <span class="status active" style="font-size:11px;cursor:pointer" onclick="alert('Viewing Medical License Document for ${esc(d.name)}: ${esc(d.licenseFile || "medical_license_doc.pdf")}')">
                      📄 ${esc(d.licenseFile || "medical_license_doc.pdf")}
                    </span>
                  </td>
                  <td>
                    <span class="status active" style="font-size:11px;cursor:pointer" onclick="alert('Viewing Graduation Certificate for ${esc(d.name)}: ${esc(d.graduationCertificate || "mbbs_degree_certificate.pdf")}')">
                      🎓 ${esc(d.graduationCertificate || "mbbs_degree_certificate.pdf")}
                    </span>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section class="card" style="margin-top:22px">
        <div class="eyebrow">AUDIT LOG</div>
        <div class="table-wrap" style="margin-top:10px">
          <table>
            <thead>
              <tr><th>Time</th><th>Action</th><th>Role</th><th>Consultation</th></tr>
            </thead>
            <tbody>
              ${result.auditLogs.map(log => `
                <tr>
                  <td>${new Date(log.timestamp).toLocaleString()}</td>
                  <td><span class="pill" style="margin:0;font-size:11px">${esc(log.action)}</span></td>
                  <td>${esc(log.actorRole)}</td>
                  <td>${esc(log.consultationId || "—")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  `);
}

/* Detect when patient case-taking needs event listeners */
const originalRenderPatient = renderPatient;
renderPatient = async function () {
  await originalRenderPatient();

  if (
    patientConsultation &&
    patientConsultation.state === "CASE_TAKING"
  ) {
    attachCaseTakingEvents(patientConsultation);
  }
};

/* Accessibility: Screen Reader Announcements & Modal Keyboard Dismissal (WCAG 2.1 AA) */
function announceStatus(message) {
  const ariaStatus = document.getElementById("aria-status");
  if (ariaStatus) {
    ariaStatus.textContent = "";
    setTimeout(() => {
      ariaStatus.textContent = message;
    }, 50);
  }
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modalIds = ["doctorAccessModal", "vitalsModal", "reportModal", "prescriptionModal"];
    let closedAny = false;
    for (const id of modalIds) {
      const el = document.getElementById(id);
      if (el) {
        el.remove();
        closedAny = true;
      }
    }
    if (closedAny) {
      announceStatus("Modal dialog dismissed");
    }
  }
});

boot();