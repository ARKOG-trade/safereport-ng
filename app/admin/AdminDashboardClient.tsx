"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  SubmittedReport,
  updateReportStatus,
  updateReportInstitution,
  markReportAsSpam,
  deleteReport,
} from "@/lib/reportService";
import { formatDate } from "@/lib/dateUtils";

const institutionOptions = ["All", "Police", "Hospital", "Fire Service", "Cybercrime Unit", "Admin Review"];
const statusOptions = ["All", "Submitted", "Received", "In Progress", "Resolved"];
const statusChangeOptions = ["Submitted", "Received", "In Progress", "Resolved", "Spam"];
const priorityOptions = ["All", "Low", "Medium", "High", "Critical"];
const reassignOptions = ["Police", "Hospital", "Fire Service", "Cybercrime Unit", "Admin Review"];

interface ReportRow extends SubmittedReport {
  id: string;
}

export default function AdminDashboardClient() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getDb();
    const reportsRef = collection(db, "reports");
    const reportsQuery = query(reportsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      reportsQuery,
      (snapshot) => {
        console.log('[AdminDashboard] snapshot received', snapshot.docs.length);
        const loadedReports: ReportRow[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as SubmittedReport),
        }));
        console.log('[AdminDashboard] loadedReports', loadedReports);
        setReports(loadedReports);
        setError(null);
      },
      (snapshotError) => {
        console.error("Realtime report subscription failed:", snapshotError);
        setError("Unable to load reports from Firestore. Please refresh the page.");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedReport) return;
    const updated = reports.find((report) => report.id === selectedReport.id);
    if (updated) {
      setSelectedReport(updated);
    }
  }, [reports, selectedReport]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesTrackingCode =
        !normalizedSearch || report.trackingCode.toLowerCase().includes(normalizedSearch);
      const matchesInstitution =
        selectedInstitution === "All" || report.institution === selectedInstitution;
      const matchesStatus = selectedStatus === "All" || report.status === selectedStatus;
      const matchesPriority = selectedPriority === "All" || report.priority === selectedPriority;
      return matchesTrackingCode && matchesInstitution && matchesStatus && matchesPriority;
    });
  }, [reports, searchText, selectedInstitution, selectedStatus, selectedPriority]);

  const counts = useMemo(() => ({
    total: reports.length,
    submitted: reports.filter((report) => report.status === "Submitted").length,
    received: reports.filter((report) => report.status === "Received").length,
    inProgress: reports.filter((report) => report.status === "In Progress").length,
    resolved: reports.filter((report) => report.status === "Resolved").length,
  }), [reports]);

  const selectedReportUpdatedAt = selectedReport
    ? selectedReport.updatedAt || selectedReport.createdAt
    : null;

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    setIsUpdatingId(reportId);
    setError(null);

    const result = await updateReportStatus(reportId, newStatus);
    if (!result.success) {
      setError(result.error || "Unable to update report status. Please try again.");
    }

    setIsUpdatingId(null);
  };

  const handleReassignInstitution = async (reportId: string, institution: string) => {
    setIsUpdatingId(reportId);
    setError(null);

    const result = await updateReportInstitution(reportId, institution);
    if (!result.success) {
      setError(result.error || "Unable to reassign institution. Please try again.");
    }

    setIsUpdatingId(null);
  };

  const handleMarkSpam = async (reportId: string) => {
    setIsUpdatingId(reportId);
    setError(null);

    const result = await markReportAsSpam(reportId);
    if (!result.success) {
      setError(result.error || "Unable to mark report as spam. Please try again.");
    }

    setIsUpdatingId(null);
  };

  const handleDeleteReport = async (reportId: string) => {
    setIsUpdatingId(reportId);
    setError(null);

    const result = await deleteReport(reportId);
    if (!result.success) {
      setError(result.error || "Unable to delete report. Please try again.");
    } else {
      setSelectedReport(null);
    }

    setIsUpdatingId(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">SafeReport NG</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              Admin Dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Manage reports in real time, search by tracking code, review details, reassign institutions, and mark spam.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm shadow-slate-200 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-slate-800 sm:w-auto"
          >
            ← Return to homepage
          </Link>
        </div>

        <section className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Total Reports</p>
              <p className="mt-4 text-4xl font-semibold text-slate-950 dark:text-white">{counts.total}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Submitted</p>
              <p className="mt-4 text-4xl font-semibold text-slate-950 dark:text-white">{counts.submitted}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Received</p>
              <p className="mt-4 text-4xl font-semibold text-slate-950 dark:text-white">{counts.received}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">In Progress</p>
              <p className="mt-4 text-4xl font-semibold text-slate-950 dark:text-white">{counts.inProgress}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Resolved</p>
              <p className="mt-4 text-4xl font-semibold text-slate-950 dark:text-white">{counts.resolved}</p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950">
              <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{error}</p>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950">
              <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Search</span>
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Tracking code"
                    className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Institution</span>
                  <select
                    value={selectedInstitution}
                    onChange={(event) => setSelectedInstitution(event.target.value)}
                    className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                  >
                    {institutionOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Status</span>
                  <select
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                    className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
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
                    className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                  >
                    {priorityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
                  <thead className="bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Tracking Code</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Category</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Institution</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Priority</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Status</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Date</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-950">
                    {filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                          No reports found.
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((report) => (
                        <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{report.trackingCode}</td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{report.category}</td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{report.institution}</td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{report.priority}</td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{report.status}</td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{formatDate(report.createdAt)}</td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => setSelectedReport(report)}
                              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-100"
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

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Report details</p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{selectedReport ? selectedReport.trackingCode : "Select a report"}</h2>
                </div>
                {selectedReport && (
                  <button
                    type="button"
                    onClick={() => setSelectedReport(null)}
                    className="rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                  >
                    Clear
                  </button>
                )}
              </div>

              {selectedReport ? (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Tracking Code</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{selectedReport.trackingCode}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Category</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{selectedReport.category}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Priority</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{selectedReport.priority}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Institution</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{selectedReport.institution}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Status</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{selectedReport.status}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Date Submitted</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{formatDate(selectedReport.createdAt)}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Last Updated</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{formatDate(selectedReportUpdatedAt)}</p>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                    <div>
                      <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Description</p>
                      <p className="mt-2 text-slate-900 dark:text-slate-100">{selectedReport.description}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Name</p>
                        <p className="mt-2 text-slate-900 dark:text-slate-100">{selectedReport.name || "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Phone</p>
                        <p className="mt-2 text-slate-900 dark:text-slate-100">{selectedReport.phone || "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Email</p>
                        <p className="mt-2 text-slate-900 dark:text-slate-100">{selectedReport.email || "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Location</p>
                        <p className="mt-2 text-slate-900 dark:text-slate-100">{selectedReport.location || "Unknown"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                    <label className="space-y-2 block">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Change Status</span>
                      <select
                        value={selectedReport.status}
                        onChange={(event) => handleStatusChange(selectedReport.id, event.target.value)}
                        disabled={isUpdatingId === selectedReport.id}
                        className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                      >
                        {statusChangeOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 block">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Reassign Institution</span>
                      <select
                        value={selectedReport.institution}
                        onChange={(event) => handleReassignInstitution(selectedReport.id, event.target.value)}
                        disabled={isUpdatingId === selectedReport.id}
                        className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                      >
                        {reassignOptions.map((institution) => (
                          <option key={institution} value={institution}>
                            {institution}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleMarkSpam(selectedReport.id)}
                      disabled={isUpdatingId === selectedReport.id}
                      className="w-full rounded-3xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark as spam
                    </button>
                    {selectedReport.isSpam && (
                      <>
                        <p className="text-sm font-medium text-rose-700 dark:text-rose-300">This report is marked as spam.</p>
                        <button
                          type="button"
                          onClick={() => handleDeleteReport(selectedReport.id)}
                          disabled={isUpdatingId === selectedReport.id}
                          className="w-full rounded-3xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                        >
                          Delete spam report
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  <p>Select a report from the table to view details and manage it.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
