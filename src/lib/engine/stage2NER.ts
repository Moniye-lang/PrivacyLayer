import { DetectedEntity, EntityCategory, EntityType } from '@/types';

// Bundled Offline Dictionaries (Zero External APIs)

const MULTICULTURAL_FIRST_NAMES = new Set([
  // African Names
  'Aaliya', 'Kofi', 'Kwame', 'Zola', 'Chidi', 'Amara', 'Nneka', 'Ngozi', 'Tunde', 'Jabari', 'Sekou',
  'Tariq', 'Malik', 'Zainab', 'Fatima', 'Youssef', 'Bilal', 'Omar', 'Amina', 'Rashid', 'Khadija',
  'Adeniyi', 'Oluwanimofe', 'Shalom', 'Oluwaseun', 'Ayomide', 'Temitope', 'Damilola', 'Chioma', 'Amadi',
  'Bisi', 'Femi', 'Kelechi', 'Emeka', 'Nnamdi', 'Simi', 'Yetunde', 'Folake', 'Kunle', 'Segun',
  // Asian Names
  'Ming', 'Ren', 'Hiroshi', 'Wei', 'Mei', 'Kenji', 'Priya', 'Aarav', 'Ananya', 'Rohan',
  'Yuki', 'Chen', 'Li', 'Zhang', 'Siddharth', 'Tanaka', 'Nguyen', 'Kim', 'Park', 'Satoshi', 'Sakura',
  // European, French, Spanish, Latin & Western Names (including accented characters)
  'John', 'Jane', 'Alexander', 'Sarah', 'Robert', 'Emily', 'David', 'Michael', 'Carlos', 'Elena',
  'Mateo', 'Sofia', 'Lucas', 'Isabella', 'Gabriel', 'Camila', 'Marcus', 'Chloe', 'Oliver', 'Emma',
  'Han', 'James', 'William', 'Daniel', 'Matthew', 'Anthony', 'Elizabeth', 'Sophia', 'Mia', 'Ava',
  'Alex', 'Morgan', 'Jessica', 'Karen', 'Lisa', 'Laura', 'Shirley', 'Angela', 'Anna', 'Brenda',
  'Nicole', 'Samantha', 'Katherine', 'Taylor', 'Victoria', 'Abigail', 'Rachel', 'Justin', 'Brandon',
  'Jeff', 'Jeffrey', 'Jeffery', 'Thomas', 'Tom', 'Samuel', 'Sam', 'Christopher', 'Chris', 'Paul', 'Mark', 'Benjamin', 'Ben', 'Timothy', 'Tim',
  'François', 'Francois', 'Dubois', 'Benoît', 'Benoit', 'Hélène', 'Helene', 'Jérôme', 'Jerome', 'Élodie', 'Elodie',
  'Sébastien', 'Sebastien', 'Gérard', 'Gerard', 'Thierry', 'Alain', 'Pierre', 'Jean', 'Marc', 'Luc', 'Jacques',
  'Antoine', 'Guillaume', 'Étienne', 'Etienne', 'Stéphane', 'Stephane', 'Aurélie', 'Aurelie', 'Céline', 'Celine'
]);

const MULTICULTURAL_LAST_NAMES = new Set([
  // African Surnames
  'Okafor', 'Bello', 'Adeyemi', 'Odunlade', 'Adeniyi', 'Oluwanimofe', 'Shalom', 'Mensah', 'Diallo', 'Kamara', 'Balogun', 'Nwachukwu', 'Chukwu', 'Toure',
  'Adewale', 'Adeleke', 'Adebanjo', 'Oladipo', 'Okonkwo', 'Eze', 'Nwosu', 'Obi', 'Odeh', 'Danjuma', 'Gowon',
  'Sow', 'Kone', 'Diop', 'Keita', 'Traore', 'Bah', 'Sesay', 'Kanu', 'Koroma', 'Mwangi', 'Ochieng',
  'Otieno', 'Kariuki', 'Njoroge', 'Kamau', 'Kipchoge', 'Kimani', 'Waweru', 'Kiptoo', 'Mutua', 'Abubakar',
  // European, French, Spanish & Western Surnames
  'Dubois', 'Dupont', 'Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Moreau',
  'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel', 'Fournier',
  'Girard', 'Bonnet', 'Dupuis', 'Fontaine', 'Rousseau', 'Vincent', 'Muller', 'Lambert', 'Faure', 'Mercier',
  'Blanc', 'Guerin', 'Boyer', 'Garnier', 'Chevalier', 'Francois', 'François',
  // Western, Latin & Slavic Surnames
  'Doe', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez',
  'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore',
  'Jackson', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez',
  'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen',
  'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Kowalski', 'Novak', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Mueller', 'Jenkins',
  // Asian & Middle Eastern Surnames
  'Patel', 'Sharma', 'Gupta', 'Singh', 'Wang', 'Li', 'Zhang', 'Chen', 'Liu', 'Yang', 'Huang', 'Zhao',
  'Al-Mansoor', 'Ibrahim', 'Hussein', 'Ali', 'Khan', 'Ahmed', 'Rahman', 'Siddiqui', 'Malik', 'Hassan'
]);

