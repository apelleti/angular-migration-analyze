import * as ts from 'typescript';
import { dirname } from 'path';
import { DeprecatedPattern } from '../types/index.js';

export class ASTPatternScanner {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  
  constructor(tsconfigPath: string) {
    const config = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    
    if (config.error) {
      throw new Error(`Failed to read tsconfig: ${config.error.messageText}`);
    }
    
    const parsed = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      dirname(tsconfigPath)
    );
    
    this.program = ts.createProgram(parsed.fileNames, parsed.options);
    this.checker = this.program.getTypeChecker();
  }
  
  scan(): DeprecatedPattern[] {
    const patterns: DeprecatedPattern[] = [];
    
    for (const sourceFile of this.program.getSourceFiles()) {
      // Skip declaration files and node_modules
      if (sourceFile.isDeclarationFile || sourceFile.fileName.includes('node_modules')) {
        continue;
      }
      
      this.scanSourceFile(sourceFile, patterns);
    }
    
    return patterns;
  }
  
  private scanSourceFile(sourceFile: ts.SourceFile, patterns: DeprecatedPattern[]): void {
    const visit = (node: ts.Node) => {
      // Check for ViewChild with static: false
      if (this.isViewChildWithStaticFalse(node)) {
        patterns.push({
          type: 'viewchild-static-false',
          file: sourceFile.fileName,
          line: this.getLineNumber(sourceFile, node),
          column: this.getColumnNumber(sourceFile, node),
          autoFixable: true,
          description: 'ViewChild with static: false is now the default'
        });
      }
      
      // Check for ModuleWithProviders without generic
      if (this.isModuleWithProvidersWithoutGeneric(node)) {
        patterns.push({
          type: 'module-with-providers-generic',
          file: sourceFile.fileName,
          line: this.getLineNumber(sourceFile, node),
          column: this.getColumnNumber(sourceFile, node),
          autoFixable: true,
          description: 'ModuleWithProviders requires a generic type'
        });
      }
      
      // Check for deprecated imports
      if (ts.isImportDeclaration(node)) {
        const deprecatedImport = this.checkDeprecatedImport(node);
        if (deprecatedImport) {
          patterns.push(deprecatedImport);
        }
      }
      
      // Check for Renderer usage (deprecated)
      if (this.isRendererUsage(node)) {
        patterns.push({
          type: 'renderer-deprecated',
          file: sourceFile.fileName,
          line: this.getLineNumber(sourceFile, node),
          column: this.getColumnNumber(sourceFile, node),
          autoFixable: true,
          description: 'Renderer is deprecated, use Renderer2'
        });
      }
      
      // Check for structural directives (*ngIf, *ngFor, *ngSwitch) for Angular 19 migration
      if (this.hasStructuralDirectivesInTemplate(node)) {
        patterns.push({
          type: 'structural-directives',
          file: sourceFile.fileName,
          line: this.getLineNumber(sourceFile, node),
          column: this.getColumnNumber(sourceFile, node),
          autoFixable: true,
          description: 'Consider migrating to new control flow syntax (@if, @for, @switch)'
        });
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
  }
  
  private isViewChildWithStaticFalse(node: ts.Node): boolean {
    if (!ts.isDecorator(node)) return false;
    
    const expr = node.expression;
    if (!ts.isCallExpression(expr)) return false;
    
    const decoratorName = expr.expression.getText();
    if (decoratorName !== 'ViewChild' && decoratorName !== 'ContentChild') return false;
    
    // Check if second argument contains { static: false }
    if (expr.arguments.length >= 2) {
      const options = expr.arguments[1];
      if (ts.isObjectLiteralExpression(options)) {
        return options.properties.some(prop => 
          ts.isPropertyAssignment(prop) &&
          prop.name?.getText() === 'static' &&
          prop.initializer?.getText() === 'false'
        );
      }
    }
    
    return false;
  }
  
  private isModuleWithProvidersWithoutGeneric(node: ts.Node): boolean {
    if (!ts.isTypeReferenceNode(node)) return false;
    
    const typeName = node.typeName.getText();
    if (typeName !== 'ModuleWithProviders') return false;
    
    // Check if it has type arguments (generic)
    return !node.typeArguments || node.typeArguments.length === 0;
  }
  
  private checkDeprecatedImport(node: ts.ImportDeclaration): DeprecatedPattern | null {
    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return null;
    
    const importPath = moduleSpecifier.text;
    
    // Check for deprecated Angular imports
    const deprecatedImports: Record<string, string> = {
      '@angular/http': '@angular/common/http',
      '@angular/platform-browser-dynamic/testing': '@angular/platform-browser-dynamic/testing',
      'rxjs/internal': 'rxjs'
    };
    
    for (const [deprecated, replacement] of Object.entries(deprecatedImports)) {
      if (importPath.startsWith(deprecated)) {
        return {
          type: 'deprecated-import',
          file: node.getSourceFile().fileName,
          line: this.getLineNumber(node.getSourceFile(), node),
          column: this.getColumnNumber(node.getSourceFile(), node),
          autoFixable: true,
          description: `Import from '${deprecated}' is deprecated, use '${replacement}'`
        };
      }
    }
    
    return null;
  }
  
  private isRendererUsage(node: ts.Node): boolean {
    if (!ts.isIdentifier(node)) return false;
    
    const text = node.getText();
    if (text !== 'Renderer') return false;
    
    // Check if it's a type reference (not just any identifier named Renderer)
    const parent = node.parent;
    return ts.isTypeReferenceNode(parent) || 
           (ts.isPropertyAccessExpression(parent) && parent.name === node);
  }
  
  private getLineNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return line + 1; // Convert to 1-based
  }
  
  private getColumnNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
    const { character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return character + 1; // Convert to 1-based
  }
  
  private hasStructuralDirectivesInTemplate(node: ts.Node): boolean {
    // Check if this is a template property in a Component decorator
    if (ts.isPropertyAssignment(node) && 
        ts.isIdentifier(node.name) && 
        node.name.getText() === 'template') {
      
      if (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer)) {
        const templateContent = node.initializer.getText();
        return /\*ngIf|\*ngFor|\*ngSwitch/.test(templateContent);
      }
    }
    
    return false;
  }
}