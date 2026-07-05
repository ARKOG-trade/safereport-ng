/**
 * Case Number Service
 * 
 * Abstract service interface for case number generation.
 * This allows the underlying implementation to be replaced with distributed counters,
 * Redis, or other scalable strategies without changing the rest of the application.
 */

/**
 * Interface for case number generation implementations
 */
export interface ICaseNumberGenerator {
  /**
   * Generates a unique case number for a given state
   * @param state - State name (e.g., 'Anambra')
   * @returns Promise resolving to a unique case number (e.g., 'SRN-2026-AN-000001')
   */
  generateCaseNumber(state: string): Promise<string>;

  /**
   * Validates if a string is a valid case number format
   * @param caseNumber - Case number to validate
   * @returns True if valid format
   */
  isValidCaseNumber(caseNumber: string): boolean;

  /**
   * Extracts the state code from a case number
   * @param caseNumber - Case number string
   * @returns State code or null if invalid
   */
  extractStateCode(caseNumber: string): string | null;
}

/**
 * Firestore-based case number generator (Version 1 implementation)
 * Uses Firestore counter documents for atomic increments
 */
export class FirestoreCaseNumberGenerator implements ICaseNumberGenerator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private adminDb: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(adminDb: any) {
    this.adminDb = adminDb;
  }

  async generateCaseNumber(state: string): Promise<string> {
    if (!state || typeof state !== 'string') {
      throw new Error('State is required and must be a string');
    }

    const { deriveStateCode, generateCaseNumber } = await import('./caseNumberGenerator');

    const stateCode = deriveStateCode(state);
    const year = new Date().getFullYear();
    const counterDocId = `case-number-counter-${year}-${stateCode}`;

    try {
      // Get or create the counter document
      const counterRef = this.adminDb.collection('caseNumberCounters').doc(counterDocId);
      const counterSnap = await counterRef.get();

      let nextSequence: number;

      if (!counterSnap.exists) {
        // First case number for this state/year
        nextSequence = 1;
        await counterRef.set({
          state: stateCode,
          year,
          sequence: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Increment the counter
        const currentSequence = counterSnap.data().sequence || 0;
        nextSequence = currentSequence + 1;
        await counterRef.update({
          sequence: nextSequence,
          updatedAt: new Date(),
        });
      }

      return generateCaseNumber(stateCode, nextSequence);
    } catch (error) {
      console.error('Firestore case number generation error:', error);
      throw new Error(`Failed to generate case number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isValidCaseNumber(caseNumber: string): boolean {
    return /^SRN-\d{4}-[A-Z]{2}-\d{6}$/.test(caseNumber);
  }

  extractStateCode(caseNumber: string): string | null {
    const match = caseNumber.match(/^SRN-\d{4}-([A-Z]{2})-\d{6}$/);
    return match ? match[1] : null;
  }
}

/**
 * Singleton instance of the case number generator
 * This allows the implementation to be injected or replaced at runtime
 */
let caseNumberGeneratorInstance: ICaseNumberGenerator | null = null;

/**
 * Initializes the case number generator with the specified implementation
 * @param generator - Implementation of ICaseNumberGenerator
 */
export function initializeCaseNumberGenerator(generator: ICaseNumberGenerator): void {
  caseNumberGeneratorInstance = generator;
}

/**
 * Gets the current case number generator instance
 * If not initialized, creates a default Firestore-based generator
 * @param adminDb - Firebase Admin Firestore instance (required if no generator is initialized)
 * @returns The case number generator instance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCaseNumberGenerator(adminDb?: any): ICaseNumberGenerator {
  if (!caseNumberGeneratorInstance) {
    if (!adminDb) {
      throw new Error('Case number generator not initialized and no adminDb provided');
    }
    caseNumberGeneratorInstance = new FirestoreCaseNumberGenerator(adminDb);
  }
  return caseNumberGeneratorInstance;
}

/**
 * Resets the case number generator (useful for testing)
 */
export function resetCaseNumberGenerator(): void {
  caseNumberGeneratorInstance = null;
}
