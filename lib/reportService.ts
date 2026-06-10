import {
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { getDb } from "./firebase";

export interface ReportFormData {
  category: string;
  priority: string;
  description: string;
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
}

export interface SubmittedReport extends ReportFormData {
  trackingCode: string;
  institution: string;
  status: string;
  createdAt: Timestamp;
}

// Generate tracking code in format DFOC-XXXXXX
function generateTrackingCode(): string {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DFOC-${randomPart}`;
}

// Map category to institution
function getInstitution(category: string): string {
  const institutionMap: Record<string, string> = {
    Crime: "Police",
    "Medical Emergency": "Hospital",
    "Fire Emergency": "Fire Service",
    Cybercrime: "Cybercrime Unit",
    "Other Emergency": "Admin Review",
  };

  return institutionMap[category] || "Admin Review";
}

// Submit report to Firestore
export async function submitReport(
  data: ReportFormData
): Promise<{ success: boolean; trackingCode?: string; error?: string }> {
  try {
    const db = getDb();
    const trackingCode = generateTrackingCode();
    const institution = getInstitution(data.category);

    // Build report data, filtering out undefined values
    const reportData: Record<string, any> = {
      trackingCode,
      category: data.category,
      priority: data.priority,
      description: data.description,
      institution,
      status: "Submitted",
      createdAt: Timestamp.now(),
    };

    // Add optional fields only if they have values
    if (data.name) reportData.name = data.name;
    if (data.phone) reportData.phone = data.phone;
    if (data.email) reportData.email = data.email;
    if (data.location) reportData.location = data.location;

    // Convert to JSON and back to strip any undefined values
    const sanitizedReportData = JSON.parse(JSON.stringify(reportData));

    // Add to Firestore 'reports' collection
    const docRef = await addDoc(collection(db, "reports"), sanitizedReportData);

    return {
      success: true,
      trackingCode,
    };
  } catch (error) {
    console.error("Error submitting report:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to submit report. Please try again.",
    };
  }
}

export async function getReportByTrackingCode(
  trackingCode: string
): Promise<{ success: boolean; report?: SubmittedReport | null; error?: string }> {
  try {
    const db = getDb();
    const normalizedCode = trackingCode.trim().toUpperCase();
    const reportsQuery = query(
      collection(db, "reports"),
      where("trackingCode", "==", normalizedCode)
    );
    const snapshot = await getDocs(reportsQuery);

    if (snapshot.empty) {
      return {
        success: true,
        report: null,
      };
    }

    const reportData = snapshot.docs[0].data() as SubmittedReport;

    return {
      success: true,
      report: reportData,
    };
  } catch (error) {
    console.error("Error looking up report:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to search for report. Please try again.",
    };
  }
}

export async function updateReportStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDb();
    const reportRef = doc(db, "reports", id);
    await updateDoc(reportRef, { status });
    return { success: true };
  } catch (error) {
    console.error("Error updating report status:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update report status. Please try again.",
    };
  }
}
