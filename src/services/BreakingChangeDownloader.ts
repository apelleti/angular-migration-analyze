import { CacheManager } from '../utils/SimpleCacheManager.js';
import { BreakingChange } from '../types/index.js';
import { AngularUpdateGuideApi } from './AngularUpdateGuideApi.js';

export class BreakingChangeDownloader {
  private cache: CacheManager;
  private updateGuideApi: AngularUpdateGuideApi;
  
  constructor(cache: CacheManager) {
    this.cache = cache;
    this.updateGuideApi = new AngularUpdateGuideApi();
  }
  
  async download(fromVersion: string, toVersion: string): Promise<BreakingChange[]> {
    const cacheKey = `breaking-changes-${fromVersion}-${toVersion}`;
    
    // Try cache first
    const cached = await this.cache.get<BreakingChange[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // Fetch from Angular Update Guide API
      const breakingChanges = await this.updateGuideApi.fetchBreakingChanges(fromVersion, toVersion);
      
      // Cache the results
      await this.cache.set(cacheKey, breakingChanges, 24 * 60 * 60 * 1000); // 24 hours
      
      return breakingChanges;
    } catch (error) {
      console.warn('Failed to fetch breaking changes from API:', error.message);
      
      // Only support Angular 17+ - return empty array for older versions
      if (Number(fromVersion) < 17) {
        return [];
      }
      
      // Fallback to minimal hardcoded data for known versions
      return this.getFallbackBreakingChanges(fromVersion, toVersion);
    }
  }
  
  private getFallbackBreakingChanges(from: string, to: string): BreakingChange[] {
    const changes: BreakingChange[] = [];
    
    // Helper function to create properly formatted BreakingChange
    const createBreakingChange = (
      id: string,
      title: string,
      description: string,
      migration: string,
      impact: 'low' | 'medium' | 'high' = 'medium',
      automated = false,
      category = 'api'
    ): BreakingChange => ({
      id,
      title,
      description,
      impact,
      effort: impact === 'high' ? 'high' : impact === 'low' ? 'low' : 'medium',
      migration,
      automated,
      documentation: `https://angular.io/guide/update-to-version-${to}`,
      fromVersion: from,
      toVersion: to,
      category
    });
    
    // Angular 17 to 18
    if (from === '17' && to === '18') {
      changes.push(
        createBreakingChange(
          'angular-v18-control-flow',
          'New control flow syntax is stable',
          'The new @if, @for, and @switch control flow syntax is now stable and recommended',
          'Run ng g @angular/core:control-flow to migrate templates',
          'medium',
          true
        ),
        createBreakingChange(
          'angular-v18-zoneless',
          'Experimental zoneless change detection',
          'Angular 18 introduces experimental zoneless change detection',
          'Consider migrating to zoneless for better performance in new applications',
          'low',
          false
        ),
        createBreakingChange(
          'angular-v18-material-3',
          'Material 3 design system',
          'Angular Material now supports Material Design 3',
          'Update your theme to use Material 3 design tokens',
          'medium',
          false,
          'material'
        )
      );
    }
    
    // Angular 18 to 19
    if (from === '18' && to === '19') {
      changes.push(
        createBreakingChange(
          'angular-v19-standalone-default',
          'Standalone is the default',
          'Standalone components are now the default for new projects',
          'All new components should be standalone by default',
          'low',
          false
        ),
        createBreakingChange(
          'angular-v19-signals-stable',
          'Signals API is stable',
          'The Signals API is now stable and recommended for reactive state management',
          'Consider migrating from RxJS subjects to signals for component state',
          'medium',
          false
        )
      );
    }
    
    return changes;
  }
  
  private transformBreakingChanges(data: any): BreakingChange[] {
    // Transform the API response to our format
    if (!data || !Array.isArray(data)) {
      return [];
    }
    
    return data.map((change: any) => ({
      id: change.id || this.generateId(change),
      title: change.title || change.action || 'Unknown change',
      description: change.description || change.action || '',
      impact: this.determineImpact(change.level),
      effort: this.determineEffort(change.action),
      migration: change.migration || change.action || '',
      automated: change.automatic || false,
      documentation: change.documentation || 'https://angular.io/guide/updating',
      fromVersion: change.fromVersion || '',
      toVersion: change.toVersion || '',
      category: this.categorizeChange(change)
    }));
  }
  
  private generateId(change: any): string {
    return `angular-v${change.version}-${Date.now()}`;
  }
  
  private determineImpact(level: string): 'low' | 'medium' | 'high' {
    switch (level) {
      case 'required': return 'high';
      case 'recommended': return 'medium';
      case 'optional': return 'low';
      default: return 'medium';
    }
  }
  
  private determineEffort(action: string): 'low' | 'medium' | 'high' | 'very-high' {
    if (!action) return 'medium';
    
    const actionLower = action.toLowerCase();
    if (actionLower.includes('refactor') || actionLower.includes('rewrite')) {
      return 'high';
    }
    if (actionLower.includes('update') || actionLower.includes('replace')) {
      return 'low';
    }
    return 'medium';
  }
  
  private categorizeChange(change: any): string {
    if (change.type) return change.type;
    if (change.description?.includes('dependency')) return 'dependency';
    if (change.description?.includes('CLI') || change.description?.includes('build')) return 'tooling';
    if (change.description?.includes('syntax')) return 'syntax';
    return 'api';
  }
}