const MULTICULTURAL_FIRST_NAMES_LOWER = new Set(
  Array.from(MULTICULTURAL_FIRST_NAMES).map((n) => n.toLowerCase())
);
const MULTICULTURAL_LAST_NAMES_LOWER = new Set(
  Array.from(MULTICULTURAL_LAST_NAMES).map((n) => n.toLowerCase())
);

const KNOWN_COUNTRIES = new Set([
  'United States', 'USA', 'US', 'Canada', 'United Kingdom', 'UK', 'Germany', 'France', 'Japan',
  'China', 'India', 'Brazil', 'Kenya', 'Nigeria', 'South Africa', 'Australia', 'Singapore',
  'United Arab Emirates', 'UAE', 'Saudi Arabia', 'Israel', 'Mexico', 'Spain', 'Italy', 'Netherlands',
  'Sweden', 'Switzerland', 'South Korea', 'Indonesia', 'Egypt', 'Argentina', 'Chile', 'Colombia'
]);

const KNOWN_STATES = new Set([
  'California', 'New York', 'Texas', 'Florida', 'Illinois', 'Pennsylvania', 'Ohio', 'Georgia',
  'North Carolina', 'Michigan', 'Ontario', 'Quebec', 'Bavaria', 'Maharashtra', 'Tokyo-to'
]);

const KNOWN_CITIES = new Set([
  'New York', 'London', 'Tokyo', 'Nairobi', 'Paris', 'Berlin', 'Toronto', 'Sydney', 'San Francisco',
  'Dubai', 'Lagos', 'Cairo', 'Mumbai', 'Austin', 'Singapore', 'Chicago', 'Los Angeles', 'Seattle',
  'Boston', 'Amsterdam', 'Seoul', 'Beijing', 'Shanghai', 'Bangalore', 'Tel Aviv', 'Hong Kong'
]);

const KNOWN_REGIONS = new Set([
  'EMEA', 'APAC', 'Silicon Valley', 'Bay Area', 'West Coast', 'East Coast', 'LATAM', 'Sub-Saharan Africa',
  'Middle East', 'North America', 'Western Europe', 'Southeast Asia', 'Nordics'
]);

const KNOWN_ORGANIZATIONS = new Set([
  'Acme', 'Acme Corp', 'Microsoft', 'Google', 'Apple', 'Amazon', 'Meta', 'Netflix', 'OpenAI',
  'Anthropic', 'Stripe', 'Vercel', 'Linear', 'Datadog', 'Snowflake', 'Palantir', 'Cloudflare',
  'NASA', 'United Nations', 'UN', 'WHO', 'FBI', 'UNICEF', 'W3C', 'ISO', 'CERN'
]);

const KNOWN_DEPARTMENTS = new Set([
  'Human Resources', 'HR', 'R&D', 'Research & Development', 'Information Technology', 'IT', 'DevOps',
  'Department of Sales', 'Sales Department', 'Department of Engineering', 'Engineering Department',
  'Department of Marketing', 'Marketing Department', 'Department of Finance', 'Finance Department',
  'Department of Legal', 'Legal Department', 'Department of Operations', 'Operations Department'
]);

