/**
 * Onboarding Dashboard Page
 * 
 * Administrative interface for managing the institutional hierarchy.
 * Allows Super Admins to create and manage Organizations, Branches, and Units.
 */

import OnboardingDashboardClient from './OnboardingDashboardClient';
import AdminAuthGuard from '../AdminAuthGuard';

export const dynamic = 'force-dynamic';

export default function OnboardingPage() {
  return (
    <AdminAuthGuard>
      <OnboardingDashboardClient />
    </AdminAuthGuard>
  );
}
