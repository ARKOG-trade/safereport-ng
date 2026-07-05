/**
 * Case Number Generator
 * 
 * Generates human-readable case numbers in the format: SRN-YYYY-XX-NNNNNN
 * 
 * Format breakdown:
 * - SRN: SafeReport NG prefix
 * - YYYY: Current year
 * - XX: State/Region code (2 letters)
 * - NNNNNN: Sequential number (6 digits)
 * 
 * Example: SRN-2026-AN-000001
 */



/**
 * Generates a unique case number for a report
 * @param stateCode - Two-letter state/region code (e.g., 'AN' for Anambra)
 * @param sequenceNumber - Sequential number for this state in the year (6 digits)
 * @returns Formatted case number string
 */
export function generateCaseNumber(stateCode: string, sequenceNumber: number): string {
  const year = new Date().getFullYear();
  const paddedSequence = String(sequenceNumber).padStart(6, '0');
  return `SRN-${year}-${stateCode.toUpperCase()}-${paddedSequence}`;
}

/**
 * Extracts state code from a case number
 * @param caseNumber - Case number string (e.g., 'SRN-2026-AN-000001')
 * @returns State code or null if invalid format
 */
export function extractStateCodeFromCaseNumber(caseNumber: string): string | null {
  const match = caseNumber.match(/^SRN-\d{4}-([A-Z]{2})-\d{6}$/);
  return match ? match[1] : null;
}

/**
 * Validates case number format
 * @param caseNumber - Case number string to validate
 * @returns True if valid format
 */
export function isValidCaseNumber(caseNumber: string): boolean {
  return /^SRN-\d{4}-[A-Z]{2}-\d{6}$/.test(caseNumber);
}

/**
 * Gets the next sequence number for a given state and year
 * This should be called from a server-side function to ensure atomicity
 * @param stateCode - Two-letter state code
 * @param year - Year (defaults to current year)
 * @returns Next sequence number to use
 */
export function getNextSequenceNumber(currentHighest: number): number {
  return currentHighest + 1;
}

/**
 * Derives state code from organization location
 * @param state - State name (e.g., 'Anambra')
 * @returns Two-letter state code (e.g., 'AN')
 */
export function deriveStateCode(state: string): string {
  // Map of state names to their 2-letter codes
  const stateCodeMap: Record<string, string> = {
    // Nigerian states
    'abia': 'AB',
    'adamawa': 'AD',
    'akwa ibom': 'AK',
    'anambra': 'AN',
    'bauchi': 'BA',
    'bayelsa': 'BY',
    'benue': 'BE',
    'borno': 'BO',
    'cross river': 'CR',
    'delta': 'DE',
    'ebonyi': 'EB',
    'edo': 'ED',
    'ekiti': 'EK',
    'enugu': 'EN',
    'fct': 'FC',
    'gombe': 'GO',
    'imo': 'IM',
    'jigawa': 'JI',
    'kaduna': 'KD',
    'kano': 'KN',
    'katsina': 'KT',
    'kebbi': 'KB',
    'kogi': 'KO',
    'kwara': 'KW',
    'lagos': 'LA',
    'nasarawa': 'NA',
    'niger': 'NI',
    'ogun': 'OG',
    'ondo': 'ON',
    'osun': 'OS',
    'oyo': 'OY',
    'plateau': 'PL',
    'rivers': 'RI',
    'sokoto': 'SO',
    'taraba': 'TA',
    'yobe': 'YO',
    'zamfara': 'ZA',
  };

  const code = stateCodeMap[state.toLowerCase().trim()];
  if (!code) {
    // Fallback: use first two letters of state name, uppercase
    return state.substring(0, 2).toUpperCase();
  }
  return code;
}
