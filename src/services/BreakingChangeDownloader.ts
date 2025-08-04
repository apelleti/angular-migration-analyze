import { CacheManager } from '../utils/SimpleCacheManager.js';
import { BreakingChange } from '../types/index.js';

export class BreakingChangeDownloader {
  private cache: CacheManager;
  private readonly ANGULAR_UPDATE_API = 'https://update.angular.io/api/update';
  
  constructor(cache: CacheManager) {
    this.cache = cache;
  }
  
  async download(fromVersion: string, toVersion: string): Promise<BreakingChange[]> {
    const cacheKey = `breaking-changes-${fromVersion}-${toVersion}`;
    
    // Try cache first
    const cached = await this.cache.get<BreakingChange[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Use hardcoded data directly since Angular Update API is unreliable
    const breakingChanges = this.getHardcodedBreakingChanges(fromVersion, toVersion);
    
    // Cache the results
    await this.cache.set(cacheKey, breakingChanges, 24 * 60 * 60 * 1000); // 24 hours
    
    return breakingChanges;
  }
  
  private async fetchFromUpdateGuide(from: string, to: string): Promise<any> {
    const url = `${this.ANGULAR_UPDATE_API}?from=${from}&to=${to}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    
    // Check if response is HTML instead of JSON
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      throw new Error('API returned HTML instead of JSON - service may be unavailable');
    }
    
    return JSON.parse(text);
  }
  
  private transformBreakingChanges(data: any): BreakingChange[] {
    // Transform the API response to our format
    if (!data || !Array.isArray(data)) {
      return [];
    }
    
    return data.map((change: any) => ({
      id: change.id || this.generateId(change),
      version: change.version,
      category: this.categorizeChange(change),
      severity: change.level || 'major',
      description: change.description,
      detection: {
        codePattern: change.pattern ? new RegExp(change.pattern) : undefined,
        filePattern: change.files
      },
      solution: {
        automatic: change.automatic || false,
        codeTransform: change.transform,
        manualSteps: change.steps || []
      },
      examples: change.examples || []
    }));
  }
  
  private generateId(change: any): string {
    return `angular-v${change.version}-${Date.now()}`;
  }
  
  private categorizeChange(change: any): 'api' | 'dependency' | 'tooling' | 'syntax' {
    if (change.type) return change.type;
    if (change.description?.includes('dependency')) return 'dependency';
    if (change.description?.includes('CLI') || change.description?.includes('build')) return 'tooling';
    if (change.description?.includes('syntax')) return 'syntax';
    return 'api';
  }
  
  private getHardcodedBreakingChanges(from: string, to: string): BreakingChange[] {
    const changes: BreakingChange[] = [];
    
    // Angular 15 to 16
    if (from === '15' && to === '16') {
      changes.push(
        {
          id: 'angular-v16-standalone-default',
          version: '16.0.0',
          category: 'api',
          severity: 'major',
          description: 'Standalone components are now the recommended approach',
          detection: {
            filePattern: '**/*.module.ts'
          },
          solution: {
            automatic: false,
            manualSteps: ['Consider migrating to standalone components']
          },
          examples: []
        },
        {
          id: 'angular-v16-required-inputs',
          version: '16.0.0',
          category: 'api',
          severity: 'major',
          description: 'Required inputs feature introduced',
          detection: {
            codePattern: /@Input\(\)\s+[^!]/g
          },
          solution: {
            automatic: false,
            manualSteps: ['Review inputs that should be required and add ! or make optional']
          },
          examples: [{
            before: '@Input() name: string;',
            after: '@Input({ required: true }) name!: string;'
          }]
        },
        {
          id: 'angular-v16-passing-router-data',
          version: '16.0.0',
          category: 'api',
          severity: 'minor',
          description: 'Router data and resolvers can now be passed as input',
          detection: {
            filePattern: '**/*.component.ts'
          },
          solution: {
            automatic: false,
            manualSteps: ['Consider using new router data binding features']
          },
          examples: []
        }
      );
    }
    
    // Angular 16 to 17
    if (from === '16' && to === '17') {
      changes.push({
        id: 'angular-v17-control-flow',
        version: '17.0.0',
        category: 'syntax',
        severity: 'minor',
        description: 'New control flow syntax (@if, @for, @switch)',
        detection: {
          codePattern: /\*ngIf|\*ngFor|\*ngSwitch/g
        },
        solution: {
          automatic: true,
          codeTransform: 'migrate-control-flow',
          manualSteps: ['Run: ng generate @angular/core:control-flow']
        },
        examples: [{
          before: '*ngIf="condition"',
          after: '@if (condition) { }'
        }]
      });
    }
    
    // Angular 17 to 18
    if (from === '17' && to === '18') {
      changes.push({
        id: 'angular-v18-signals',
        version: '18.0.0',
        category: 'api',
        severity: 'minor',
        description: 'Signals are now stable',
        detection: {
          filePattern: '**/*.component.ts'
        },
        solution: {
          automatic: false,
          manualSteps: ['Consider adopting signals for better performance']
        },
        examples: []
      });
    }
    
    // Angular 18 to 19
    if (from === '18' && to === '19') {
      changes.push(
        {
          id: 'angular-v19-control-flow-stable',
          version: '19.0.0',
          category: 'syntax',
          severity: 'major',
          description: 'New control flow (@if, @for, @switch) is now the recommended approach',
          detection: {
            codePattern: /\*ngIf|\*ngFor|\*ngSwitch/g
          },
          solution: {
            automatic: true,
            codeTransform: 'migrate-control-flow',
            manualSteps: ['Run: ng generate @angular/core:control-flow']
          },
          examples: [{
            before: '<div *ngIf="condition">Content</div>',
            after: '@if (condition) { <div>Content</div> }'
          }]
        },
        {
          id: 'angular-v19-event-replay',
          version: '19.0.0',
          category: 'api',
          severity: 'minor',
          description: 'Event replay feature available for better hydration',
          detection: {
            filePattern: 'main.ts'
          },
          solution: {
            automatic: false,
            manualSteps: ['Consider enabling event replay for better SSR hydration']
          },
          examples: []
        },
        {
          id: 'angular-v19-zoneless-experimental',
          version: '19.0.0',
          category: 'api',
          severity: 'minor',
          description: 'Zoneless change detection experimental support',
          detection: {
            filePattern: '**/*.component.ts'
          },
          solution: {
            automatic: false,
            manualSteps: ['Evaluate zoneless change detection for performance gains']
          },
          examples: []
        },
        {
          id: 'angular-v19-viewchild-signals',
          version: '19.0.0',
          category: 'api',
          severity: 'minor',
          description: 'ViewChild can now use signal-based queries',
          detection: {
            codePattern: /@ViewChild\([^)]+,\s*{[^}]*static:\s*false[^}]*}\)/g
          },
          solution: {
            automatic: false,
            manualSteps: ['Consider migrating to signal-based ViewChild queries']
          },
          examples: [{
            before: '@ViewChild("ref", { static: false }) ref: ElementRef;',
            after: 'ref = viewChild<ElementRef>("ref");'
          }]
        }
      );
    }
    
    // Common breaking changes for most versions
    changes.push({
      id: 'typescript-version',
      version: to + '.0.0',
      category: 'dependency',
      severity: 'critical',
      description: `TypeScript version must be updated for Angular ${to}`,
      detection: {
        filePattern: 'package.json'
      },
      solution: {
        automatic: true,
        codeTransform: 'update-typescript',
        manualSteps: [`Update TypeScript to the version required by Angular ${to}`]
      },
      examples: []
    });
    
    return changes;
  }
}