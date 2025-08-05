import fetch from 'node-fetch';
import { DeprecatedPatternConfig } from '../types/index.js';

interface GitHubFile {
  name: string;
  path: string;
  download_url: string;
  type: string;
}

export class PatternLibraryService {
  private readonly PATTERN_REPO = 'angular/angular';
  private readonly PATTERN_PATH = 'packages/core/schematics/migrations';
  
  async fetchPatterns(fromVersion: string, toVersion: string): Promise<DeprecatedPatternConfig[]> {
    try {
      // Only support Angular 17+
      if (Number(fromVersion) < 17) {
        return this.getBuiltInPatterns(fromVersion, toVersion);
      }
      
      // Fetch migration configs from Angular repository
      const patterns = await this.fetchFromAngularRepo(fromVersion, toVersion);
      
      if (patterns.length === 0) {
        // Fallback to built-in patterns
        return this.getBuiltInPatterns(fromVersion, toVersion);
      }
      
      return patterns;
    } catch (error) {
      console.warn('Failed to fetch patterns from repository:', error.message);
      return this.getBuiltInPatterns(fromVersion, toVersion);
    }
  }
  
  private async fetchFromAngularRepo(fromVersion: string, toVersion: string): Promise<DeprecatedPatternConfig[]> {
    const patterns: DeprecatedPatternConfig[] = [];
    
    try {
      // Get list of migration directories
      const apiUrl = `https://api.github.com/repos/${this.PATTERN_REPO}/contents/${this.PATTERN_PATH}`;
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ng-migration-analyzer'
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }
      
      const files = await response.json() as GitHubFile[];
      
      // Look for migration folders
      const migrationFolders = files.filter(f => 
        f.type === 'dir' && 
        this.isRelevantMigration(f.name, fromVersion, toVersion)
      );
      
      // Fetch migration configs from each folder
      for (const folder of migrationFolders) {
        const migrationPatterns = await this.fetchMigrationConfig(folder.path);
        patterns.push(...migrationPatterns);
      }
      
    } catch (error) {
      console.error('Error fetching from Angular repo:', error);
    }
    
