// Main API exports
export { MigrationAnalyzer } from './MigrationAnalyzerSimple.js';

// Types exports
export * from './types/index.js';

// MVP services
export { BreakingChangeDownloader } from './services/BreakingChangeDownloader.js';
export { ASTPatternScanner } from './scanners/ASTPatternScanner.js';
export { AutoFixer } from './utils/AutoFixer.js';

// Core analyzer exports (still needed by MVP)
export { BaseAnalyzer } from './analyzers/BaseAnalyzer.js';
export { PeerDependencyAnalyzer } from './analyzers/PeerDependencyAnalyzer.js';

// Utility exports (still needed)
export { NpmRegistryClient } from './utils/NpmRegistryClient.js';
export type { NpmPackageInfo, NpmVersionInfo } from './utils/NpmRegistryClient.js';

// Version
export const VERSION = '1.0.0';