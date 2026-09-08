import { EntityCategory, EntityType, PriorityLevel } from '../../../types';

export interface ContextPrecursorRule {
  type: EntityType;
  category: EntityCategory;
  pattern: RegExp;
  groupIndex: number;
  reason: string;
  confidence: number;
  priority?: number;
  placeholderPrefix?: string;
}

/**
 * Universal Personal Data Precursor Rules covering all major categories of identifiable information:
 * - Identification Numbers
 * - Financial Information
 * - Contact Information
 * - Employment Records
 * - Biometric Data
 * - Health Information
 * - Legal Records
 * - Education History
 * - Online Behaviour
 * - Geographical Data
 * - Political Affiliations
 * - Religious Beliefs
 * - Social Media Activity
 * - Technological Data
 * - Travel Records
 * - Consumer Preferences
 * - Physical Characteristics
 * - Family Information
 * - Communication Records
 * - Membership and Affiliations
 * - Intellectual Property
 * - Public Contributions
 * - Recreational Interests
 * - Professional Qualifications
 * - Psychological Traits
 * - Behavioral Patterns
 * - Ownership Records
 * - Test Scores and Evaluations
 * - Personal Preferences
 * - Audio and Video Recordings
 * - Language and Communication Style
 * - Personal Achievements
 * - Cultural Affinities
 * - Government Records
 * - Military Records
 * - Immigration Status
 * - Emergency Contacts
 * - Sexual Orientation
 * - Substance Use
 * - Dependency Information
 * - Leisure and Lifestyle
 * - Hobbies and Interests
 * - Social Connections
 * - Digital Content
 * - Text-Based Content
 * - Subscription Information
 * - Medical Contacts
 * - Personal Beliefs
 * - Security Information
 */
