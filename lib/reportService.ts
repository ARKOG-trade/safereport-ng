import {
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
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
  updatedAt?: Timestamp;
  isSpam?: boolean;
  evidenceUrl?: string;
  publicMessage?: string;
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
      updatedAt: Timestamp.now(),
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
): Promise<{
  success: boolean;
  report?: SubmittedReport | null;
  error?: string;
}> {
  try {
    const response = await fetch(
      "/api/track",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          trackingCode,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      return {
        success: false,
        error:
          data.error ||
          "Unable to search report",
      };
    }

    return {
      success: true,
      report:
        data.report || null,
    };
  } catch (error) {
    console.error(
      "Track report error:",
      error
    );

    return {
      success: false,
      error:
        "Unable to search report",
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
    await updateDoc(reportRef, { status, updatedAt: Timestamp.now() });
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

export async function updateReportInstitution(
  id: string,
  institution: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDb();
    const reportRef = doc(db, "reports", id);
    await updateDoc(reportRef, { institution, updatedAt: Timestamp.now() });
    return { success: true };
  } catch (error) {
    console.error("Error updating report institution:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update report institution. Please try again.",
    };
  }
}

export async function markReportAsSpam(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDb();
    const reportRef = doc(db, "reports", id);
    await updateDoc(reportRef, { isSpam: true, status: "Spam", updatedAt: Timestamp.now() });
    return { success: true };
  } catch (error) {
    console.error("Error marking report as spam:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to mark report as spam. Please try again.",
    };
  }
}

export async function deleteReport(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDb();
    const reportRef = doc(db, "reports", id);
    await deleteDoc(reportRef);
    return { success: true };
  } catch (error) {
    console.error("Error deleting report:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete report. Please try again.",
    };
  }
}

export async function updatePublicMessage(
  id: string,
  publicMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDb();
    const reportRef = doc(db, "reports", id);

    await updateDoc(reportRef, {
      publicMessage,
      updatedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating public message:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update public message.",
    };
  }
}
