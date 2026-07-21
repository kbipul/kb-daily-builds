// languages.ts — the taxonomy: all 22 languages of the Eighth Schedule of the
// Constitution of India, plus English and Hinglish (romanised Hindi) as two
// practical extra classes.
//
// Capability tiers (deliberately honest — see README "How it works"):
//   "full"    — discriminative samples embedded; participates in the n-gram
//               ranking and in the confusion matrix.
//   "script"  — owns a Unicode script uniquely, so script detection alone names
//               it with high confidence (no same-script sibling to confuse it).
//   "partial" — shares a script with profiled languages but has no embedded
//               profile of its own yet; the tool reports its script and lists it
//               as a candidate, but cannot individually confirm it. This is the
//               real frontier of Indian-language ID and we show it rather than
//               hide it.
//
// Sample sentences are short, common, hand-written declaratives / greetings in
// each language. They exist to seed a character-n-gram profile, not to be a
// corpus — the Build notes are explicit about that.

import type { ScriptId } from "./scripts";

export type Tier = "full" | "script" | "partial";

export interface Language {
  code: string;       // BCP-47-ish code
  name: string;       // English name
  native: string;     // endonym
  script: ScriptId;
  tier: Tier;
  scheduled: boolean; // true = one of the 22 scheduled languages
  markers: string[];  // high-frequency function words / distinctive strings
  samples: string[];  // only for tier "full"
}