export const PERSONAL_DATA_CONTEXT_RULES: ContextPrecursorRule[] = [
  // 1. Identification Numbers
  {
    type: 'SSN_NATIONAL_ID',
    category: 'PII',
    pattern: /\b(?:Social\s+Security\s+Number|Social\s+Security|SSN|National\s+Identification\s+Number|National\s+Identity\s+Number|National\s+ID|NIN|Civil\s+ID|State\s+ID|Voter\s+ID)\s*[:=]\s*["']?([A-Za-z0-9\-_/][A-Za-z0-9\-_/[^\S\r\n]]{2,30}[A-Za-z0-9\-_/]|[A-Za-z0-9\-_/]{4,32})["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Identification Number precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'SSN',
  },
  {
    type: 'EMPLOYEE_ID',
    category: 'IDENTIFIER',
    pattern: /\b(?:Employee\s+ID|Staff\s+ID|Badge\s+Number|Worker\s+ID|Personnel\s+Number)\s*[:=]\s*["']?([A-Za-z0-9\-_/#]{3,30})["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Employee ID precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 10,
    placeholderPrefix: 'EMPLOYEE',
  },
  {
    type: 'PASSPORT_NUMBER',
    category: 'PII',
    pattern: /\b(?:Passport\s+Number|Passport\s+No\.?|Passport\s+#)\s*[:=]\s*["']?([A-Za-z0-9]{6,16})["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Passport Number precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'PASSPORT',
  },

  // 2. Financial Information
  {
    type: 'BANK_ACCOUNT',
    category: 'FINANCIAL',
    pattern: /\b(?:Bank\s+Account\s+Number|Bank\s+Account|Account\s+Number|Acct\s+No\.?|IBAN|SWIFT|Sort\s+Code|Routing\s+Number)\s*[:=]\s*["']?([A-Za-z0-9\-[^\S\r\n]]{4,34})["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Bank Account Information precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'BANK_ACCOUNT',
  },
  {
    type: 'CREDIT_CARD',
    category: 'FINANCIAL',
    pattern: /\b(?:Credit\s+Card\s+Information|Credit\s+Card(?:\s+Number)?|Debit\s+Card(?:\s+Number)?|Card\s+Number|CVV|CVC|Card\s+Verification)\s*[:=]\s*["']?([0-9\s\-]{3,24})["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Credit Card Information precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CREDIT_CARD',
  },
  {
    type: 'FINANCIAL_METRIC',
    category: 'FINANCIAL',
    pattern: /\b(?:Investment\s+Portfolio|Portfolio\s+Value|Stock\s+Holdings?|Shareholdings?|Equity\s+Stake|Assets?\s+Under\s+Management|Loan\s+Records?|Loan\s+Amount|Loan\s+Balance|Mortgage(?:\s+Balance)?|Payment\s+History|Billing\s+Record|Transaction\s+History|Online\s+Purchase\s+Records?|Order\s+History|Shopping\s+History|Cart\s+Total|Political\s+Donations?|Campaign\s+Contribution|Religious\s+Contributions?|Tithe|Zakat)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Financial asset / investment / transaction precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'FINANCIAL',
  },

  // 3. Contact Information
  {
    type: 'EMAIL_ADDRESS',
    category: 'PII',
    pattern: /\b(?:Email\s+Address|Email|E-mail|Personal\s+Email|Work\s+Email|Primary\s+Email)\s*[:=]\s*["']?([^\s,;]+@[^\s,;]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Email Address precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 10,
    placeholderPrefix: 'EMAIL',
  },
  {
    type: 'ADDRESS',
    category: 'PII',
    pattern: /\b(?:Home\s+Address|Work\s+Address|Residential\s+Address|Physical\s+Address|Office\s+Address|Street\s+Address)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Physical Address precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'ADDRESS',
  },
  {
    type: 'PHONE_NUMBER',
    category: 'PII',
    pattern: /\b(?:Phone\s+Number|Phone|Mobile(?:\s+Number)?|Cell(?:\s+Phone)?|Telephone|Tel)\s*[:=]\s*["']?([+0-9\s\-\.\(\)]{7,22})["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Phone Number precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 10,
    placeholderPrefix: 'PHONE',
  },
  {
    type: 'URL',
    category: 'CONTEXTUAL',
    pattern: /\b(?:Personal\s+Website\s+URL|Personal\s+Website|Portfolio\s+URL|Website|Homepage)\s*[:=]\s*["']?([^\s<>'"]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Personal Website URL precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 10,
    placeholderPrefix: 'URL',
  },

  // 4. Employment Records
  {
    type: 'FINANCIAL_METRIC',
    category: 'FINANCIAL',
    pattern: /\b(?:Salary\s+Information|Salary|Annual\s+Salary|Base\s+Salary|Monthly\s+Salary|Hourly\s+Rate|Wage|Compensation|Bonus|Stipend)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Salary / Compensation precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'FINANCIAL',
  },
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Job\s+Title|Professional\s+Role|Designation|Employment\s+History|Past\s+Employers?|Previous\s+Role|Performance\s+Reviews?|Annual\s+Appraisal|Evaluation\s+Rating|KPI\s+Score|Professional\s+Licen[sc]es?|Medical\s+Licen[sc]e|Bar\s+Number|CPA\s+Licen[sc]e)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Employment Record precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 5. Biometric Data
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Fingerprint(?:\s+(?:Scan|Data|Template|Record|ID))?|Retina\s+Scan(?:\s+Data)?|Iris\s+Scan|Facial\s+Recognition\s+Data|Facial\s+Recognition|Face\s+Template|Voice\s+Recording(?:\s+ID)?|Voiceprint(?:\s+Data)?|DNA\s+Profile|Genetic\s+Profile|STR\s+Loci|Biometric\s+Data)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Biometric Data precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 6. Health Information
  {
    type: 'MEDICAL_RECORD',
    category: 'MEDICAL',
    pattern: /\b(?:Medical\s+History|Clinical\s+Notes|Past\s+Conditions?|Prescription\s+Information|Prescription|Medication|Dosage|Prescribed\s+Drugs?|Rx|Blood\s+Type|Blood\s+Group|Immunisation\s+Records?|Immunization\s+Records?|Vaccination\s+Records?|Allergy\s+Information|Allergies|Allergic\s+to|Anaphylaxis\s+Triggers?|Medical\s+Diagnos(?:is|es)|Therapy\s+Records?|Psychotherapy\s+Notes?|Hospital\s+Preferences?|Blood\s+Donor\s+Information|Blood\s+Donor|Organ\s+Donor\s+Status|Organ\s+Donor|Contact\s+Information\s+for\s+Doctors?|Primary\s+Doctor|Physician)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Health Information / Medical Record precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'MEDICAL',
  },

  // 7. Legal Records
  {
    type: 'LEGAL_REFERENCE',
    category: 'LEGAL',
    pattern: /\b(?:Criminal\s+Record|Conviction\s+History|Felony\s+Record|Civil\s+Court\s+Records?|Court\s+Docket|Case\s+Number|Lawsuit\s+Record|Litigation\s+Details?|Arrest\s+Records?|Booking\s+Number|Arrest\s+Warrant|Driving\s+Offences?|Traffic\s+Violations?|Speeding\s+Citation|DUI\s+Record|Property\s+Deeds?|Parcel\s+Number|Power\s+of\s+Attorney|Guardian\s+Records?|Support\s+Payment\s+Records?|Special\s+Needs\s+Trusts?|Public\s+Testimon(?:y|ies)|Copyrights?|Trademarks?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Legal Record precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'LEGAL',
  },

  // 8. Education History
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Academic\s+Transcripts?|GPA|Cumulative\s+Grade|Diplomas?\s+and\s+Certificates?|Degree\s+Earned|Graduation\s+Year|Standardi[sz]ed\s+Test\s+Scores?|SAT\s+Score|ACT\s+Score|GRE\s+Score|GMAT\s+Score|MCAT\s+Score|LSAT\s+Score|TOEFL\s+Score|IELTS\s+Score|Letters?\s+of\s+Recommendation)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Education History precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 9. Online Behaviour
  {
    type: 'IP_ADDRESS',
    category: 'PII',
    pattern: /\b(?:IP\s+Address|Static\s+IP|Client\s+IP)\s*[:=]\s*["']?([^\r\n;,\s]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: IP Address precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 10,
    placeholderPrefix: 'IP',
  },
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Browser\s+History|Browsing\s+History|Search\s+Queries?|Visited\s+Websites?|Cookies?|Session\s+Cookie|Cookie\s+ID)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Online Behaviour precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 10. Geographical Data
  {
    type: 'LOCATION',
    category: 'CONTEXTUAL',
    pattern: /\b(?:GPS\s+Coordinates|Geolocation|Coordinates|Latitude\s*\/\s*Longitude|Travel\s+Itinerar(?:y|ies)|Flight\s+Plan|Travel\s+Schedule|Location\s+History|Check-ins?(?:\s+on\s+Social\s+Media)?|Checked\s+in\s+at|Traffic\s+and\s+Speed\s+Camera\s+Records?|Hotel\s+Reservations?|Hotel\s+Booking|Car\s+Rental\s+Records?|WiFi\s+Networks?(?:\s+Joined)?|SSID|BSSID)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Geographical / Location Data precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'LOCATION',
  },

  // 11. Political Affiliations
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Party\s+Membership|Political\s+Party|Registered\s+Party|Political\s+Alignment|Political\s+Affiliations?|Voting\s+Records?|Voter\s+Participation|Activism\s+Records?|Protest\s+Attendance|Political\s+Online\s+Posts?|Political\s+Opinions?|Political\s+Beliefs?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Political Affiliation precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 12. Religious Beliefs
  {
    type: 'ORGANIZATION',
    category: 'CONTEXTUAL',
    pattern: /\b(?:Church\s+or\s+Religious\s+Group\s+Membership|Church\s+Membership|Mosque\s+Membership|Synagogue|Parish|Congregation|Religious\s+Affiliation)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Religious Group Membership precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'ORGANIZATION',
  },
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Religious\s+Texts?\s+Owned|Participation\s+in\s+Religious\s+Events|Religious\s+Social\s+Media\s+Groups?\s+Joined|Religious\s+Doctrine\s+Interpretations?|Religious\s+Beliefs?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Religious Belief precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 13. Social Media Activity
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Facebook\s+Likes?\s+and\s+Reactions?|Tweets?\s+and\s+Retweets?|Twitter\s+Activity|Instagram\s+Posts?|LinkedIn\s+Connections?|YouTube\s+Comments?|Social\s+Media\s+Activity)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Social Media Activity precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 14. Technological Data
  {
    type: 'IP_ADDRESS',
    category: 'PII',
    pattern: /\b(?:MAC\s+Address|Hardware\s+Address)\s*[:=]\s*["']?([0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2})["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: MAC Address precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 20,
    placeholderPrefix: 'IP',
  },
  {
    type: 'SSN_NATIONAL_ID',
    category: 'PII',
    pattern: /\b(?:Device\s+IMEI\s+Number|Device\s+IMEI|IMEI(?:\s+Number)?)\s*[:=]\s*["']?([0-9\s\-]{14,18})["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Device IMEI precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 20,
    placeholderPrefix: 'SSN',
  },
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Browser\s+Type\s+and\s+Version|User\s+Agent|Installed\s+Apps?|Installed\s+Applications?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Technological Data precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 15. Travel Records
  {
    type: 'CUSTOMER_ID',
    category: 'IDENTIFIER',
    pattern: /\b(?:Frequent\s+Flyer\s+Information|Frequent\s+Flyer(?:\s+Number)?|Mileage\s+Program\s+ID)\s*[:=]\s*["']?([A-Za-z0-9\-]{4,25})["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Frequent Flyer Information precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 10,
    placeholderPrefix: 'CUSTOMER',
  },
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Flight\s+Booking\s+Records?|Flight\s+Booking|PNR|Booking\s+Reference|E-Ticket(?:\s+Number)?|Travel\s+Insurance\s+Policies?|Insurance\s+Policy\s+Number)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Travel Record precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 16. Consumer Preferences
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Product\s+Reviews?\s+Posted|Loyalty\s+Program\s+Memberships?|Rewards\s+Number|Online\s+Wish\s+Lists?|Food\s+Delivery\s+Orders?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Consumer Preferences precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 17. Physical Characteristics
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Height\s+and\s+Weight|Height|Weight|Eye\s+Colou?r|Hair\s+Colou?r|Tattoos?\s+and\s+Scars?|Distinguishing\s+Marks?|Clothing\s+Sizes?|Shoe\s+Size)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Physical Characteristics precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 18. Family Information
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Marital\s+Status|Genealogy\s+Records?|Family\s+Tree|Photos?\s+of\s+Family|Spouse(?:'s)?\s+Employment\s+Information|Spouse\s+Employer)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Family Information precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },
  {
    type: 'PERSON_NAME',
    category: 'PII',
    pattern: /\b(?:Names?\s+and\s+Ages?\s+of\s+Children|Children(?:'s\s+Names)?|Spouse(?:'s\s+Name)?|Dependents?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Family Names precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'PERSON',
  },

  // 19. Communication Records
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Text\s+Messages?|Email\s+Correspondence|Call\s+Logs?|Voice\s*Mails?|Social\s+Media\s+Messages?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Communication Record precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 20. Membership and Affiliations
  {
    type: 'ORGANIZATION',
    category: 'CONTEXTUAL',
    pattern: /\b(?:Union\s+Membership|Labor\s+Union|Professional\s+Associations?|Alumni\s+Groups?|Sports\s+Club\s+Memberships?|Volunteer\s+Memberships?|Country\s+Club\s+Memberships?|Youth\s+Groups?|Seniors\s+Groups?|Ethnic\s+or\s+Cultural\s+Organi[sz]ations?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Membership / Affiliation precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'ORGANIZATION',
  },

  // 21. Intellectual Property
  {
    type: 'SOURCE_CODE_SECRET',
    category: 'SECRET',
    pattern: /\b(?:Software\s+Code|Proprietary\s+Algorithm)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Software Code / Secret precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'SECRET',
  },
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Research\s+Papers?|Unpublished\s+Manuscript)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Research Paper precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 22. Public Contributions
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Letters?\s+to\s+the\s+Editor|Comments?\s+on\s+Public\s+Forums?|Petitions?\s+Signed|Civic\s+Participation\s+Records?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Public Contribution precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 23. Recreational Interests
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Hobby\s+Groups?\s+Joined|Equipment\s+Purchases?|Event\s+Tickets?\s+Purchased|Game\s+Achievements?|GamerTag|Steam\s+ID|PSN\s+ID|Music\s+Playlists?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Recreational Interests precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 24. Professional Qualifications
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Certifications?|Professional\s+Certificate|Accreditations?|Portfolio|References?|Professional\s+References?|Awards?\s+and\s+Honors?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Professional Qualifications precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 25. Psychological Traits & Behavioral Patterns
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Personality\s+Test\s+Results?|Emotional\s+Assessments?|Mood\s+Tracking\s+Data|Sleep\s+Tracking\s+Data|Physical\s+Activity\s+Logs?|Nutrition\s+Logs?|Stress\s+Level\s+Measurements?|Social\s+Interaction\s+Logs?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Psychological Traits / Behavioral Pattern precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 26. Ownership Records
  {
    type: 'LEGAL_REFERENCE',
    category: 'LEGAL',
    pattern: /\b(?:Property\s+Deeds?|Parcel\s+Number|Collector['’]?s\s+Items?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Ownership Record precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'LEGAL',
  },
  {
    type: 'SSN_NATIONAL_ID',
    category: 'PII',
    pattern: /\b(?:Vehicle\s+Registrations?|VIN|License\s+Plate(?:\s+Number)?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Vehicle Registration precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'SSN',
  },
  {
    type: 'URL',
    category: 'CONTEXTUAL',
    pattern: /\b(?:Domain\s+Registrations?|Registered\s+Domain)\s*[:=]\s*["']?([^\s<>'"]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Domain Registration precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 10,
    placeholderPrefix: 'URL',
  },

  // 27. Test Scores and Evaluations
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:IQ\s+Tests?|IQ\s+Score|Skill\s+Assessment\s+Results?|Employee\s+Evaluations?|Academic\s+Exams?|Health\s+and\s+Safety\s+Tests?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Test Scores and Evaluation precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 28. Personal Preferences
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Food\s+Preferences?|Language\s+Preferences?|UI\/UX\s+Settings(?:\s+on\s+Apps)?|Book\s+Preferences?|Colou?r\s+Preferences?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Personal Preference precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 29. Audio and Video Recordings & Content
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Voicemails?|Video\s+Messages?|Surveillance\s+Footage|Podcast\s+Appearances?|Personal\s+Videos?|Preferred\s+Language|Writing\s+Samples?|Speech\s+Patterns?|Sign\s+Language\s+Use|Slang\s+or\s+Jargon\s+Used)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Audio/Video/Language Style precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 30. Personal Achievements & Cultural Affinities
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Competition\s+Wins?|Scholarships?|Completed\s+Challenges?\s+or\s+Goals?|Endorsements?|Ethnic\s+Background|Festivals?\s+Celebrated|Cultural\s+Association\s+Memberships?|Preferred\s+Media|Culinary\s+Preferences?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Personal Achievements / Cultural Affinities precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 31. Government & Military Records
  {
    type: 'LEGAL_REFERENCE',
    category: 'LEGAL',
    pattern: /\b(?:Census\s+Data|Social\s+Benefits\s+Records?|Licen[sc]es?\s+Issued|Public\s+Office\s+Records?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Government Records precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'LEGAL',
  },
  {
    type: 'SSN_NATIONAL_ID',
    category: 'PII',
    pattern: /\b(?:Voter\s+Registration|Military\s+ID|Service\s+Records?|Service\s+Number|Veteran\s+Status|VA\s+File\s+Number|Security\s+Clearances?|Medals?\s+and\s+Awards?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Military / Voter Identification precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'SSN',
  },

  // 32. Immigration Status
  {
    type: 'PASSPORT_NUMBER',
    category: 'PII',
    pattern: /\b(?:Visa\s+Records?|Visa\s+Number|Work\s+Permits?|Work\s+Authorization|EAD\s+Number|Passport\s+Stamps?)\s*[:=]\s*["']?([A-Za-z0-9\-_]{5,25})["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Immigration / Visa Status precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'PASSPORT',
  },

  // 33. Emergency Contacts
  {
    type: 'PERSON_NAME',
    category: 'PII',
    pattern: /\b(?:Next\s+of\s+Kin|Medical\s+Emergency\s+Contacts?|Workplace\s+Emergency\s+Contacts?|Child(?:’s)?\s+School\s+Emergency\s+Contacts?|Emergency\s+Contact(?:\s+Name)?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Emergency Contact Name precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'PERSON',
  },

  // 34. Sexual Orientation & Substance Use
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Sexual\s+Orientation|Relationship\s+Status|Dating\s+App\s+Profiles?|LGBTQ\+\s+Organi[sz]ation\s+Memberships?|Public\s+Statements|Substance\s+Use|Rehab\s+Records?|Drug\s+Test\s+Results?|Tobacco\s+Use\s+Records?|Alcohol\s+Purchase\s+Records?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Sexual Orientation / Substance Use precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 35. Dependency Information
  {
    type: 'LEGAL_REFERENCE',
    category: 'LEGAL',
    pattern: /\b(?:Child\s+Care\s+Records?|Power\s+of\s+Attorney(?:\s+Documents?)?|Guardian\s+Records?|Support\s+Payment\s+Records?|Special\s+Needs\s+Trusts?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Dependency Information precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'LEGAL',
  },

  // 36. Leisure, Lifestyle, Hobbies & Social Connections
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Fitness\s+Club\s+Memberships?|Subscription\s+Services?|Club\s+Memberships?|Sports\s+Participation|Hobby-related\s+Purchases?|Art\s+Collections?|Musical\s+Instruments?\s+Owned|Sporting\s+Equipment|Crafting\s+Supplies?|Cooking\s+Gear|Friendship\s+Connections?(?:\s+on\s+Social\s+Media)?|Family\s+Trees?|Personal\s+References?|Co-worker\s+Relationships?|Mentor-Mentee\s+Relationships?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Leisure / Hobbies / Social Connections precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 37. Digital Content & Text-Based Content
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:E-books?\s+Owned|Digital\s+Movies?|Download\s+History|Cloud\s+Stored\s+Data|Mobile\s+App\s+Downloads?|Blog\s+Posts?|Diaries\s+or\s+Journals?|Chat\s+Histories?|Forum\s+Posts?|Published\s+Articles?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Digital Content / Text Content precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 38. Subscription Information
  {
    type: 'ORGANIZATION',
    category: 'CONTEXTUAL',
    pattern: /\b(?:Magazine\s+Subscriptions?|Streaming\s+Services?|Paid\s+News\s+Services?|SaaS\s+Subscriptions?|Charity\s+Subscriptions?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Subscription Information precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'ORGANIZATION',
  },

  // 39. Personal Beliefs
  {
    type: 'CUSTOM_TERM',
    category: 'CUSTOM',
    pattern: /\b(?:Ethical\s+or\s+Moral\s+Stances?|Dietary\s+Choices?(?:\s*\(e\.g\.,?\s*Veganism\))?|Dietary\s+Choice|Political\s+Beliefs?|Philosophical\s+Beliefs?|Religious\s+Doctrine\s+Interpretations?)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Personal Belief precursor',
    confidence: 0.98,
    priority: PriorityLevel.REGEX + 15,
    placeholderPrefix: 'CUSTOM_TERM',
  },

  // 40. Security Information
  {
    type: 'PASSWORD',
    category: 'SECRET',
    pattern: /\b(?:Passwords?|Passphrase|Master\s+Password|User\s+Password|Account\s+Password|Two-Factor\s+Authentication\s+Methods?|Two-Factor(?:\s+Auth)?|2FA(?:\s+Code)?|Recovery\s+Codes?|Backup\s+Codes?|OTP)\s*[:=]\s*["']?([^\s"';,]{4,128})["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Security Information / Password / 2FA precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 25,
    placeholderPrefix: 'PASSWORD',
  },
  {
    type: 'PASSWORD',
    category: 'SECRET',
    pattern: /\b(?:Security\s+Questions?\s+and\s+Answers?|Security\s+Question|Security\s+Answer|Biometric\s+Security\s+Data|FaceID\s+Encryption\s+Seed)\s*[:=]\s*["']?([^"'\r\n;|]+)["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Security Question / Biometric Secret precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 25,
    placeholderPrefix: 'PASSWORD',
  },
];
