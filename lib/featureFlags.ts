/**
 * Feature Flag Service
 * 
 * Provides centralized control over application features.
 * Supports environment-based and dynamic flags.
 */

export enum FeatureFlag {
  ENABLE_SMS = 'ENABLE_SMS',
  ENABLE_PUSH = 'ENABLE_PUSH',
  ENABLE_AI_ROUTING = 'ENABLE_AI_ROUTING',
  ENABLE_WEBHOOKS = 'ENABLE_WEBHOOKS',
  ENABLE_ADVANCED_SLA = 'ENABLE_ADVANCED_SLA',
  ENABLE_EVIDENCE_VERSIONING = 'ENABLE_EVIDENCE_VERSIONING',
  ENABLE_AUDIT_LOGGING = 'ENABLE_AUDIT_LOGGING',
  ENABLE_TIMELINE = 'ENABLE_TIMELINE'
}

class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flags: Map<FeatureFlag, boolean> = new Map();

  private constructor() {
    this.initializeFlags();
  }

  public static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  private initializeFlags(): void {
    // Default flag values
    this.flags.set(FeatureFlag.ENABLE_SMS, process.env.NEXT_PUBLIC_ENABLE_SMS === 'true');
    this.flags.set(FeatureFlag.ENABLE_PUSH, process.env.NEXT_PUBLIC_ENABLE_PUSH === 'true');
    this.flags.set(FeatureFlag.ENABLE_AI_ROUTING, process.env.NEXT_PUBLIC_ENABLE_AI_ROUTING === 'true');
    this.flags.set(FeatureFlag.ENABLE_WEBHOOKS, process.env.NEXT_PUBLIC_ENABLE_WEBHOOKS === 'true');
    this.flags.set(FeatureFlag.ENABLE_ADVANCED_SLA, process.env.NEXT_PUBLIC_ENABLE_ADVANCED_SLA === 'true');
    this.flags.set(FeatureFlag.ENABLE_EVIDENCE_VERSIONING, true); // Enabled by default in Phase 2
    this.flags.set(FeatureFlag.ENABLE_AUDIT_LOGGING, true); // Enabled by default in Phase 2
    this.flags.set(FeatureFlag.ENABLE_TIMELINE, true); // Enabled by default in Phase 2
  }

  /**
   * Check if a feature is enabled
   */
  public isEnabled(flag: FeatureFlag): boolean {
    return this.flags.get(flag) || false;
  }

  /**
   * Override a flag value at runtime (for testing or dynamic updates)
   */
  public setFlag(flag: FeatureFlag, value: boolean): void {
    this.flags.set(flag, value);
  }

  /**
   * Get all flags (for debugging/dashboard)
   */
  public getAllFlags(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    this.flags.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}

export const featureFlags = FeatureFlagService.getInstance();
