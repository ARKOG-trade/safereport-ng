import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    // 1. Authentication Check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userEmail = decodedToken.email?.toLowerCase();

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, id, data } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: "Report ID and action are required" },
        { status: 400 }
      );
    }

    // 2. Fetch the report to check authorization
    const reportRef = adminDb.collection("reports").doc(id);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const reportData = reportDoc.data();
    const isAdmin = userEmail === "admin@safereport.ng";
    const isAssignedInstitution = 
      (reportData?.institution === "Police" && userEmail === "police@safereport.ng") ||
      (reportData?.institution === "Hospital" && userEmail === "hospital@safereport.ng") ||
      (reportData?.institution === "Fire Service" && userEmail === "fire@safereport.ng") ||
      (reportData?.institution === "Cybercrime Unit" && userEmail === "cyber@safe");

    // 3. Authorization Check
    if (!isAdmin && !isAssignedInstitution) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. Action Handling with specific authorization
    switch (action) {
      case "updateStatus":
        // Both Admin and Institution can update status
        if (!data?.status) return NextResponse.json({ error: "Status required" }, { status: 400 });
        await reportRef.update({
          status: data.status,
          updatedAt: FieldValue.serverTimestamp(),
        });
        break;

      case "updateInstitution":
        // Only Admin can reassign institutions
        if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (!data?.institution) return NextResponse.json({ error: "Institution required" }, { status: 400 });
        await reportRef.update({
          institution: data.institution,
          updatedAt: FieldValue.serverTimestamp(),
        });
        break;

      case "markAsSpam":
        // Only Admin can mark as spam
        if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        await reportRef.update({
          isSpam: true,
          status: "Spam",
          updatedAt: FieldValue.serverTimestamp(),
        });
        break;

      case "updatePublicMessage":
        // Both Admin and Institution can update public messages
        if (!data?.publicMessage) return NextResponse.json({ error: "Public message required" }, { status: 400 });
        await reportRef.update({
          publicMessage: data.publicMessage,
          updatedAt: FieldValue.serverTimestamp(),
        });
        break;

      case "delete":
        // Only Admin can delete reports
        if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        await reportRef.delete();
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
