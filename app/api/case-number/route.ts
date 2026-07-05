/**
 * Case Number Generation API Route
 * 
 * This endpoint generates unique case numbers for reports.
 * It must be called server-side to ensure atomicity and prevent duplicates.
 * 
 * Format: SRN-YYYY-XX-NNNNNN
 * Example: SRN-2026-AN-000001
 */

import { NextRequest, NextResponse } from 'next/server';
import { deriveStateCode, generateCaseNumber } from '@/lib/caseNumberGenerator';

/**
 * POST /api/case-number
 * 
 * Generates a unique case number for a report.
 * 
 * Request body:
 * {
 *   "state": "Anambra"  // State name
 * }
 * 
 * Response:
 * {
 *   "caseNumber": "SRN-2026-AN-000001",
 *   "success": true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { state } = body;

    if (!state || typeof state !== 'string') {
      return NextResponse.json(
        { error: 'State is required' },
        { status: 400 }
      );
    }

    // Dynamically import Firebase Admin to avoid initialization issues during build
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let adminDb: any;
    try {
      const { adminDb: db } = await import('@/lib/firebase-admin');
      adminDb = db;
    } catch (error) {
      console.error('Failed to import Firebase Admin:', error);
      return NextResponse.json(
        { error: 'Firebase Admin SDK not initialized' },
        { status: 503 }
      );
    }

    if (!adminDb || !adminDb.collection) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK not properly initialized' },
        { status: 503 }
      );
    }

    const stateCode = deriveStateCode(state);
    const year = new Date().getFullYear();
    const counterDocId = `case-number-counter-${year}-${stateCode}`;

    try {
      // Get or create the counter document
      const counterRef = adminDb.collection('caseNumberCounters').doc(counterDocId);
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

      const caseNumber = generateCaseNumber(stateCode, nextSequence);

      return NextResponse.json({
        caseNumber,
        success: true,
      });
    } catch (firestoreError) {
      console.error('Firestore error:', firestoreError);
      return NextResponse.json(
        { error: 'Failed to generate case number from Firestore' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Case number generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate case number' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/case-number?state=Anambra
 * 
 * Generates a unique case number for a report (GET variant).
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state');

    if (!state || typeof state !== 'string') {
      return NextResponse.json(
        { error: 'State query parameter is required' },
        { status: 400 }
      );
    }

    // Dynamically import Firebase Admin to avoid initialization issues during build
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let adminDb: any;
    try {
      const { adminDb: db } = await import('@/lib/firebase-admin');
      adminDb = db;
    } catch (error) {
      console.error('Failed to import Firebase Admin:', error);
      return NextResponse.json(
        { error: 'Firebase Admin SDK not initialized' },
        { status: 503 }
      );
    }

    if (!adminDb || !adminDb.collection) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK not properly initialized' },
        { status: 503 }
      );
    }

    const stateCode = deriveStateCode(state);
    const year = new Date().getFullYear();
    const counterDocId = `case-number-counter-${year}-${stateCode}`;

    try {
      // Get or create the counter document
      const counterRef = adminDb.collection('caseNumberCounters').doc(counterDocId);
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

      const caseNumber = generateCaseNumber(stateCode, nextSequence);

      return NextResponse.json({
        caseNumber,
        success: true,
      });
    } catch (firestoreError) {
      console.error('Firestore error:', firestoreError);
      return NextResponse.json(
        { error: 'Failed to generate case number from Firestore' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Case number generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate case number' },
      { status: 500 }
    );
  }
}
