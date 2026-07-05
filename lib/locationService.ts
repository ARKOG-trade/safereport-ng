/**
 * Location Service
 * 
 * Provides dynamic location data for international expansion.
 * Supports loading states and cities based on the selected country.
 */

export interface Country {
  code: string;
  name: string;
  states: State[];
}

export interface State {
  code: string;
  name: string;
  cities?: string[];
}

// Initial data for Nigeria (default)
const countries: Country[] = [
  {
    code: 'NG',
    name: 'Nigeria',
    states: [
      { code: 'AB', name: 'Abia' },
      { code: 'AD', name: 'Adamawa' },
      { code: 'AK', name: 'Akwa Ibom' },
      { code: 'AN', name: 'Anambra' },
      { code: 'BA', name: 'Bauchi' },
      { code: 'BY', name: 'Bayelsa' },
      { code: 'BE', name: 'Benue' },
      { code: 'BO', name: 'Borno' },
      { code: 'CR', name: 'Cross River' },
      { code: 'DE', name: 'Delta' },
      { code: 'EB', name: 'Ebonyi' },
      { code: 'ED', name: 'Edo' },
      { code: 'EK', name: 'Ekiti' },
      { code: 'EN', name: 'Enugu' },
      { code: 'FC', name: 'FCT' },
      { code: 'GO', name: 'Gombe' },
      { code: 'IM', name: 'Imo' },
      { code: 'JI', name: 'Jigawa' },
      { code: 'KD', name: 'Kaduna' },
      { code: 'KN', name: 'Kano' },
      { code: 'KT', name: 'Katsina' },
      { code: 'KB', name: 'Kebbi' },
      { code: 'KO', name: 'Kogi' },
      { code: 'KW', name: 'Kwara' },
      { code: 'LA', name: 'Lagos' },
      { code: 'NA', name: 'Nasarawa' },
      { code: 'NI', name: 'Niger' },
      { code: 'OG', name: 'Ogun' },
      { code: 'ON', name: 'Ondo' },
      { code: 'OS', name: 'Osun' },
      { code: 'OY', name: 'Oyo' },
      { code: 'PL', name: 'Plateau' },
      { code: 'RI', name: 'Rivers' },
      { code: 'SO', name: 'Sokoto' },
      { code: 'TA', name: 'Taraba' },
      { code: 'YO', name: 'Yobe' },
      { code: 'ZA', name: 'Zamfara' },
    ],
  },
  {
    code: 'GH',
    name: 'Ghana',
    states: [
      { code: 'AH', name: 'Ahafo' },
      { code: 'AS', name: 'Ashanti' },
      { code: 'BO', name: 'Bono' },
      { code: 'BE', name: 'Bono East' },
      { code: 'CE', name: 'Central' },
      { code: 'EA', name: 'Eastern' },
      { code: 'GA', name: 'Greater Accra' },
      { code: 'NE', name: 'North East' },
      { code: 'NO', name: 'Northern' },
      { code: 'OT', name: 'Oti' },
      { code: 'SV', name: 'Savannah' },
      { code: 'UE', name: 'Upper East' },
      { code: 'UW', name: 'Upper West' },
      { code: 'VO', name: 'Volta' },
      { code: 'WN', name: 'Western North' },
      { code: 'WE', name: 'Western' },
    ],
  },
];

/**
 * Gets all supported countries
 * @returns Array of Country objects
 */
export function getCountries(): Country[] {
  return countries;
}

/**
 * Gets a country by its code
 * @param code - Two-letter country code
 * @returns Country object or undefined
 */
export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code.toUpperCase());
}

/**
 * Gets states for a given country
 * @param countryCode - Two-letter country code
 * @returns Array of State objects
 */
export function getStatesForCountry(countryCode: string): State[] {
  const country = getCountryByCode(countryCode);
  return country ? country.states : [];
}

/**
 * Gets a state by its code within a country
 * @param countryCode - Two-letter country code
 * @param stateCode - State code
 * @returns State object or undefined
 */
export function getStateByCode(countryCode: string, stateCode: string): State | undefined {
  const states = getStatesForCountry(countryCode);
  return states.find((s) => s.code === stateCode.toUpperCase());
}
