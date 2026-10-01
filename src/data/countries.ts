// Country data for the programmatic /vault/[country] landing pages.
//
// Accuracy note: `idName` is the country's primary personal identity document.
// These are researched, not invented. Where a country has no single national ID
// (e.g. US, Canada, Australia), idName names the documents people actually carry.
// Document CATEGORIES (passport, driver's licence, vehicle papers) are universal
// and safe to list everywhere; only the local ID name is country-specific.

export interface Country {
  slug: string;
  name: string;      // display name, used in copy as "in {name}"
  region: string;
  idName: string;    // primary identity document in that country
  demonym?: string;  // e.g. "South African"
}

export const countries: Country[] = [
  // ---- Africa ----
  { slug: 'south-africa', name: 'South Africa', region: 'Africa', idName: 'Smart ID Card', demonym: 'South African' },
  { slug: 'kenya', name: 'Kenya', region: 'Africa', idName: 'National ID card', demonym: 'Kenyan' },
  { slug: 'nigeria', name: 'Nigeria', region: 'Africa', idName: 'National ID card (NIN)', demonym: 'Nigerian' },
  { slug: 'ghana', name: 'Ghana', region: 'Africa', idName: 'Ghana Card', demonym: 'Ghanaian' },
  { slug: 'egypt', name: 'Egypt', region: 'Africa', idName: 'National ID card', demonym: 'Egyptian' },
  { slug: 'morocco', name: 'Morocco', region: 'Africa', idName: 'National Electronic Identity Card (CNIE)', demonym: 'Moroccan' },
  { slug: 'zimbabwe', name: 'Zimbabwe', region: 'Africa', idName: 'National ID', demonym: 'Zimbabwean' },
  { slug: 'zambia', name: 'Zambia', region: 'Africa', idName: 'National Registration Card', demonym: 'Zambian' },
  { slug: 'botswana', name: 'Botswana', region: 'Africa', idName: 'Omang (National ID)', demonym: 'Motswana' },
  { slug: 'namibia', name: 'Namibia', region: 'Africa', idName: 'National ID card', demonym: 'Namibian' },
  { slug: 'tanzania', name: 'Tanzania', region: 'Africa', idName: 'National ID (NIDA)', demonym: 'Tanzanian' },
  { slug: 'uganda', name: 'Uganda', region: 'Africa', idName: 'National ID card', demonym: 'Ugandan' },
  { slug: 'rwanda', name: 'Rwanda', region: 'Africa', idName: 'National ID card', demonym: 'Rwandan' },

  // ---- Europe ----
  { slug: 'united-kingdom', name: 'the United Kingdom', region: 'Europe', idName: 'passport or Biometric Residence Permit', demonym: 'British' },
  { slug: 'ireland', name: 'Ireland', region: 'Europe', idName: 'Passport Card or Public Services Card', demonym: 'Irish' },
  { slug: 'germany', name: 'Germany', region: 'Europe', idName: 'Personalausweis (national ID card)', demonym: 'German' },
  { slug: 'france', name: 'France', region: 'Europe', idName: "Carte Nationale d'Identité", demonym: 'French' },
  { slug: 'spain', name: 'Spain', region: 'Europe', idName: 'DNI (Documento Nacional de Identidad)', demonym: 'Spanish' },
  { slug: 'italy', name: 'Italy', region: 'Europe', idName: "Carta d'Identità", demonym: 'Italian' },
  { slug: 'portugal', name: 'Portugal', region: 'Europe', idName: 'Cartão de Cidadão', demonym: 'Portuguese' },
  { slug: 'netherlands', name: 'the Netherlands', region: 'Europe', idName: 'Identiteitskaart (ID card)', demonym: 'Dutch' },
  { slug: 'belgium', name: 'Belgium', region: 'Europe', idName: 'eID card', demonym: 'Belgian' },
  { slug: 'poland', name: 'Poland', region: 'Europe', idName: 'Dowód osobisty (national ID)', demonym: 'Polish' },
  { slug: 'sweden', name: 'Sweden', region: 'Europe', idName: 'National ID card', demonym: 'Swedish' },
  { slug: 'switzerland', name: 'Switzerland', region: 'Europe', idName: 'Identitätskarte', demonym: 'Swiss' },
  { slug: 'austria', name: 'Austria', region: 'Europe', idName: 'Personalausweis', demonym: 'Austrian' },
  { slug: 'greece', name: 'Greece', region: 'Europe', idName: 'National ID card', demonym: 'Greek' },

  // ---- Middle East ----
  { slug: 'united-arab-emirates', name: 'the United Arab Emirates', region: 'Middle East', idName: 'Emirates ID', demonym: 'Emirati' },
  { slug: 'saudi-arabia', name: 'Saudi Arabia', region: 'Middle East', idName: 'National ID (or Iqama for residents)', demonym: 'Saudi' },
  { slug: 'qatar', name: 'Qatar', region: 'Middle East', idName: 'Qatari ID (QID)', demonym: 'Qatari' },
  { slug: 'kuwait', name: 'Kuwait', region: 'Middle East', idName: 'Civil ID', demonym: 'Kuwaiti' },
  { slug: 'oman', name: 'Oman', region: 'Middle East', idName: 'Resident/National ID card', demonym: 'Omani' },
  { slug: 'bahrain', name: 'Bahrain', region: 'Middle East', idName: 'CPR Smart Card', demonym: 'Bahraini' },
  { slug: 'turkey', name: 'Turkey', region: 'Middle East', idName: 'T.C. Kimlik Kartı (national ID)', demonym: 'Turkish' },
  { slug: 'israel', name: 'Israel', region: 'Middle East', idName: 'Teudat Zehut (ID card)', demonym: 'Israeli' },

  // ---- Asia-Pacific ----
  { slug: 'india', name: 'India', region: 'Asia-Pacific', idName: 'Aadhaar Card', demonym: 'Indian' },
  { slug: 'china', name: 'China', region: 'Asia-Pacific', idName: 'Resident Identity Card', demonym: 'Chinese' },
  { slug: 'japan', name: 'Japan', region: 'Asia-Pacific', idName: 'My Number Card', demonym: 'Japanese' },
  { slug: 'south-korea', name: 'South Korea', region: 'Asia-Pacific', idName: 'Resident Registration Card', demonym: 'South Korean' },
  { slug: 'philippines', name: 'the Philippines', region: 'Asia-Pacific', idName: 'PhilID (PhilSys)', demonym: 'Filipino' },
  { slug: 'indonesia', name: 'Indonesia', region: 'Asia-Pacific', idName: 'KTP (e-KTP)', demonym: 'Indonesian' },
  { slug: 'malaysia', name: 'Malaysia', region: 'Asia-Pacific', idName: 'MyKad', demonym: 'Malaysian' },
  { slug: 'singapore', name: 'Singapore', region: 'Asia-Pacific', idName: 'NRIC', demonym: 'Singaporean' },
  { slug: 'thailand', name: 'Thailand', region: 'Asia-Pacific', idName: 'National ID card', demonym: 'Thai' },
  { slug: 'vietnam', name: 'Vietnam', region: 'Asia-Pacific', idName: 'Citizen Identity Card (CCCD)', demonym: 'Vietnamese' },
  { slug: 'pakistan', name: 'Pakistan', region: 'Asia-Pacific', idName: 'CNIC', demonym: 'Pakistani' },
  { slug: 'bangladesh', name: 'Bangladesh', region: 'Asia-Pacific', idName: 'National ID (NID)', demonym: 'Bangladeshi' },
  { slug: 'sri-lanka', name: 'Sri Lanka', region: 'Asia-Pacific', idName: 'National Identity Card', demonym: 'Sri Lankan' },
  { slug: 'australia', name: 'Australia', region: 'Asia-Pacific', idName: "driver's licence, Medicare card and passport", demonym: 'Australian' },
  { slug: 'new-zealand', name: 'New Zealand', region: 'Asia-Pacific', idName: "driver licence and passport", demonym: 'New Zealander' },

  // ---- North America ----
  { slug: 'united-states', name: 'the United States', region: 'North America', idName: "state ID, driver's license and Social Security card", demonym: 'American' },
  { slug: 'canada', name: 'Canada', region: 'North America', idName: "provincial ID, driver's licence and PR card", demonym: 'Canadian' },
  { slug: 'mexico', name: 'Mexico', region: 'North America', idName: 'INE voter ID (and CURP)', demonym: 'Mexican' },

  // ---- South America ----
  { slug: 'brazil', name: 'Brazil', region: 'South America', idName: 'RG (and CPF)', demonym: 'Brazilian' },
  { slug: 'argentina', name: 'Argentina', region: 'South America', idName: 'DNI', demonym: 'Argentine' },
  { slug: 'chile', name: 'Chile', region: 'South America', idName: 'Cédula de Identidad', demonym: 'Chilean' },
  { slug: 'colombia', name: 'Colombia', region: 'South America', idName: 'Cédula de Ciudadanía', demonym: 'Colombian' },
  { slug: 'peru', name: 'Peru', region: 'South America', idName: 'DNI', demonym: 'Peruvian' },
];

export const regions = [
  'Africa', 'Europe', 'Middle East', 'Asia-Pacific', 'North America', 'South America',
];
