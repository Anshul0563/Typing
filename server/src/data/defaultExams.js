const exam = (name, organization, category, logo, options = {}) => ({
  name,
  organization,
  category,
  logo: `/assets/exams/${logo}.svg`,
  language: options.language || 'English',
  durationMinutes: options.duration || 10,
  paragraphLength: options.paragraphLength || (options.language === 'Hindi' ? 300 : 350),
  description: options.description || `${organization} typing practice for ${name} in a focused exam-style environment.`,
  scoringRule: options.scoringRule || { mode: 'standard-word', errorPenalty: 1 },
  status: 'active',
  isDefault: true
});

export const examCategories = [
  'SSC',
  'DSSSB',
  'Delhi Police',
  'Railway',
  'Central Armed Police Forces',
  'Education',
  'CSIR',
  'AIIMS',
  'High Courts',
  'State Exams',
  'Practice'
];

export const defaultExams = [
  exam('SSC Stenographer (English)', 'Staff Selection Commission', 'SSC', 'ssc', { description: 'English stenographer typing practice based on SSC-style speed and accuracy expectations.' }),
  exam('SSC Stenographer (Hindi)', 'Staff Selection Commission', 'SSC', 'ssc', { language: 'Hindi', description: 'Hindi stenographer typing practice for SSC candidates with exam-style timing.' }),
  exam('SSC CGL DEST', 'Staff Selection Commission', 'SSC', 'ssc', { duration: 15, paragraphLength: 400, description: 'Data Entry Speed Test practice for SSC CGL aspirants.' }),
  exam('SSC CHSL DEST', 'Staff Selection Commission', 'SSC', 'ssc', { description: 'Data Entry Speed Test practice for SSC CHSL aspirants.' }),

  exam('DSSSB JSA', 'Delhi Subordinate Services Selection Board', 'DSSSB', 'dsssb', { description: 'Typing practice for DSSSB Junior Secretariat Assistant recruitment.' }),
  exam('DSSSB LDC', 'Delhi Subordinate Services Selection Board', 'DSSSB', 'dsssb', { description: 'Typing practice for DSSSB Lower Division Clerk recruitment.' }),
  exam('DSSSB Stenographer', 'Delhi Subordinate Services Selection Board', 'DSSSB', 'dsssb', { description: 'Focused DSSSB stenographer typing practice with clean exam-style passages.' }),

  exam('Delhi Police Head Constable (Ministerial)', 'Delhi Police', 'Delhi Police', 'delhi-police', { description: 'Typing practice for Delhi Police Head Constable Ministerial candidates.' }),

  exam('RRB NTPC', 'Railway Recruitment Board', 'Railway', 'rrb', { description: 'Typing skill test practice for Railway RRB NTPC candidates.' }),

  exam('BSF Head Constable (Ministerial)', 'Border Security Force', 'Central Armed Police Forces', 'bsf', { description: 'Ministerial typing practice for BSF Head Constable candidates.' }),
  exam('CRPF Head Constable (Ministerial)', 'Central Reserve Police Force', 'Central Armed Police Forces', 'crpf', { description: 'Ministerial typing practice for CRPF Head Constable candidates.' }),
  exam('CISF Head Constable (Ministerial)', 'Central Industrial Security Force', 'Central Armed Police Forces', 'cisf', { description: 'Ministerial typing practice for CISF Head Constable candidates.' }),
  exam('ITBP Head Constable (Ministerial)', 'Indo-Tibetan Border Police', 'Central Armed Police Forces', 'itbp', { description: 'Ministerial typing practice for ITBP Head Constable candidates.' }),
  exam('SSB Head Constable (Ministerial)', 'Sashastra Seema Bal', 'Central Armed Police Forces', 'ssb', { description: 'Ministerial typing practice for SSB Head Constable candidates.' }),

  exam('KVS LDC', 'Kendriya Vidyalaya Sangathan', 'Education', 'kvs', { description: 'Typing practice for Kendriya Vidyalaya Sangathan LDC candidates.' }),
  exam('NVS LDC', 'Navodaya Vidyalaya Samiti', 'Education', 'nvs', { description: 'Typing practice for Navodaya Vidyalaya Samiti LDC candidates.' }),

  exam('CSIR CASE', 'Council of Scientific and Industrial Research', 'CSIR', 'csir', { description: 'Typing practice for CSIR CASE recruitment candidates.' }),

  exam('AIIMS CRE', 'All India Institute of Medical Sciences', 'AIIMS', 'aiims', { description: 'Typing practice for AIIMS CRE clerical and data entry roles.' }),

  exam('Supreme Court JCA', 'Supreme Court of India', 'High Courts', 'supreme-court', { description: 'Typing practice for Supreme Court Junior Court Assistant candidates.' }),
  exam('Delhi High Court JJA', 'Delhi High Court', 'High Courts', 'delhi-hc', { description: 'Typing practice for Delhi High Court Junior Judicial Assistant candidates.' }),

  exam('UPSSSC Stenographer', 'Uttar Pradesh Subordinate Services Selection Commission', 'State Exams', 'upsssc', { description: 'Typing practice for UPSSSC stenographer candidates.' }),
  exam('UPSSSC Junior Assistant', 'Uttar Pradesh Subordinate Services Selection Commission', 'State Exams', 'upsssc', { duration: 5, description: 'Typing practice for UPSSSC Junior Assistant candidates.' }),
  exam('Rajasthan LDC', 'Government of Rajasthan', 'State Exams', 'rajasthan-gov', { description: 'Typing practice for Rajasthan LDC candidates.' }),
  exam('Bihar SSC Stenographer', 'Bihar Staff Selection Commission', 'State Exams', 'bihar-ssc', { description: 'Typing practice for Bihar SSC stenographer candidates.' }),
  exam('Haryana CET Clerk', 'Haryana Staff Selection Commission', 'State Exams', 'haryana-ssc', { description: 'Typing practice for Haryana CET Clerk candidates.' }),

  exam('English Typing Practice', 'SAS Academy', 'Practice', 'practice', { duration: 5, paragraphLength: 180, description: 'Short English typing practice for daily speed and accuracy improvement.' }),
  exam('Hindi Typing Practice', 'SAS Academy', 'Practice', 'practice', { language: 'Hindi', duration: 5, paragraphLength: 160, description: 'Short Hindi typing practice for daily speed and accuracy improvement.' })
];
