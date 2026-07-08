import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const trackingCode = body.trackingCode?.trim();

    if (!trackingCode) {
      return NextResponse.json(
        { error: "Tracking code required" },
        { status: 400 }
      );
    }

    // Try trackingCode first (exact match)
    let snapshot = await adminDb
      .collection("reports")
      .where("trackingCode", "==", trackingCode.toUpperCase())
      .limit(1)
      .get();

    // If not found, try caseNumber (exact match)
    if (snapshot.empty) {
      snapshot = await adminDb
        .collection("reports")
        .where("caseNumber", "==", trackingCode.toUpperCase())
        .limit(1)
        .get();
    }

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        report: null,
      });
    }

    const report = snapshot.docs[0].data();

    return NextResponse.json({
      success: true,
      report: {
        trackingCode: report.trackingCode,
        category: report.category,
        institution: report.institution,
        priority: report.priority,
        status: report.status,
        publicMessage: report.publicMessage || "",
        createdAt: report.createdAt || null,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}