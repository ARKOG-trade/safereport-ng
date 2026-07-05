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
import { getCaseNumberGenerator } from '@/lib/caseNumberService';

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

    try {
      const generator = getCaseNumberGenerator(adminDb);
      const caseNumber = await generator.generateCaseNumber(state);

      return NextResponse.json({
        caseNumber,
        success: true,
      });
    } catch (generatorError) {
      console.error('Case number generation error:', generatorError);
      return NextResponse.json(
        { error: generatorError instanceof Error ? generatorError.message : 'Failed to generate case number' },
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

    try {
      const generator = getCaseNumberGenerator(adminDb);
      const caseNumber = await generator.generateCaseNumber(state);

      return NextResponse.json({
        caseNumber,
        success: true,
      });
    } catch (generatorError) {
      console.error('Case number generation error:', generatorError);
      return NextResponse.json(
        { error: generatorError instanceof Error ? generatorError.message : 'Failed to generate case number' },
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
