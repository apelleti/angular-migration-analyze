// Main API exports
export { MigrationAnalyzer } from './MigrationAnalyzer';

// Types exports
export * from './types';

// Analyzer exports
export { BaseAnalyzer } from './analyzers/BaseAnalyzer';
export { PeerDependencyAnalyzer } from './analyzers/PeerDependencyAnalyzer';
export { VersionCompatibilityAnalyzer } from './analyzers/VersionCompatibilityAnalyzer';
export { AngularAnalyzer } from './analyzers/AngularAnalyzer';
export { SecurityAnalyzer } from './analyzers/SecurityAnalyzer';
export { PerformanceAnalyzer } from './analyzers/PerformanceAnalyzer';
export { ConfigurationAnalyzer } from './analyzers/ConfigurationAnalyzer';

// Utility exports
export { NpmRegistryClient } from './utils/NpmRegistryClient';
export type { NpmPackageInfo, NpmVersionInfo } from './utils/NpmRegistryClient';
export { ReportGenerator } from './utils/ReportGenerator';
export { CommandGenerator } from './utils/CommandGenerator';
export { SecurityUtils } from './utils/SecurityUtils';
export { ConfigurationManager } from './utils/ConfigurationManager';
export { DryRunContext } from './utils/DryRunContext';
export type { DryRunCommand, DryRunReport } from './utils/DryRunContext';

// Version
export const VERSION = '1.0.0';