import { readFileSync, writeFileSync } from 'fs';
import { DeprecatedPattern } from '../types/index.js';

interface Fix {
  description: string;
  files: string[];
  type: string;
  apply: () => Promise<void>;
}

interface FixResult {
  success: number;
  failed: number;
  details: Array<{
    file: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}

export class AutoFixer {
  private report: any;
  
  constructor(report: any) {
    this.report = report;
  }
  
  prepareFixes(autoSafeOnly: boolean = false): Fix[] {
    const fixes: Fix[] = [];
    const patterns = this.report.patterns || [];
    
    // Group patterns by type
    const groupedPatterns = this.groupPatternsByType(patterns);
    
    for (const [type, patterns] of Object.entries(groupedPatterns)) {
      if (!patterns[0].autoFixable) continue;
      if (autoSafeOnly && !this.isSafeFix(type)) continue;
      
      const fix = this.createFix(type, patterns);
      if (fix) {
        fixes.push(fix);
      }
    }
    
    return fixes;
  }
  
  private groupPatternsByType(patterns: DeprecatedPattern[]): Record<string, DeprecatedPattern[]> {
    const grouped: Record<string, DeprecatedPattern[]> = {};
    
    for (const pattern of patterns) {
      if (!grouped[pattern.type]) {
        grouped[pattern.type] = [];
      }
      grouped[pattern.type].push(pattern);
    }
    
    return grouped;
  }
  
  private isSafeFix(type: string): boolean {
    // Define which fixes are considered safe
    const safeFixes = [
      'viewchild-static-false',
      'deprecated-import',
      'renderer-deprecated'
    ];
    
    return safeFixes.includes(type);
  }
  
  private createFix(type: string, patterns: DeprecatedPattern[]): Fix | null {
    const files = [...new Set(patterns.map(p => p.file))];
    
    switch (type) {
      case 'viewchild-static-false':
        return {
          description: 'Remove static: false from ViewChild/ContentChild decorators',
          files,
          type,
          apply: () => this.fixViewChildStatic(files)
        };
        
      case 'deprecated-import':
        return {
          description: 'Update deprecated imports',
          files,
          type,
          apply: () => this.fixDeprecatedImports(files)
        };
        
      case 'renderer-deprecated':
        return {
          description: 'Replace Renderer with Renderer2',
          files,
          type,
          apply: () => this.fixRenderer(files)
        };
        
      case 'structural-directives':
        return {
          description: 'Suggest migration to new control flow syntax (@if, @for, @switch)',
          files,
          type,
          apply: () => this.fixStructuralDirectives(files)
        };
        
      case 'module-with-providers-generic':
        return {
          description: 'Add generic type to ModuleWithProviders',
          files,
          type,
          apply: () => this.fixModuleWithProviders(files)
        };
        
      default:
        return null;
    }
  }
  
  async applyFixes(fixes: Fix[]): Promise<FixResult> {
    const result: FixResult = {
      success: 0,
      failed: 0,
      details: []
    };
    
    for (const fix of fixes) {
      try {
        await fix.apply();
        result.success++;
        
        for (const file of fix.files) {
          result.details.push({
            file,
            status: 'success'
          });
        }
      } catch (error) {
        result.failed++;
        
        for (const file of fix.files) {
          result.details.push({
            file,
            status: 'failed',
            error: error.message
          });
        }
      }
    }
    
    return result;
  }
  
  private async fixViewChildStatic(files: string[]): Promise<void> {
    for (const file of files) {
      let content = readFileSync(file, 'utf-8');
      
      // Safer regex that handles nested structures better
      // Match @ViewChild or @ContentChild with only static: false option
      content = content.replace(
        /@(ViewChild|ContentChild)\s*\(\s*([^,)]+)\s*,\s*\{\s*static\s*:\s*false\s*\}\s*\)/g,
        '@$1($2)'
      );
      
      // Handle cases with additional options like { static: false, read: ElementRef }
      content = content.replace(
        /@(ViewChild|ContentChild)\s*\(\s*([^,)]+)\s*,\s*\{\s*static\s*:\s*false\s*,\s*([^}]+)\s*\}\s*\)/g,
        '@$1($2, { $3 })'
      );
      
      // Handle reverse order: { read: ElementRef, static: false }
      content = content.replace(
        /@(ViewChild|ContentChild)\s*\(\s*([^,)]+)\s*,\s*\{\s*([^,}]+)\s*,\s*static\s*:\s*false\s*\}\s*\)/g,
        '@$1($2, { $3 })'
      );
      
      writeFileSync(file, content);
    }
  }
  
  private async fixDeprecatedImports(files: string[]): Promise<void> {
    const importMap: Record<string, string> = {
      '@angular/http': '@angular/common/http',
      'rxjs/internal': 'rxjs'
    };
    
    for (const file of files) {
      let content = readFileSync(file, 'utf-8');
      
      for (const [oldImport, newImport] of Object.entries(importMap)) {
        const regex = new RegExp(
          `from\\s+['"]${oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
          'g'
        );
        content = content.replace(regex, `from '${newImport}`);
      }
      
      writeFileSync(file, content);
    }
  }
  
  private async fixRenderer(files: string[]): Promise<void> {
    for (const file of files) {
      let content = readFileSync(file, 'utf-8');
      
      // Replace Renderer import
      content = content.replace(
        /import\s*{\s*([^}]*)\bRenderer\b([^}]*)\}\s*from\s*['"]@angular\/core['"]/g,
        (match, before, after) => {
          const imports = (before + after).split(',').map(s => s.trim()).filter(s => s);
          imports.push('Renderer2');
          return `import { ${imports.join(', ')} } from '@angular/core'`;
        }
      );
      
      // Replace Renderer type references
      content = content.replace(/\bRenderer\b(?!2)/g, 'Renderer2');
      
      writeFileSync(file, content);
    }
  }
  
  private async fixModuleWithProviders(files: string[]): Promise<void> {
    for (const file of files) {
      let content = readFileSync(file, 'utf-8');
      
      // Add <NgModule> generic to ModuleWithProviders
      content = content.replace(
        /:\s*ModuleWithProviders\s*{/g,
        ': ModuleWithProviders<NgModule> {'
      );
      
      // Ensure NgModule is imported
      if (!content.includes('NgModule') && content.includes('ModuleWithProviders')) {
        content = content.replace(
          /import\s*{\s*([^}]+)\}\s*from\s*['"]@angular\/core['"]/,
          (match, imports) => {
            const importList = imports.split(',').map(s => s.trim());
            if (!importList.includes('NgModule')) {
              importList.push('NgModule');
            }
            return `import { ${importList.join(', ')} } from '@angular/core'`;
          }
        );
      }
      
      writeFileSync(file, content);
    }
  }
  
  private async fixStructuralDirectives(files: string[]): Promise<void> {
    // This is a suggestion-only fix since structural directive migration
    // requires careful consideration and should use Angular's schematic migration tools
    // No actual file modifications are made, only logged for reference
    
    // Note: In a real scenario, this would integrate with Angular CLI schematics:
    // ng generate @angular/core:control-flow
  }

  async saveFixLog(results: FixResult): Promise<void> {
    const { mkdirSync, existsSync } = await import('fs');
    const { join } = await import('path');
    
    const logDir = join(this.report.projectPath || '.', '.ngma');
    
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
    
    const log = {
      timestamp: new Date().toISOString(),
      results,
      report: this.report
    };
    
    writeFileSync(
      join(logDir, 'fix-log.json'),
      JSON.stringify(log, null, 2)
    );
  }
}