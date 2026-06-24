"use client";


import { signOut } from "firebase/auth";
import { auth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  SubmittedReport,
  updateReportStatus,
  updatePublicMessage,
} from "@/lib/reportService";

import { formatDate } from "@/lib/dateUtils";

const institutionOptions = ["All", "Police", "Hospital", "Fire Service", "Cybercrime Unit", "Admin Review"];
const statusOptions = ["All", "Submitted", "Received", "In Progress", "Resolved"];
const priorityOptions = ["All", "Low", "Medium", "High", "Critical"];
interface ReportRow extends SubmittedReport {
  id: string;
}

export default function InstitutionDashboardClient({
  institutionFilter: routeInstitution,
}: {
  institutionFilter?: string;
}) {

 const router = useRouter();

async function handleLogout() {
  await signOut(auth);
  router.push("/login/institution");
}
const [institutionFilter, setInstitutionFilter] =
  useState<string | null>(
    routeInstitution || null
  );

const [loadingInstitution, setLoadingInstitution] =
  useState(true);
  const [reports, setReports] = useState<ReportRow[]>([]);
const selectedInstitution = institutionFilter;
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
const [publicMessage, setPublicMessage] = useState("");

  useEffect(() => 
    {const db = getDb();
    const reportsRef = collection(db, "reports");
   const reportsQuery =
  institutionFilter
    ? query(
        reportsRef,
        where(
          "institution",
          "==",
          institutionFilter
        )
      )
    : query(
        reportsRef,
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const unsubscribe = onSnapshot(
      reportsQuery,
      (snapshot) => {
        console.log('[InstitutionDashboard] snapshot received', snapshot.docs.length);
        let loadedReports: ReportRow[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as SubmittedReport),
        }));
        console.log("Institution Filter:", institutionFilter);

loadedReports.forEach((r) => {
  console.log(
    "Report Institution:",
    r.institution
  );
});
        console.log(
  "Reports:",
  loadedReports.map(r => ({
    institution: r.institution,
    trackingCode: r.trackingCode
  }))
);

        // If we're filtering by institution, apply the filter and sort client-side
        if (institutionFilter) {
          loadedReports = loadedReports
            .filter((r) => r.institution === institutionFilter)
            .sort((a, b) => {
              const aTime = (a.createdAt && (a.createdAt as any).toMillis ? (a.createdAt as any).toMillis() : new Date(a.createdAt as any).getTime()) || 0;
              const bTime = (b.createdAt && (b.createdAt as any).toMillis ? (b.createdAt as any).toMillis() : new Date(b.createdAt as any).getTime()) || 0;
              return bTime - aTime;
            });
        }
        console.log('[InstitutionDashboard] loadedReports', loadedReports);
        setReports(loadedReports);
        setError(null);
      },
      (snapshotError) => {
        console.error("Realtime report subscription failed:", snapshotError);
        setError("Unable to load reports from Firestore. Please refresh the page.");
      }
    );

    return () => unsubscribe();
  }, [institutionFilter]);
useEffect(() => {
  if (selectedReport) {
    setPublicMessage(selectedReport.publicMessage || "");
  }
}, [selectedReport]);

useEffect(() => {
  setLoadingInstitution(false);
}, []);
useEffect(() => {
  setLoadingInstitution(false);
}, []);

const filteredReports = useMemo(() => {
  return reports.filter((report) => {
    const institutionMatch =
      !selectedInstitution ||
      selectedInstitution === "All" ||
      report.institution === selectedInstitution;

    const statusMatch =
      selectedStatus === "All" ||
      report.status === selectedStatus;

    const priorityMatch =
      selectedPriority === "All" ||
      report.priority === selectedPriority;

    return (
      institutionMatch &&
      statusMatch &&
      priorityMatch
    );
  });
}, [
  reports,
  selectedInstitution,
  selectedStatus,
  selectedPriority,
]);

