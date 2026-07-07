/**
 * Operations Dashboard
 * 
 * Real-time monitoring of system health, report queues, and operational metrics.
 * Integrates Timeline, Health, and SLA data.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { HealthService, HealthEvent, HealthEventType } from '@/lib/healthService';
import { TimelineEntry, getReportTimeline } from '@/lib/timelineService';
import { AuditEntry, AuditLogService } from '@/lib/communicationPlatform';
import { featureFlags } from '@/lib/featureFlags';

export default function OperationsDashboardClient() {
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [recentTimeline, setRecentTimeline] = useState<TimelineEntry[]>([]);
  const [, setRecentAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    incomingReports: 0,
    activeCases: 0,
    criticalCases: 0,
    slaBreaches: 0,
    activeOfficers: 0,
    notificationFailures: 0
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [health, timeline, audit] = await Promise.all([
          HealthService.getRecentEvents(20),
          // In production, these would be global queries. Using placeholders for now.
          getReportTimeline('global-placeholder'),
          AuditLogService.getAuditLogs({ limit: 20 })
        ]);

        setHealthEvents(health);
        setRecentTimeline(timeline);
        setRecentAudit(audit);

        // Mock stats for demonstration - in production these would come from aggregation queries
        setStats({
          incomingReports: 12,
          activeCases: 45,
          criticalCases: 3,
          slaBreaches: 1,
          activeOfficers: 8,
          notificationFailures: health.filter(e => e.type === HealthEventType.NOTIFICATION_FAILURE).length
        });
      } catch (error) {
        console.error('Error loading operations data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const systemStatus = useMemo(() => {
    const criticalEvents = healthEvents.filter(e => e.severity === 'critical');
    if (criticalEvents.length > 0) return 'CRITICAL';
    const mediumEvents = healthEvents.filter(e => e.severity === 'medium' || e.severity === 'high');
    if (mediumEvents.length > 3) return 'WARNING';
    return 'HEALTHY';
  }, [healthEvents]);

  if (loading && healthEvents.length === 0) {
    return <div className="p-8 text-center">Loading Operations Data...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
        <div className={`px-4 py-2 rounded-full font-semibold ${
          systemStatus === 'HEALTHY' ? 'bg-green-100 text-green-800' :
          systemStatus === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          System Status: {systemStatus}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Incoming" value={stats.incomingReports} color="blue" />
        <MetricCard title="Active Cases" value={stats.activeCases} color="indigo" />
        <MetricCard title="Critical" value={stats.criticalCases} color="red" />
        <MetricCard title="SLA Breaches" value={stats.slaBreaches} color="orange" />
        <MetricCard title="Active Officers" value={stats.activeOfficers} color="green" />
        <MetricCard title="Notify Failures" value={stats.notificationFailures} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex justify-between">
            System Health
            <span className="text-sm font-normal text-gray-500">Last 20 events</span>
          </h2>
          <div className="space-y-3">
            {healthEvents.length === 0 ? (
              <p className="text-gray-500 italic">No health events recorded.</p>
            ) : (
              healthEvents.map(event => (
                <div key={event.id} className="flex items-start p-3 bg-gray-50 rounded-lg text-sm">
                  <span className={`w-2 h-2 mt-1.5 rounded-full mr-3 shrink-0 ${
                    event.severity === 'critical' ? 'bg-red-500' :
                    event.severity === 'high' ? 'bg-orange-500' :
                    event.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <div className="font-medium text-gray-900 uppercase text-xs">{event.type}</div>
                    <div className="text-gray-600">{event.message}</div>
                    <div className="text-gray-400 text-xs mt-1">
                      {new Date(event.timestamp.toDate()).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Timeline */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentTimeline.length === 0 ? (
              <p className="text-gray-500 italic text-sm">Waiting for live activity...</p>
            ) : (
              recentTimeline.map(entry => (
                <div key={entry.id} className="border-l-2 border-indigo-200 pl-4 py-1">
                  <div className="text-sm font-medium text-gray-900">{entry.eventType}</div>
                  <div className="text-xs text-gray-500">
                    Case: {entry.reportId} | Actor: {entry.actor}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(entry.timestamp.toDate()).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Feature Flags Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4">Feature Configuration</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(featureFlags.getAllFlags()).map(([flag, enabled]) => (
            <div key={flag} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-xs font-medium text-gray-700">{flag}</span>
              <span className={`w-3 h-3 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    red: 'text-red-600 bg-red-50',
    orange: 'text-orange-600 bg-orange-50',
    green: 'text-green-600 bg-green-50',
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
      <div className={`text-xs font-bold uppercase mb-1 ${colorClasses[color].split(' ')[0]}`}>{title}</div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
    </div>
  );
}
