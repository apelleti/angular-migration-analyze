import { z } from 'zod';

export interface PackageInfo {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  scripts?: Record<string, string>;
}

// Types stricts pour les lock files
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

export interface PnpmLockFile {
  lockfileVersion: string;
  settings?: Record<string, any>;
  dependencies?: Record<string, PnpmDependency>;
  devDependencies?: Record<string, PnpmDependency>;
  packages?: Record<string, PnpmPackage>;
}

export interface PnpmDependency {
  specifier: string;
  version: string;
}

export interface PnpmPackage {
  resolution: {
    integrity: string;
    tarball?: string;
  };
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  dev?: boolean;
  optional?: boolean;
}

export interface LockFileEntry {
  version: string;
  resolved?: string;
  integrity?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  requires?: Record<string, string>;
}

// Configuration avec support proxy
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
      checkVulnerabilities: z.boolean().default(true),
      skipOptionalPeerDeps: z.boolean().default(false),
      excludePackages: z.array(z.string()).default([]),
      offlineMode: z.boolean().default(false),
    })
    .default({}),
});

export type AnalyzerConfig = z.infer<typeof AnalyzerConfigSchema>;

// Types pour la configuration proxy
export interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  bypassList?: string[];
}

// Erreurs personnalisées
export class NetworkError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ParseError extends Error {
  constructor(
    message: string,
    public filePath?: string
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Progress tracking
export interface AnalysisProgress {
  total: number;
  completed: number;
  currentTask: string;
  percentage: number;
  startTime: number;
  estimatedTimeRemaining?: number;
}

export interface AnalysisResult {
  missingPeerDeps: MissingPeerDep[];
  incompatibleVersions: IncompatibleVersion[];
  conflicts: DependencyConflict[];
  angularPackages: AngularPackageInfo[];
  recommendations: Recommendation[];
  migrationPath: MigrationStep[];
  summary: AnalysisSummary;
  metadata: AnalysisMetadata;
}

export interface AnalysisSummary {
  totalIssues: number;
  criticalIssues: number;
  warnings: number;
  angularPackagesCount: number;
  recommendationsCount: number;
  healthScore: number;
  securityIssues?: number;
  performanceIssues?: number;
  configurationIssues?: number;
}

export interface AnalysisMetadata {
  timestamp: string;
  duration: number;
  nodeVersion: string;
  platform: string;
  projectPath: string;
  analyzerVersion: string;
  packageManager: 'npm' | 'pnpm' | 'yarn';
  configUsed?: any;
}

export interface MissingPeerDep {
  package: string;
  requiredBy: string;
  requiredVersion: string;
  optional: boolean;
  severity: 'error' | 'warning';
}

export interface IncompatibleVersion {
  package: string;
  currentVersion: string;
  requiredVersion: string;
  requiredBy: string[];
  severity: 'error' | 'warning';
}

export interface DependencyConflict {
  package: string;
  versions: Array<{
    version: string;
    requiredBy: string[];
  }>;
  severity: 'error' | 'warning';
  resolution?: string;
}

export interface AngularPackageInfo {
  name: string;
  currentVersion: string;
  latestVersion: string;
  targetVersion: string;
  migrationGuide?: string;
  hasBreakingChanges: boolean;
  migrationComplexity: 'low' | 'medium' | 'high';
}

export interface Recommendation {
  type: 'error' | 'warning' | 'info';
  category: 'security' | 'compatibility' | 'performance' | 'migration' | 'configuration';
  message: string;
  package?: string;
  action?: string;
  command?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedEffort?: string;
}

export interface MigrationStep {
  order: number;
  description: string;
  commands: string[];
  validation?: string;
  estimatedDuration?: string;
  prerequisites?: string[];
  postSteps?: string[];
}

// Security types
export interface SecurityVulnerability {
  package: string;
  version: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
  references: string[];
  patchedVersions: string;
  vulnerableVersions: string;
  cve?: string[];
}

export interface DeprecatedPackage {
  name: string;
  version: string;
  deprecationMessage?: string;
  alternatives?: string[];
  lastUpdate: string;
}

export interface LicenseInfo {
  package: string;
  version: string;
  license: string;
  compatible: boolean;
  concerns?: string[];
}

// Performance types
export interface BundleAnalysis {
  totalSize: number;
  packageSizes: Array<{ name: string; size: number }>;
  largestPackages: Array<{ name: string; size: number }>;
  estimatedBundleSize: number;
}

export interface DuplicatedDependency {
  package: string;
  versions: string[];
  estimatedWaste: number;
}

export interface OptimizationSuggestion {
  type: 'bundle-size' | 'duplicates' | 'tree-shaking' | 'lazy-loading';
  description: string;
  action: string;
  command?: string;
  impact: 'low' | 'medium' | 'high';
  estimatedSavings?: string;
}

// Configuration types
export interface ConfigurationIssue {
  type: 'configuration' | 'build' | 'code-quality';
  severity: 'error' | 'warning' | 'info';
  description: string;
  solution: string;
}

export interface ModernizationSuggestion {
  type: 'configuration' | 'build-optimization' | 'modernization' | 'testing' | 'linting';
  description: string;
  action: string;
  command?: string;
}