const KNOWN_UNIVERSITIES = new Set([
  'Harvard', 'Harvard University', 'Stanford', 'Stanford University', 'MIT',
  'Massachusetts Institute of Technology', 'Oxford', 'University of Oxford', 'Cambridge',
  'University of Cambridge', 'UC Berkeley', 'Columbia University', 'Yale', 'Princeton'
]);

const KNOWN_PROJECTS = new Set([
  'Titan', 'Apollo', 'Falcon', 'Phoenix',
  'TrackPricely', 'MOAA', 'Privacy Layer', 'SentinelMask'
]);

const KNOWN_REPOSITORIES = new Set([
  'Repository Sentinel', 'repo aquire1', 'privacy-layer', 'sentinel-core', 'masking-engine'
]);

export function runStage2NER(text: string): DetectedEntity[] {
  const detected: DetectedEntity[] = [];

  // Helper for direct phrase scanning
  const scanPhrases = (
    phraseSet: Set<string>,
    type: EntityType,
    category: EntityCategory,
    confidence: number,
    prefixReason: string
  ) => {
    phraseSet.forEach((phrase) => {
      if (!phrase || phrase.length < 2) return;
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // For short acronyms (<= 3 uppercase chars like 'IT', 'HR', 'UN', 'USA'), match case-sensitively
      const isShortAcronym = phrase.length <= 3 && /^[A-Z0-9&]+$/.test(phrase);
      const regex = new RegExp(`\\b${escaped}\\b`, isShortAcronym ? 'g' : 'gi');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const matchText = match[0];
        const startIndex = match.index;

        // Exclude tech/tool names in code comments or section titles (e.g., "# Stripe & Database Config")
        const lineStart = text.lastIndexOf('\n', startIndex) + 1;
        const rawLineEnd = text.indexOf('\n', startIndex);
        const lineEnd = rawLineEnd === -1 ? text.length : rawLineEnd;
        const currentLine = text.substring(lineStart, lineEnd).trim();

        if (
          type === 'ORGANIZATION' &&
          (currentLine.startsWith('#') || currentLine.startsWith('//') || currentLine.startsWith('/*') || currentLine.startsWith('--')) &&
          !/(?:Inc|Corp|LLC|Ltd|GmbH|PLC)\b/i.test(currentLine)
        ) {
          continue;
        }

        if (type === 'LOCATION') {
          // Exclude country / state names appearing in official document headers / titles
          // (e.g., 'FEDERAL REPUBLIC OF NIGERIA', 'GOVERNMENT OF NIGERIA', 'REPUBLIC OF GHANA')
          const precedingText = text.substring(Math.max(0, startIndex - 80), startIndex);
          if (/(?:FEDERAL\s+REPUBLIC\s+OF|REPUBLIC\s+OF|GOVERNMENT\s+OF|KINGDOM\s+OF|COMMONWEALTH\s+OF|UNITED\s+STATES\s+OF|PEOPLE['’]?S\s+REPUBLIC\s+OF)[\s\S]{0,40}$/i.test(precedingText)) {
            continue;
          }
          if (/(?:FEDERAL\s+REPUBLIC\s+OF|REPUBLIC\s+OF|GOVERNMENT\s+OF|KINGDOM\s+OF)\s+[A-Z\s]+/i.test(currentLine)) {
            continue;
          }
          // If in top header lines (e.g. first 350 chars) of an official identity card or slip, do not mask country name
          const isTopHeader = startIndex < 350;
          if (isTopHeader && /(?:FEDERAL\s+REPUBLIC|NATIONAL\s+IDENTITY|COMMISSION|SMART\s+CARD|OFFICIAL|GOVERNMENT)/i.test(text.substring(0, 350))) {
            continue;
          }
        }

        const isOverlapping = detected.some(
          (e) => Math.max(e.start, startIndex) < Math.min(e.end, startIndex + matchText.length)
        );

        if (!isOverlapping) {
          detected.push({
            id: `ner_${type}_${startIndex}_${Math.random().toString(36).substring(2, 6)}`,
            type,
            category,
            text: matchText,
            start: startIndex,
            end: startIndex + matchText.length,
            confidence,
            reason: `${prefixReason} (${matchText})`,
            placeholder: `[[${type}]]`,
            votes: [
              {
                stage: 'NER',
                type,
                confidence,
                reason: `${prefixReason} matched offline dictionary`,
              },
            ],
          });
        }
      }
    });
  };

  // 1. Projects & Repositories
  scanPhrases(KNOWN_PROJECTS, 'PROJECT_CODENAME', 'CONTEXTUAL', 0.95, 'Project Detector: Recognized project name');
  scanPhrases(KNOWN_REPOSITORIES, 'REPOSITORY', 'CONTEXTUAL', 0.95, 'Project Detector: Recognized repository name');

  // 2. Locations (Countries, States, Cities, Regions)
  scanPhrases(KNOWN_COUNTRIES, 'LOCATION', 'PII', 0.94, 'Location Detector: Country recognized');
  scanPhrases(KNOWN_STATES, 'LOCATION', 'PII', 0.93, 'Location Detector: State / Province recognized');
  scanPhrases(KNOWN_CITIES, 'LOCATION', 'PII', 0.93, 'Location Detector: City recognized');
  scanPhrases(KNOWN_REGIONS, 'LOCATION', 'PII', 0.91, 'Location Detector: Geographical region recognized');

  // 3. Organizations (Companies, Departments, Universities, Non-profits)
  scanPhrases(KNOWN_ORGANIZATIONS, 'ORGANIZATION', 'CONTEXTUAL', 0.94, 'Organization Detector: Company / Body recognized');
  scanPhrases(KNOWN_DEPARTMENTS, 'ORGANIZATION', 'CONTEXTUAL', 0.92, 'Organization Detector: Corporate Department recognized');
  scanPhrases(KNOWN_UNIVERSITIES, 'ORGANIZATION', 'CONTEXTUAL', 0.95, 'Organization Detector: Academic Institution recognized');

  // 4. Multicultural & Unicode First + Last Name Pairs (supports Title Case, ALL CAPS, and lowercase)
  const NON_NAME_PRECURSORS = new Set([
    'contact', 'please', 'primary', 'lead', 'target', 'tell', 'email', 'send', 'meet', 'dear', 'from', 'to',
    'ask', 'call', 'message', 'inform', 'reply', 'forward', 'schedule', 'ping', 'use', 'password', 'key',
    'secret', 'token', 'is', 'was', 'are', 'were', 'will', 'be', 'at', 'for', 'in', 'on', 'by', 'with',
    'and', 'or', 'of', 'this', 'that', 'our', 'my', 'your', 'his', 'her', 'their',
    'launches', 'launching', 'launched', 'rolls', 'rolling', 'rolled', 'goes', 'went', 'starts', 'starting',
    'ends', 'ending', 'releases', 'releasing', 'ships', 'shipping', 'arrives', 'leaves', 'backup'
  ]);
  const fullNameRegex = /\b([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{2,20}(?:[-'][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20})?)[ \t]+([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{2,20}(?:[-'][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20})?)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = fullNameRegex.exec(text)) !== null) {
    const firstName = match[1];
    let lastName = match[2];

    if (NON_NAME_PRECURSORS.has(firstName.toLowerCase())) {
      fullNameRegex.lastIndex = match.index + firstName.length;
      continue;
    }

    // Strip possessive 's or ' from lastName
    const cleanLastName = lastName.replace(/['’]s$/i, '').replace(/['’]$/, '');
    const possessiveSuffixLen = lastName.length - cleanLastName.length;

    // Exclude corporate and bank suffixes from being misread as person names
    const isOrgSuffix = /\b(?:Bank|Microfinance|Ltd|Limited|Inc|Incorporated|PLC|Corp|Corporation|LLC|GmbH)\b/i.test(cleanLastName) ||
                        /\b(?:Bank|Microfinance|Ltd|Limited|Inc|Incorporated|PLC|Corp|Corporation|LLC|GmbH)\b/i.test(firstName);
    if (isOrgSuffix) {
      continue;
    }

    const normFirst = firstName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const normLast = cleanLastName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const isFirstValid = MULTICULTURAL_FIRST_NAMES_LOWER.has(normFirst) || MULTICULTURAL_FIRST_NAMES_LOWER.has(firstName.toLowerCase());
    const isLastValid = MULTICULTURAL_LAST_NAMES_LOWER.has(normLast) || MULTICULTURAL_LAST_NAMES_LOWER.has(cleanLastName.toLowerCase());
    const isBothCapitalized = (/^[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,19}$/.test(firstName) && /^[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,19}$/.test(cleanLastName)) ||
                              (/^[A-Z\u00C0-\u024F\u1E00-\u1EFF]{2,20}$/.test(firstName) && /^[A-Z\u00C0-\u024F\u1E00-\u1EFF]{2,20}$/.test(cleanLastName));

    const isValidNamePair =
      (isFirstValid && isLastValid) ||
      (isFirstValid && /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{2,20}$/.test(cleanLastName) && !NON_NAME_PRECURSORS.has(normLast)) ||
      (isLastValid && /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{2,20}$/.test(firstName) && !NON_NAME_PRECURSORS.has(normFirst)) ||
      (isBothCapitalized && (isFirstValid || isLastValid));

    if (isValidNamePair) {
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length - possessiveSuffixLen;
      const matchText = text.substring(startIndex, endIndex);

      const isOverlapping = detected.some(
        (e) => Math.max(e.start, startIndex) < Math.min(e.end, endIndex)
      );

      if (!isOverlapping) {
        detected.push({
          id: `ner_fullname_${startIndex}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'PERSON_NAME',
          category: 'PII',
          text: matchText,
          start: startIndex,
          end: endIndex,
          confidence: 0.96,
          reason: `Personal Information Detector: Full Person Name recognized (${matchText})`,
          placeholder: '[[PERSON_001]]',
          votes: [
            {
              stage: 'NER',
              type: 'PERSON_NAME',
              confidence: 0.96,
              reason: 'Multicultural gazetteer matched first/last name pair',
            },
          ],
        });
        fullNameRegex.lastIndex = endIndex;
      } else {
        fullNameRegex.lastIndex = match.index + firstName.length;
      }
    } else {
      fullNameRegex.lastIndex = match.index + firstName.length;
    }
  }

  // 5. Individual First Names (only if not already part of a contiguous full name)
  MULTICULTURAL_FIRST_NAMES.forEach((firstName) => {
    const escaped = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const startIndex = m.index;
      let matchText = m[0];
      let endIndex = startIndex + matchText.length;

      // Check if immediately followed by a surname / capitalized name word
      const afterText = text.substring(endIndex);
      const nextWordMatch = /^[ \t]+([A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20}(?:['’]s)?)\b/.exec(afterText);
      if (nextWordMatch) {
        const candidateSurname = nextWordMatch[1].replace(/['’]s$/i, '');
        if (/\b(?:Bank|Microfinance|Ltd|Limited|Inc|Incorporated|PLC|Corp|Corporation|LLC|GmbH)\b/i.test(candidateSurname)) {
          continue;
        }
        // Check if followed by corporate suffix (e.g. "Continental Bank")
        const followingText = text.substring(endIndex + nextWordMatch[0].length);
        if (/^[ \t]+(?:Bank|Microfinance|Ltd|Limited|Inc|Incorporated|PLC|Corp|Corporation|LLC|GmbH)\b/i.test(followingText)) {
          continue;
        }
        const normSurname = candidateSurname.toLowerCase();
        if (MULTICULTURAL_LAST_NAMES_LOWER.has(normSurname) || /^[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,19}$/.test(candidateSurname)) {
          // Contiguous name detected
          matchText = text.substring(startIndex, endIndex + nextWordMatch[0].length - (nextWordMatch[1].length - candidateSurname.length));
          endIndex = startIndex + matchText.length;
        }
      }

      const isOverlapping = detected.some(
        (e) => Math.max(e.start, startIndex) < Math.min(e.end, endIndex)
      );

      if (!isOverlapping) {
        detected.push({
          id: `ner_name_${startIndex}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'PERSON_NAME',
          category: 'PII',
          text: matchText,
          start: startIndex,
          end: endIndex,
          confidence: 0.92,
          reason: `Personal Information Detector: Person Name recognized (${matchText})`,
          placeholder: '[[PERSON_001]]',
          votes: [
            {
              stage: 'NER',
              type: 'PERSON_NAME',
              confidence: 0.92,
              reason: 'Multicultural gazetteer matched first name',
            },
          ],
        });
      }
    }
  });

  return detected;
}
