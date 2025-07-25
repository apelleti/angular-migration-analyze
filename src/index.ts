// Main API exports
export { MigrationAnalyzer } from './MigrationAnalyzer.js';

// Types exports
export * from './types/index.js';

// Analyzer exports
export { BaseAnalyzer } from './analyzers/BaseAnalyzer.js';
export { PeerDependencyAnalyzer } from './analyzers/PeerDependencyAnalyzer.js';
export { VersionCompatibilityAnalyzer } from './analyzers/VersionCompatibilityAnalyzer.js';
export { AngularAnalyzer } from './analyzers/AngularAnalyzer.js';
export { SecurityAnalyzer } from './analyzers/SecurityAnalyzer.js';
export { PerformanceAnalyzer } from './analyzers/PerformanceAnalyzer.js';
export { ConfigurationAnalyzer } from './analyzers/ConfigurationAnalyzer.js';

// Utility exports
export { NpmRegistryClient } from './utils/NpmRegistryClient.js';
export type { NpmPackageInfo, NpmVersionInfo } from './utils/NpmRegistryClient.js';
export { ReportGenerator } from './utils/ReportGenerator.js';
export { CommandGenerator } from './utils/CommandGenerator.js';
export { SecurityUtils } from './utils/SecurityUtils.js';
export { ConfigurationManager } from './utils/ConfigurationManager.js';
export { DryRunContext } from './utils/DryRunContext.js';
export type { DryRunCommand, DryRunReport } from './utils/DryRunContext.js';

// Version
export const VERSION = '1.0.0';