if (loadingInstitution) {
  return (
    <div className="p-10">
      Loading dashboard...
    </div>
  );
}

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    setIsUpdatingId(reportId);
    setError(null);

    const result = await updateReportStatus(reportId, newStatus);
    if (!result.success) {
      setError(result.error || "Unable to update report status. Please try again.");
    }

    setIsUpdatingId(null);
  };

  const institutionLabel = institutionFilter ? institutionFilter : "All institutions";
  const selectedInstitutionOptions = institutionFilter ? [institutionFilter] : institutionOptions;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="flex gap-3">
  <button
    onClick={handleLogout}
    className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
  >
    Logout
  </button>

  <Link
    href="/"
    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm shadow-slate-200 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-slate-800"
  >
    ← Return to homepage
  </Link>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">SafeReport NG</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              {institutionFilter ? `${institutionFilter} Dashboard` : "Institution Dashboard"}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Monitor incoming reports{institutionFilter ? ` for ${institutionLabel}` : " across all institutions"}, filter by status, and update case progress in real time.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm shadow-slate-200 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-slate-800 sm:w-auto"
          >
            ← Return to homepage
          </Link>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95 sm:p-8">
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Total reports</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">{reports.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Filtered reports</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">{filteredReports.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Current filter</p>
              <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">{selectedInstitution} / {selectedStatus} / {selectedPriority}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Live updates</p>
              <p className="mt-3 text-lg font-semibold text-emerald-700 dark:text-emerald-300">Connected</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950">
              <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{error}</p>
            </div>
          )}

          <div className="mb-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Institution</span>
            <select
  value={selectedInstitution || ""}
  disabled
  className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
>
  <option value={selectedInstitution || ""}>
    {selectedInstitution || "Loading..."}
  </option>
</select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Status</span>
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Priority</span>
              <select
                value={selectedPriority}
                onChange={(event) => setSelectedPriority(event.target.value)}
                className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
              >
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Matching institution</p>
              <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">{institutionLabel}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Matching status</p>
              <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">{selectedStatus}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Matching priority</p>
              <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">{selectedPriority}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-950">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
                <thead className="bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Tracking Code</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Category</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Institution</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Priority</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Status</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Date Submitted</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">
  Action
</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-950">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                        No reports match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{report.trackingCode}</td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{report.category}</td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{report.institution}</td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{report.priority}</td>
                        <td className="px-6 py-4">
                          <select
                            value={report.status}
                            onChange={(event) => handleStatusChange(report.id, event.target.value)}
                            disabled={isUpdatingId === report.id}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                          >
                            {statusOptions.slice(1).map((statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {statusOption}
                              </option>
                            ))}
                          </select>
                        </td>
                       <td className="px-6 py-4 text-slate-700 dark:text-slate-200">
  {formatDate(report.createdAt)}
</td>

<td className="px-6 py-4">
  <button
    onClick={() => setSelectedReport(report)}
    className="rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
  >
    View
  </button>
</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {selectedReport && (
  <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-950">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-semibold">
        Report Details
      </h2>

      <button
        onClick={() => setSelectedReport(null)}
        className="rounded-xl border px-4 py-2"
      >
        Close
      </button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <strong>Tracking Code:</strong>
        <p>{selectedReport.trackingCode}</p>
      </div>

      <div>
        <strong>Category:</strong>
        <p>{selectedReport.category}</p>
      </div>

      <div>
        <strong>Institution:</strong>
        <p>{selectedReport.institution}</p>
      </div>

      <div>
        <strong>Priority:</strong>
        <p>{selectedReport.priority}</p>
      </div>

      <div>
        <strong>Status:</strong>
        <p>{selectedReport.status}</p>
      </div>

      <div>
        <strong>Date Submitted:</strong>
        <p>{formatDate(selectedReport.createdAt)}</p>
      </div>
    </div>

    <div className="mt-6">
      <strong>Description:</strong>
      <p className="mt-2">{selectedReport.description}</p>
    </div>
    <div className="mt-6">
  <strong>Public Update For Reporter:</strong>

  <textarea
    value={publicMessage}
    onChange={(e) => setPublicMessage(e.target.value)}
    rows={4}
    className="mt-2 w-full rounded-xl border border-slate-300 p-3"
    placeholder="Write an update visible to the reporter..."
  />

  <button
    onClick={async () => {
      const result = await updatePublicMessage(
        selectedReport.id,
        publicMessage
      );

      if (!result.success) {
        alert(result.error);
      } else {
        alert("Update saved");
      }
    }}
    className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-white"
  >
    Save Update
  </button>
</div>

    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div>
        <strong>Name:</strong>
        <p>{selectedReport.name || "Anonymous"}</p>
      </div>

      <div>
        <strong>Phone:</strong>
        <p>{selectedReport.phone || "Not provided"}</p>
      </div>

      <div>
        <strong>Email:</strong>
        <p>{selectedReport.email || "Not provided"}</p>
      </div>

      <div>
        <strong>Location:</strong>
        <p>{selectedReport.location || "Not provided"}</p>
      </div>
    </div>
  </div>
)}
        </section>
      </main>
    </div>
  ); 
 }