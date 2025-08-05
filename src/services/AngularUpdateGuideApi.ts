import fetch from 'node-fetch';
import { BreakingChange } from '../types/index.js';

interface UpdateGuideStep {
  action: string;
  description?: string;
  level?: 'required' | 'recommended' | 'optional';
  possibleIn?: number;
  necessaryAsOf?: number;
  issues?: string[];
  commit?: string;
}

interface UpdateGuideResponse {
  recommendations: UpdateGuideStep[];
  steps: UpdateGuideStep[];
}

export class AngularUpdateGuideApi {
  private readonly apiUrl = 'https://angular-update-guide-server.web.app/api/updateGuide';
  
  async fetchBreakingChanges(fromVersion: string, toVersion: string): Promise<BreakingChange[]> {
    try {
      // Angular Update Guide API expects versions like "17.0" not just "17"
      const from = `${fromVersion}.0`;
      const to = `${toVersion}.0`;
      
      const url = new URL(this.apiUrl);
      url.searchParams.append('from', from);
      url.searchParams.append('to', to);
      url.searchParams.append('advanced', 'true');
      url.searchParams.append('package', 'Angular');
      url.searchParams.append('level', '1'); // 1 = Basic, 2 = Medium, 3 = Advanced
      
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ng-migration-analyzer'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from Angular Update Guide: ${response.statusText}`);
      }
      
      const data = await response.json() as UpdateGuideResponse;
      
      // Combine recommendations and steps
      const allSteps = [...(data.recommendations || []), ...(data.steps || [])];
      
      // Convert to our BreakingChange format
      return allSteps.map((step, index) => this.convertToBreakingChange(step, index, fromVersion, toVersion));
      
    } catch (error) {
      console.error('Failed to fetch from Angular Update Guide:', error);
      // Fallback to GitHub releases
      return this.fetchFromGitHubReleases(fromVersion, toVersion);
    }
  }
  
  private convertToBreakingChange(step: UpdateGuideStep, index: number, fromVersion: string, toVersion: string): BreakingChange {
    return {
      id: `ng-update-${index}`,
      title: this.extractTitle(step.action),
      description: step.description || step.action,
      impact: this.determineImpact(step.level),
      effort: this.determineEffort(step.action),
      migration: this.extractMigrationSteps(step.action),
      automated: this.isAutomatable(step.action),
      documentation: this.extractDocumentationUrl(step),
      fromVersion,
      toVersion,
      category: this.categorizeChange(step.action)
    };
  }
  
  private extractTitle(action: string): string {
    // Extract first sentence or main action
    const firstSentence = action.split('.')[0];
    return firstSentence.length > 80 
      ? firstSentence.substring(0, 77) + '...'
      : firstSentence;
  }
  
  private determineImpact(level?: string): 'low' | 'medium' | 'high' {
    switch (level) {
      case 'required': return 'high';
      case 'recommended': return 'medium';
      case 'optional': return 'low';
      default: return 'medium';
    }
  }
  
  private determineEffort(action: string): 'low' | 'medium' | 'high' | 'very-high' {
    const lowEffortKeywords = ['update', 'replace', 'remove', 'add import'];
    const highEffortKeywords = ['refactor', 'migrate', 'rewrite', 'restructure'];
    
    const actionLower = action.toLowerCase();
    
    if (highEffortKeywords.some(keyword => actionLower.includes(keyword))) {
      return 'high';
    }
    
    if (lowEffortKeywords.some(keyword => actionLower.includes(keyword))) {
      return 'low';
    }
    
    return 'medium';
  }
  
  private extractMigrationSteps(action: string): string {
    // Clean up the action text to be more readable
    return action
      .replace(/\s+/g, ' ')
      .replace(/`/g, '"')
      .trim();
  }
  
  private isAutomatable(action: string): boolean {
    const automatablePatterns = [
      'ng update',
      'npm install',
      'replace import',
      'remove',
      'add type',
      'update decorator'
    ];
    
    const actionLower = action.toLowerCase();
    return automatablePatterns.some(pattern => actionLower.includes(pattern));
  }
  
  private extractDocumentationUrl(step: UpdateGuideStep): string {
    // Extract URLs from the action text
    const urlRegex = /https?:\/\/[^\s]+/g;
    const matches = step.action.match(urlRegex);
    
    if (matches && matches.length > 0) {
      return matches[0];
    }
    
    // Check for commit references
    if (step.commit) {
      return `https://github.com/angular/angular/commit/${step.commit}`;
    }
    
    // Default to update guide
    return 'https://angular.io/guide/updating';
  }
  
  private categorizeChange(action: string): string {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('rxjs')) return 'rxjs';
    if (actionLower.includes('router')) return 'router';
    if (actionLower.includes('forms')) return 'forms';
    if (actionLower.includes('http')) return 'http';
    if (actionLower.includes('animation')) return 'animations';
    if (actionLower.includes('material') || actionLower.includes('cdk')) return 'material';
    if (actionLower.includes('test') || actionLower.includes('karma') || actionLower.includes('jasmine')) return 'testing';
    if (actionLower.includes('zone')) return 'zonejs';
    if (actionLower.includes('ivy') || actionLower.includes('view engine')) return 'renderer';
    
    return 'core';
  }
  
  private async fetchFromGitHubReleases(fromVersion: string, toVersion: string): Promise<BreakingChange[]> {
    try {
      const releaseUrl = `https://api.github.com/repos/angular/angular/releases`;
      const response = await fetch(releaseUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ng-migration-analyzer'
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }
      
      const releases = await response.json() as any[];
      
      // Find releases for the target version
      const targetRelease = releases.find(r => 
        r.tag_name.includes(`v${toVersion}.0.0`) || 
        r.tag_name.includes(`${toVersion}.0.0`)
      );
      
      if (!targetRelease) {
        return [];
      }
      
      // Parse breaking changes from release notes
      return this.parseBreakingChangesFromReleaseNotes(targetRelease.body, fromVersion, toVersion);
      
    } catch (error) {
      console.error('Failed to fetch from GitHub:', error);
      return [];
    }
  }
  
  private parseBreakingChangesFromReleaseNotes(body: string, fromVersion: string, toVersion: string): BreakingChange[] {
    const breakingChanges: BreakingChange[] = [];
    
    // Look for breaking changes section
    const breakingSection = body.match(/##\s*BREAKING CHANGES([\s\S]*?)(?=##|$)/i);
    if (!breakingSection) {
      return breakingChanges;
    }
    
    // Parse each breaking change
    const changes = breakingSection[1].split(/\n\*\s+/).filter(c => c.trim());
    
    changes.forEach((change, index) => {
      const lines = change.trim().split('\n');
      const title = lines[0].replace(/^\*\s*/, '').trim();
      const description = lines.slice(1).join(' ').trim();
      
      breakingChanges.push({
        id: `gh-release-${index}`,
        title: title.substring(0, 80),
        description: description || title,
        impact: 'high', // Breaking changes are always high impact
        effort: 'medium',
        migration: 'See Angular migration guide for details',
        automated: false,
        documentation: `https://github.com/angular/angular/releases/tag/v${toVersion}.0.0`,
        fromVersion,
        toVersion,
        category: this.categorizeChange(title)
      });
    });
    
    return breakingChanges;
  }
}