    return patterns;
  }
  
  private isRelevantMigration(folderName: string, fromVersion: string, toVersion: string): boolean {
    // Migration folders are usually named like "v16", "v17", etc.
    const versionMatch = folderName.match(/v(\d+)/);
    if (!versionMatch) return false;
    
    const migrationVersion = Number(versionMatch[1]);
    const from = Number(fromVersion);
    const to = Number(toVersion);
    
    // Include migrations between from and to versions
    return migrationVersion > from && migrationVersion <= to;
  }
  
  private async fetchMigrationConfig(folderPath: string): Promise<DeprecatedPatternConfig[]> {
    const patterns: DeprecatedPatternConfig[] = [];
    
    try {
      // Look for migration.json in the folder
      const configUrl = `https://api.github.com/repos/${this.PATTERN_REPO}/contents/${folderPath}/migration.json`;
      const response = await fetch(configUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ng-migration-analyzer'
        }
      });
      
      if (response.ok) {
        const file = await response.json() as any;
        const content = Buffer.from(file.content, 'base64').toString('utf-8');
        const config = JSON.parse(content);
        
        // Convert Angular migration format to our format
        if (config.migrations) {
          for (const migration of config.migrations) {
            patterns.push(this.convertMigrationToPattern(migration));
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching migration config from ${folderPath}:`, error);
    }
    
    return patterns;
  }
  
  private convertMigrationToPattern(migration: any): DeprecatedPatternConfig {
    return {
      id: migration.name || 'unknown',
      name: migration.description || migration.name || 'Unknown pattern',
      description: migration.description || '',
      filePattern: '**/*.ts',
      patterns: this.extractPatterns(migration),
      severity: 'warning',
      autoFixable: migration.factory ? true : false,
      replacement: migration.replacement || undefined,
      documentation: migration.pr ? `https://github.com/angular/angular/pull/${migration.pr}` : undefined
    };
  }
  
  private extractPatterns(migration: any): string[] {
    // Try to extract search patterns from migration config
    const patterns: string[] = [];
    
    if (migration.pr) {
      // Common migration patterns based on PR descriptions
      switch (migration.name) {
        case 'migration-v16-typed-forms':
          patterns.push('FormControl\\(', 'FormGroup\\(', 'FormArray\\(');
          break;
        case 'migration-v17-control-flow':
          patterns.push('\\*ngIf', '\\*ngFor', '\\*ngSwitch');
          break;
        case 'migration-v18-zoneless':
          patterns.push('NgZone', 'zone\\.run');
          break;
      }
    }
    
    return patterns.length > 0 ? patterns : ['.*']; // Fallback to match all
  }
  
  private getBuiltInPatterns(fromVersion: string, toVersion: string): DeprecatedPatternConfig[] {
    const allPatterns: DeprecatedPatternConfig[] = [
      // Angular 17+ patterns
      {
        id: 'control-flow-directives',
        name: 'Structural directives to control flow',
        description: 'Migrate *ngIf, *ngFor, *ngSwitch to new control flow syntax',
        filePattern: '**/*.{html,ts}',
        patterns: ['\\*ngIf', '\\*ngFor', '\\*ngSwitch'],
        severity: 'info',
        autoFixable: true,
        replacement: 'Use @if, @for, @switch syntax'
      },
      {
        id: 'signals-inputs',
        name: 'Input decorators to signal inputs',
        description: 'Consider migrating @Input() to input() signals',
        filePattern: '**/*.ts',
        patterns: ['@Input\\(\\)'],
        severity: 'info',
        autoFixable: false,
        replacement: 'Use input() signal function'
      },
      {
        id: 'standalone-migration',
        name: 'NgModule to standalone components',
        description: 'Consider migrating to standalone components',
        filePattern: '**/*.ts',
        patterns: ['@NgModule'],
        severity: 'info',
        autoFixable: false,
        replacement: 'Use standalone: true in component metadata'
      },
      // Angular 18+ patterns
      {
        id: 'zoneless-change-detection',
        name: 'Zone.js dependency',
        description: 'Consider migrating to zoneless change detection',
        filePattern: '**/*.ts',
        patterns: ['NgZone', 'zone\\.run', 'runOutsideAngular'],
        severity: 'info',
        autoFixable: false,
        replacement: 'Use OnPush change detection and signals'
      },
      // Common patterns
      {
        id: 'viewchild-static',
        name: 'ViewChild static flag',
        description: 'Remove static: false from ViewChild (default behavior)',
        filePattern: '**/*.ts',
        patterns: ['@ViewChild\\([^)]+,\\s*{[^}]*static:\\s*false'],
        severity: 'warning',
        autoFixable: true,
        replacement: 'Remove { static: false }'
      },
      {
        id: 'module-with-providers-generic',
        name: 'ModuleWithProviders without generic',
        description: 'Add generic type to ModuleWithProviders',
        filePattern: '**/*.ts',
        patterns: ['ModuleWithProviders(?!<)'],
        severity: 'error',
        autoFixable: true,
        replacement: 'ModuleWithProviders<YourModule>'
      },
      {
        id: 'deprecated-rxjs-operators',
        name: 'Deprecated RxJS imports',
        description: 'Import operators from rxjs/operators',
        filePattern: '**/*.ts',
        patterns: ['from [\'"]rxjs/internal'],
        severity: 'warning',
        autoFixable: true,
        replacement: 'from "rxjs/operators"'
      }
    ];
    
    // Filter patterns based on version range
    const from = Number(fromVersion);
    const to = Number(toVersion);
    
    return allPatterns.filter(pattern => {
      // Include all patterns for now, but could filter by version in the future
      if (from < 17) return false; // Only support Angular 17+
      
      if (pattern.id.includes('control-flow') || pattern.id.includes('signals')) {
        return from >= 17;
      }
      
      if (pattern.id.includes('zoneless')) {
        return from >= 18;
      }
      
      return true;
    });
  }
}