export const LANGUAGES: Language[] = [
  // ---------- Devanagari (shared) ----------
  {
    code: "hi", name: "Hindi", native: "हिन्दी", script: "Devanagari", tier: "full", scheduled: true,
    markers: ["है", "और", "के", "में", "की", "को", "हैं", "नहीं", "यह", "से", "हूँ"],
    samples: [
      "भारत एक विशाल देश है जहाँ अनेक भाषाएँ बोली जाती हैं।",
      "नमस्ते, आप कैसे हैं? मैं ठीक हूँ, धन्यवाद।",
      "यह पुस्तक बहुत रोचक है और मुझे बहुत पसंद आई।",
      "हम सब मिलकर इस काम को पूरा करेंगे।",
    ],
  },
  {
    code: "mr", name: "Marathi", native: "मराठी", script: "Devanagari", tier: "full", scheduled: true,
    markers: ["आहे", "आणि", "मध्ये", "आम्ही", "च्या", "ला", "नाही", "होते", "मी", "तो"],
    samples: [
      "महाराष्ट्र हे भारतातील एक सुंदर राज्य आहे.",
      "नमस्कार, तुम्ही कसे आहात? मी बरा आहे.",
      "हे पुस्तक खूप छान आहे आणि मला ते खूप आवडले.",
      "आम्ही सर्व मिळून हे काम पूर्ण करू.",
    ],
  },
  {
    code: "sa", name: "Sanskrit", native: "संस्कृतम्", script: "Devanagari", tier: "full", scheduled: true,
    markers: ["च", "अस्ति", "एव", "तत्", "भवति", "वा", "इति", "अहम्", "सर्वे", "न"],
    samples: [
      "संस्कृतम् एका प्राचीना भाषा अस्ति।",
      "सर्वे जनाः सुखिनः भवन्तु।",
      "अहम् विद्यालयं गच्छामि।",
      "एतत् पुस्तकम् अतीव उत्तमम् अस्ति।",
    ],
  },
  {
    code: "ne", name: "Nepali", native: "नेपाली", script: "Devanagari", tier: "full", scheduled: true,
    markers: ["छ", "हो", "को", "मा", "हरू", "गर्छ", "लाई", "हुन्छ", "छु", "र"],
    samples: [
      "नेपाल एक सुन्दर हिमाली देश हो।",
      "नमस्ते, तपाईं कस्तो हुनुहुन्छ? म ठिक छु।",
      "यो किताब धेरै राम्रो छ र मलाई मन पर्‍यो।",
      "हामी सबै मिलेर यो काम पूरा गर्छौं।",
    ],
  },
  {
    code: "kok", name: "Konkani", native: "कोंकणी", script: "Devanagari", tier: "partial", scheduled: true,
    markers: [], samples: [],
  },
  {
    code: "mai", name: "Maithili", native: "मैथिली", script: "Devanagari", tier: "partial", scheduled: true,
    markers: [], samples: [],
  },
  {
    code: "brx", name: "Bodo", native: "बड़ो", script: "Devanagari", tier: "partial", scheduled: true,
    markers: [], samples: [],
  },
  {
    code: "doi", name: "Dogri", native: "डोगरी", script: "Devanagari", tier: "partial", scheduled: true,
    markers: [], samples: [],
  },

  // ---------- Bengali-Assamese (shared) ----------
  {
    code: "bn", name: "Bengali", native: "বাংলা", script: "Bengali", tier: "full", scheduled: true,
    markers: ["এবং", "আছে", "করে", "হয়", "না", "আমি", "এই", "তার", "থেকে", "জন্য"],
    samples: [
      "বাংলা একটি সুন্দর ও সমৃদ্ধ ভাষা।",
      "নমস্কার, আপনি কেমন আছেন? আমি ভালো আছি।",
      "এই বইটি খুব সুন্দর এবং আমার খুব ভালো লেগেছে।",
      "আমরা সবাই মিলে এই কাজটি শেষ করব।",
    ],
  },
  {
    code: "as", name: "Assamese", native: "অসমীয়া", script: "Bengali", tier: "full", scheduled: true,
    markers: ["আৰু", "আছে", "কৰে", "নাই", "মই", "এই", "তেওঁ", "পৰা", "বাবে", "ৱ"],
    samples: [
      "অসম ভাৰতৰ এখন সুন্দৰ ৰাজ্য।",
      "নমস্কাৰ, আপুনি কেনে আছে? মই ভালে আছোঁ।",
      "এই কিতাপখন বৰ ভাল আৰু মোৰ বৰ ভাল লাগিল।",
      "আমি সকলোৱে মিলি এই কামটো শেষ কৰিম।",
    ],
  },

  // ---------- Perso-Arabic (shared) ----------
  {
    code: "ur", name: "Urdu", native: "اردو", script: "Arabic", tier: "full", scheduled: true,
    markers: ["اور", "ہے", "کے", "میں", "کی", "کو", "ہیں", "نہیں", "یہ", "سے"],
    samples: [
      "اردو ایک خوبصورت اور شیریں زبان ہے۔",
      "السلام علیکم، آپ کیسے ہیں؟ میں ٹھیک ہوں۔",
      "یہ کتاب بہت دلچسپ ہے اور مجھے بہت پسند آئی۔",
      "ہم سب مل کر یہ کام مکمل کریں گے۔",
    ],
  },
  {
    code: "sd", name: "Sindhi", native: "سنڌي", script: "Arabic", tier: "partial", scheduled: true,
    markers: [], samples: [],
  },
  {
    code: "ks", name: "Kashmiri", native: "کٲشُر", script: "Arabic", tier: "partial", scheduled: true,
    markers: [], samples: [],
  },

  // ---------- Unique scripts ----------
  {
    code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", script: "Gurmukhi", tier: "full", scheduled: true,
    markers: ["ਹੈ", "ਅਤੇ", "ਦੇ", "ਵਿੱਚ", "ਦੀ", "ਨੂੰ", "ਹਨ", "ਨਹੀਂ", "ਇਹ", "ਤੋਂ"],
    samples: [
      "ਪੰਜਾਬ ਭਾਰਤ ਦਾ ਇੱਕ ਖੁਸ਼ਹਾਲ ਸੂਬਾ ਹੈ।",
      "ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ? ਮੈਂ ਠੀਕ ਹਾਂ।",
      "ਇਹ ਕਿਤਾਬ ਬਹੁਤ ਵਧੀਆ ਹੈ ਅਤੇ ਮੈਨੂੰ ਬਹੁਤ ਪਸੰਦ ਆਈ।",
      "ਅਸੀਂ ਸਾਰੇ ਮਿਲ ਕੇ ਇਹ ਕੰਮ ਪੂਰਾ ਕਰਾਂਗੇ।",
    ],
  },
  {
    code: "gu", name: "Gujarati", native: "ગુજરાતી", script: "Gujarati", tier: "full", scheduled: true,
    markers: ["છે", "અને", "ના", "માં", "ની", "ને", "છો", "નથી", "થી", "હું"],
    samples: [
      "ગુજરાત ભારતનું એક સમૃદ્ધ રાજ્ય છે.",
      "નમસ્તે, તમે કેમ છો? હું મજામાં છું.",
      "આ પુસ્તક ખૂબ સરસ છે અને મને બહુ ગમ્યું.",
      "આપણે બધા સાથે મળીને આ કામ પૂરું કરીશું.",
    ],
  },
  {
    code: "or", name: "Odia", native: "ଓଡ଼ିଆ", script: "Odia", tier: "full", scheduled: true,
    markers: ["ଅଛି", "ଏବଂ", "ରେ", "କୁ", "ନାହିଁ", "ଏହି", "ମୁଁ", "ପାଇଁ", "ସେ", "ର"],
    samples: [
      "ଓଡ଼ିଶା ଭାରତର ଏକ ସୁନ୍ଦର ରାଜ୍ୟ।",
      "ନମସ୍କାର, ଆପଣ କେମିତି ଅଛନ୍ତି? ମୁଁ ଭଲ ଅଛି।",
      "ଏହି ବହିଟି ବହୁତ ଭଲ ଏବଂ ମୋତେ ବହୁତ ଭଲ ଲାଗିଲା।",
      "ଆମେ ସମସ୍ତେ ମିଶି ଏହି କାମ ସାରିବୁ।",
    ],
  },
  {
    code: "ta", name: "Tamil", native: "தமிழ்", script: "Tamil", tier: "full", scheduled: true,
    markers: ["உள்ளது", "மற்றும்", "இந்த", "நான்", "அது", "இல்லை", "என்று", "ஒரு", "இது", "நாம்"],
    samples: [
      "தமிழ் உலகின் மிகப் பழமையான மொழிகளில் ஒன்று.",
      "வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்? நான் நன்றாக இருக்கிறேன்.",
      "இந்தப் புத்தகம் மிகவும் நன்றாக உள்ளது, எனக்கு மிகவும் பிடித்தது.",
      "நாம் அனைவரும் சேர்ந்து இந்த வேலையை முடிப்போம்.",
    ],
  },
  {
    code: "te", name: "Telugu", native: "తెలుగు", script: "Telugu", tier: "full", scheduled: true,
    markers: ["ఉంది", "మరియు", "నేను", "ఇది", "అది", "లేదు", "ఒక", "లో", "వారు", "మనం"],
    samples: [
      "తెలుగు ఒక మధురమైన భాష.",
      "నమస్కారం, మీరు ఎలా ఉన్నారు? నేను బాగున్నాను.",
      "ఈ పుస్తకం చాలా బాగుంది, నాకు చాలా నచ్చింది.",
      "మనమందరం కలిసి ఈ పనిని పూర్తి చేద్దాం.",
    ],
  },
  {
    code: "kn", name: "Kannada", native: "ಕನ್ನಡ", script: "Kannada", tier: "full", scheduled: true,
    markers: ["ಇದೆ", "ಮತ್ತು", "ನಾನು", "ಇದು", "ಅದು", "ಇಲ್ಲ", "ಒಂದು", "ನಲ್ಲಿ", "ಅವರು", "ನಾವು"],
    samples: [
      "ಕನ್ನಡ ಒಂದು ಸುಂದರವಾದ ಭಾಷೆ.",
      "ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಿ? ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ.",
      "ಈ ಪುಸ್ತಕ ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ ಮತ್ತು ನನಗೆ ತುಂಬಾ ಇಷ್ಟವಾಯಿತು.",
      "ನಾವೆಲ್ಲರೂ ಸೇರಿ ಈ ಕೆಲಸವನ್ನು ಮುಗಿಸೋಣ.",
    ],
  },
  {
    code: "ml", name: "Malayalam", native: "മലയാളം", script: "Malayalam", tier: "full", scheduled: true,
    markers: ["ഉണ്ട്", "ഞാൻ", "ഇത്", "അത്", "ഇല്ല", "ഒരു", "ന്റെ", "അവർ", "നമുക്ക്", "ആണ്"],
    samples: [
      "മലയാളം കേരളത്തിന്റെ ഭാഷയാണ്.",
      "നമസ്കാരം, സുഖമാണോ? എനിക്ക് സുഖമാണ്.",
      "ഈ പുസ്തകം വളരെ നല്ലതാണ്, എനിക്ക് വളരെ ഇഷ്ടപ്പെട്ടു.",
      "നമുക്കെല്ലാവർക്കും ചേർന്ന് ഈ ജോലി പൂർത്തിയാക്കാം.",
    ],
  },
  {
    code: "sat", name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ", script: "OlChiki", tier: "script", scheduled: true,
    markers: [], samples: [],
  },
  {
    code: "mni", name: "Manipuri (Meitei)", native: "ꯃꯤꯇꯩꯂꯣꯟ", script: "MeiteiMayek", tier: "script", scheduled: true,
    markers: [], samples: [],
  },

  // ---------- Non-scheduled practical classes ----------
  {
    code: "en", name: "English", native: "English", script: "Latin", tier: "full", scheduled: false,
    markers: ["the", "and", "is", "of", "to", "in", "that", "it", "for", "was"],
    samples: [
      "India is a vast country where many languages are spoken every day.",
      "Hello, how are you? I am doing quite well, thank you.",
      "This book is very interesting and I enjoyed reading it a lot.",
      "We will all work together to finish this task properly.",
    ],
  },
  {
    code: "hi-Latn", name: "Hinglish", native: "Hinglish", script: "Latin", tier: "full", scheduled: false,
    markers: ["hai", "aur", "kya", "nahi", "mera", "tum", "bahut", "kaise", "yaar", "hoon"],
    samples: [
      "Bhai yeh movie bahut mast thi, tumne dekhi kya?",
      "Namaste, aap kaise ho? Main bilkul theek hoon, dhanyavaad.",
      "Yaar mujhe yeh kitaab bahut pasand aayi, ekdum zabardast hai.",
      "Hum sab milkar yeh kaam pura karenge, tension mat lo.",
    ],
  },
];

export const BY_CODE: Record<string, Language> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l]),
);

// Human-readable label for each Unicode script we detect.
export const SCRIPT_LABEL: Record<ScriptId, string> = {
  Devanagari: "Devanagari",
  Bengali: "Bengali–Assamese",
  Gurmukhi: "Gurmukhi",
  Gujarati: "Gujarati",
  Odia: "Odia",
  Tamil: "Tamil",
  Telugu: "Telugu",
  Kannada: "Kannada",
  Malayalam: "Malayalam",
  Arabic: "Perso-Arabic",
  OlChiki: "Ol Chiki",
  MeiteiMayek: "Meitei Mayek",
  Latin: "Latin",
  Other: "Other",
};
