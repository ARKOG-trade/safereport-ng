/**
 * Operations Dashboard Page
 */

import React from 'react';
import OperationsDashboardClient from './OperationsDashboardClient';
import AdminAuthGuard from '../AdminAuthGuard';

export const dynamic = 'force-dynamic';

export default function OperationsPage() {
  return (
    <AdminAuthGuard>
      <OperationsDashboardClient />
    </AdminAuthGuard>
  );
}
