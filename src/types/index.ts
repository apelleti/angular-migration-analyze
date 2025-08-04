export interface PackageInfo {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  scripts?: Record<string, string>;
}

// Lock file types
export interface NpmLockFile {
  name: string;
  version: string;
  lockfileVersion: number;
  requires?: boolean;
  packages: Record<string, NpmLockPackage>;
  dependencies?: Record<string, LockFileEntry>;
}

export interface NpmLockPackage {
  version?: string;
  resolved?: string;
  integrity?: string;
  dev?: boolean;
  optional?: boolean;
  requires?: Record<string, string>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface LockFileEntry {
  version: string;
  resolved?: string;
  integrity?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  requires?: Record<string, string>;
}

// Configuration
export interface AnalyzerConfig {
  registry: string;
  timeout: number;
  retries: number;
  maxConcurrentRequests: number;
  targetAngularVersion?: string;
  network: {
    proxy?: {
      enabled: boolean;
      host?: string;
      port?: number;
      protocol: 'http' | 'https';
      bypassList: string[];
    };
    strictSSL: boolean;
    timeout: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    persistToDisk: boolean;
    diskCachePath: string;
  };
  analysis: {
    includeDevDependencies: boolean;
    checkVulnerabilities: boolean;
    skipOptionalPeerDeps: boolean;
    excludePackages: string[];
    offlineMode: boolean;
  };
}

// Analysis results
export interface AnalysisResult {
  missingPeerDeps: MissingPeerDep[];
  incompatibleVersions: IncompatibleVersion[];
  conflicts: VersionConflict[];
  angularPackages: AngularPackageInfo[];
  recommendations: Recommendation[];
  migrationPath: MigrationStep[];
  ngUpdateInfo?: string | null;
  metadata?: {
    timestamp: string;
    projectPath: string;
    networkAccessible: boolean;
    hasLockFile: boolean;
    registry: string;
  };
}

export interface MissingPeerDep {
  package: string;
  requiredBy: string;
  requiredVersion: string;
  severity: 'error' | 'warning';
}

export interface IncompatibleVersion {
  package: string;
  currentVersion: string;
  requiredVersion: string;
  reason: string;
  severity: 'error' | 'warning';
}

export interface VersionConflict {
  package: string;
  versions: Array<{
    version: string;
    requiredBy: string[];
  }>;
  severity: 'error' | 'warning';
}

export interface AngularPackageInfo {
  name: string;
  currentVersion: string;
  targetVersion?: string;
  latestVersion?: string;
  isDeprecated?: boolean;
}

export interface Recommendation {
  message: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  package?: string;
}

export interface MigrationStep {
  order: number;
  description: string;
  command?: string;
  isBreaking?: boolean;
}

// Error types
export class NetworkError extends Error {
  constructor(
    message: string,
    public code?: string | number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

// Schema for configuration validation
import { z } from 'zod';

export const AnalyzerConfigSchema = z.object({
  registry: z.string().url().default('https://registry.npmjs.org'),
  timeout: z.number().min(1000).max(60000).default(10000),
  retries: z.number().min(0).max(5).default(3),
  maxConcurrentRequests: z.number().min(1).max(50).default(10),

  network: z
    .object({
      proxy: z
        .object({
          enabled: z.boolean().default(false),
          host: z.string().optional(),
          port: z.number().optional(),
          protocol: z.enum(['http', 'https']).default('http'),
          bypassList: z.array(z.string()).default([]),
        })
        .optional(),
      strictSSL: z.boolean().default(true),
      timeout: z.number().default(30000),
    })
    .default({}),

  cache: z
    .object({
      enabled: z.boolean().default(true),
      ttl: z.number().min(60000).max(3600000).default(300000),
      maxSize: z.number().min(10).max(1000).default(100),
      persistToDisk: z.boolean().default(false),
      diskCachePath: z.string().default('./.ng-migrate-cache'),
    })
    .default({}),

  analysis: z
    .object({
      includeDevDependencies: z.boolean().default(true),
      checkVulnerabilities: z.boolean().default(false),
      skipOptionalPeerDeps: z.boolean().default(false),
      excludePackages: z.array(z.string()).default([]),
      offlineMode: z.boolean().default(false),
    })
    .default({}),
});

export type AnalyzerConfigType = z.infer<typeof AnalyzerConfigSchema>;

// Migration-specific types
export interface MigrationConfig {
  projectPath: string;
  fromVersion?: string;
  toVersion?: string;
}

export interface DeprecatedPattern {
  type: string;
  file: string;
  line: number;
  column?: number;
  autoFixable: boolean;
  description: string;
}

export interface BreakingChange {
  id: string;
  version: string;
  category: 'api' | 'dependency' | 'tooling' | 'syntax';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  detection: {
    filePattern?: string;
    codePattern?: RegExp;
    astQuery?: string;
  };
  solution: {
    automatic?: boolean;
    codeTransform?: string;
    manualSteps?: string[];
  };
  examples: Array<{
    before: string;
    after: string;
  }>;
}

export interface MigrationPlan {
  phases: Array<{
    name: string;
    tasks: string[];
    duration: string;
  }>;
  totalEstimate: string;
}

export interface DependencyAnalysis {
  incompatible: Array<{
    package: string;
    currentVersion: string;
    requiredVersion: string;
    reason: string;
  }>;
  deprecated: Array<{
    package: string;
    status: string;
    alternative?: string;
  }>;
  total: number;
}

export interface PeerDependencyAnalysis {
  conflicts: Array<{
    package: string;
    required: string;
    installed: string;
    resolution: string;
    impact?: string;
  }>;
}

export interface AnalysisReport {
  projectPath: string;
  fromVersion: string;
  toVersion: string;
  summary: {
    filesImpacted: number;
    breakingChanges: number;
    peerDepConflicts: number;
    estimatedEffort: string;
  };
  dependencies: DependencyAnalysis;
  patterns: DeprecatedPattern[];
  peerDependencies: PeerDependencyAnalysis;
  migrationPlan: MigrationPlan;
}

export interface ValidationResult {
  passed: boolean;
  issues: string[];
}