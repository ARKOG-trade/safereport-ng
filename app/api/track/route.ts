import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    // DIAGNOSTIC: Check Admin SDK and document visibility
    let sdkInitialized = false;
    let docCount = 0;
    let sampleCodes: string[] = [];
    let errorInfo: string | null = null;

    try {
      // Check if adminDb is initialized and accessible
      const reportsRef = adminDb.collection("reports");
      const snapshot = await reportsRef.limit(3).get();
      
      sdkInitialized = true;
      docCount = snapshot.size;
      sampleCodes = snapshot.docs.map(doc => doc.data().trackingCode || "NO_CODE");
    } catch (e: any) {
      errorInfo = e.message || String(e);
    }

    return NextResponse.json({
      diagnostic: true,
      sdkInitialized,
      docCount,
      sampleCodes,
      errorInfo,
      env: {
        projectId: process.env.FIREBASE_PROJECT_ID || "MISSING",
        adminProjectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "MISSING",
        clientProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "MISSING"
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || String(error) },
      { status: 500 }
    );
  }
}
