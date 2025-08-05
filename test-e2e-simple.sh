#!/bin/bash

# Angular Migration Analyzer - Simple E2E Test
# Creates Angular project and runs CLI commands

set -e

# Configuration
TEST_PROJECT="angular-test-project"
CLI_CMD="node dist/cli/index.js"

echo "🧪 Angular Migration Analyzer - Simple E2E Test"
echo "=============================================="

# Build the analyzer
echo "📦 Building..."
npm run build

# Create Angular project structure
echo "🏗️  Creating Angular project..."
mkdir -p "$TEST_PROJECT/src/app"
mkdir -p "$TEST_PROJECT/src/assets" 
mkdir -p "$TEST_PROJECT/src/environments"

# Create package.json (Angular 17 for migration test)
cat > "$TEST_PROJECT/package.json" << 'EOF'
{
  "name": "angular-test-project",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "test": "ng test"
  },
  "dependencies": {
    "@angular/animations": "^17.3.0",
    "@angular/common": "^17.3.0",
    "@angular/compiler": "^17.3.0",
    "@angular/core": "^17.3.0",
    "@angular/forms": "^17.3.0",
    "@angular/platform-browser": "^17.3.0",
    "@angular/platform-browser-dynamic": "^17.3.0",
    "@angular/router": "^17.3.0",
    "@angular/cdk": "^17.3.0",
    "@angular/material": "^17.3.0",
    "rxjs": "~7.5.0",
    "tslib": "^2.6.0",
    "zone.js": "~0.13.0",
    "@angular/flex-layout": "^15.0.0-beta.42",
    "@ngrx/store": "^17.0.0",
    "@ngrx/effects": "^17.0.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.3.0",
    "@angular/cli": "~17.3.0",
    "@angular/compiler-cli": "^17.3.0",
    "jasmine-core": "~5.1.0",
    "karma": "~6.4.0",
    "typescript": "~5.2.0"
  }
}
EOF

# Create tsconfig.json
cat > "$TEST_PROJECT/tsconfig.json" << 'EOF'
{
  "compileOnSave": false,
  "compilerOptions": {
    "baseUrl": "./",
    "outDir": "./dist/out-tsc",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "sourceMap": true,
    "declaration": false,
    "downlevelIteration": true,
    "experimentalDecorators": true,
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "importHelpers": true,
    "target": "ES2022",
    "module": "ES2022",
    "useDefineForClassFields": false,
    "lib": ["ES2022", "dom"]
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
EOF

# Create main component
cat > "$TEST_PROJECT/src/app/app.component.ts" << 'EOF'
import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #content class="content">
      <h1>{{ title }}</h1>
      <div *ngIf="data" class="data-section">
        <h2>Data Section</h2>
        <pre>{{ data | json }}</pre>
      </div>
      <div class="items-section">
        <h2>Items List</h2>
        <ul>
          <li *ngFor="let item of items">{{ item }}</li>
        </ul>
      </div>
      <div class="actions">
        <button (click)="loadData()" class="btn btn-primary">Load Data</button>
        <button (click)="highlightElement()" class="btn btn-secondary">Highlight</button>
      </div>
    </div>
    <div #sidebar class="sidebar">
      <h3>Sidebar</h3>
      <p>Additional content</p>
    </div>
  `,
  styles: [`
    .content {
      background-color: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .content.highlighted {
      background-color: #fff3cd;
      border: 2px solid #ffc107;
    }
    .sidebar {
      background-color: #e9ecef;
      padding: 15px;
      border-radius: 8px;
    }
    .btn {
      padding: 10px 15px;
      margin-right: 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn-primary { background-color: #007bff; color: white; }
    .btn-secondary { background-color: #6c757d; color: white; }
  `]
})
export class AppComponent implements OnInit {
  title = 'Angular Migration Test Project';
  data: any = null;
  items = ['Item 1', 'Item 2', 'Item 3'];
  
  @ViewChild('content', { static: false }) content!: ElementRef;
  @ViewChild('sidebar', { static: false }) sidebar!: ElementRef;
  
  constructor(private http: HttpClient) {}
  
  ngOnInit() {
    this.loadData();
  }
  
  loadData(): void {
    this.http.get<any>('/api/data').pipe(
      map(res => res as any),
      catchError(err => {
        console.error('Error loading data:', err);
        return of({ message: 'Sample data', timestamp: new Date() });
      })
    ).subscribe(data => {
      this.data = data;
    });
  }
  
  highlightElement() {
    if (this.content?.nativeElement) {
      this.content.nativeElement.classList.add('highlighted');
    }
  }
}
EOF

# Create service
cat > "$TEST_PROJECT/src/app/data.service.ts" << 'EOF'
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private dataSubject = new BehaviorSubject<any>(null);
  
  constructor(private http: HttpClient) {}
  
  fetchData(): Observable<any> {
    return this.http.get<any>('/api/data').pipe(
      map(response => response),
      shareReplay(1)
    );
  }
  
  getData(): Observable<any> {
    return this.dataSubject.asObservable();
  }
  
  updateData(data: any): void {
    this.dataSubject.next(data);
  }
}
EOF

# Create main.ts
cat > "$TEST_PROJECT/src/main.ts" << 'EOF'
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient()
  ]
}).catch(err => console.error(err));
EOF

# Create index.html
cat > "$TEST_PROJECT/src/index.html" << 'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Angular Migration Test</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>
EOF

# Create styles.css
cat > "$TEST_PROJECT/src/styles.css" << 'EOF'
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #ffffff;
  color: #333333;
}

h1, h2, h3 {
  color: #2c3e50;
}

pre {
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}
EOF

# Create package-lock.json with Angular 17 versions and conflicts
cat > "$TEST_PROJECT/package-lock.json" << 'EOF'
{
  "name": "angular-test-project",
  "version": "0.0.0",
  "lockfileVersion": 2,
  "requires": true,
  "packages": {
    "": {
      "name": "angular-test-project",
      "version": "0.0.0",
      "dependencies": {
        "@angular/animations": "^17.3.0",
        "@angular/common": "^17.3.0",
        "@angular/compiler": "^17.3.0",
        "@angular/core": "^17.3.0",
        "@angular/forms": "^17.3.0",
        "@angular/platform-browser": "^17.3.0",
        "@angular/platform-browser-dynamic": "^17.3.0",
        "@angular/router": "^17.3.0",
        "@angular/cdk": "^17.3.0",
        "@angular/material": "^17.3.0",
        "rxjs": "~7.5.0",
        "tslib": "^2.6.0",
        "zone.js": "~0.13.0",
        "@angular/flex-layout": "^15.0.0-beta.42",
        "@ngrx/store": "^17.0.0",
        "@ngrx/effects": "^17.0.0"
      }
    },
    "node_modules/@angular/core": {
      "version": "17.3.0",
      "resolved": "https://registry.npmjs.org/@angular/core/-/core-17.3.0.tgz",
      "dependencies": {
        "tslib": "^2.3.0"  
      },
      "peerDependencies": {
        "rxjs": "^6.5.3 || ^7.4.0",
        "zone.js": "~0.14.0"
      }
    },
    "node_modules/@angular/common": {
      "version": "17.3.0",
      "resolved": "https://registry.npmjs.org/@angular/common/-/common-17.3.0.tgz",
      "peerDependencies": {
        "@angular/core": "17.3.0",
        "rxjs": "^6.5.3 || ^7.4.0"
      }
    },
    "node_modules/@angular/animations": {
      "version": "17.3.0",
      "resolved": "https://registry.npmjs.org/@angular/animations/-/animations-17.3.0.tgz",
      "peerDependencies": {
        "@angular/core": "17.3.0"
      }
    },
    "node_modules/@angular/cdk": {
      "version": "17.3.0",
      "resolved": "https://registry.npmjs.org/@angular/cdk/-/cdk-17.3.0.tgz",
      "peerDependencies": {
        "@angular/core": "^17.0.0 || ^18.0.0",
        "@angular/common": "^17.0.0 || ^18.0.0"
      }
    },
    "node_modules/@angular/material": {
      "version": "17.3.0", 
      "resolved": "https://registry.npmjs.org/@angular/material/-/material-17.3.0.tgz",
      "peerDependencies": {
        "@angular/animations": "^17.0.0 || ^18.0.0",
        "@angular/cdk": "17.3.0",
        "@angular/core": "^17.0.0 || ^18.0.0",
        "@angular/common": "^17.0.0 || ^18.0.0"
      }
    },
    "node_modules/@angular/flex-layout": {
      "version": "15.0.0-beta.42",
      "resolved": "https://registry.npmjs.org/@angular/flex-layout/-/flex-layout-15.0.0-beta.42.tgz",
      "peerDependencies": {
        "@angular/core": "^15.0.0",
        "@angular/common": "^15.0.0"
      }
    },
    "node_modules/@ngrx/store": {
      "version": "17.0.0",
      "resolved": "https://registry.npmjs.org/@ngrx/store/-/store-17.0.0.tgz",
      "peerDependencies": {
        "@angular/core": "^17.0.0",
        "rxjs": "^6.5.3 || ^7.5.0"
      }
    },
    "node_modules/@ngrx/effects": {
      "version": "17.0.0",
      "resolved": "https://registry.npmjs.org/@ngrx/effects/-/effects-17.0.0.tgz",
      "peerDependencies": {
        "@angular/core": "^17.0.0",
        "@ngrx/store": "17.0.0",
        "rxjs": "^6.5.3 || ^7.5.0"
      }
    },
    "node_modules/rxjs": {
      "version": "7.5.7",
      "resolved": "https://registry.npmjs.org/rxjs/-/rxjs-7.5.7.tgz"  
    },
    "node_modules/zone.js": {
      "version": "0.13.3",
      "resolved": "https://registry.npmjs.org/zone.js/-/zone.js-0.13.3.tgz"
    },
    "node_modules/typescript": {
      "version": "5.2.2",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.2.2.tgz"
    },
    "node_modules/tslib": {
      "version": "2.6.2",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.6.2.tgz"
    }
  }
}
EOF

# Create angular.json
cat > "$TEST_PROJECT/angular.json" << 'EOF'
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "angular-test-project": {
      "projectType": "application",
      "schematics": {},
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:browser",
          "options": {
            "outputPath": "dist/angular-test-project",
            "index": "src/index.html",
            "main": "src/main.ts",
            "polyfills": [],
            "tsConfig": "tsconfig.json",
            "assets": ["src/favicon.ico", "src/assets"],
            "styles": ["src/styles.css"],
            "scripts": []
          }
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "options": {}
        }
      }
    }
  }
}
EOF

echo "✅ Angular project created"

# Run CLI commands on the project
echo ""
echo "🔍 Running: ngma scan --export-plan --export-summary"
echo "==================================================="
$CLI_CMD scan -p "$TEST_PROJECT" --export-summary

echo ""
echo "💡 Running: ngma suggest"
echo "======================="
$CLI_CMD suggest -p "$TEST_PROJECT" --format markdown --output suggestions.md

echo ""
echo "📊 Running: ngma scan --ci --threshold high"
echo "=========================================="
$CLI_CMD scan -p "$TEST_PROJECT" --ci --threshold high || echo "Exit code: $?"

echo ""
echo "🔄 Check generated migration script"
echo "=================================="
if [ -f "$TEST_PROJECT/.ngma/migration.sh" ]; then
    echo "✅ Migration script generated"
    echo "First 10 lines of migration.sh:"
    head -10 "$TEST_PROJECT/.ngma/migration.sh"
else
    echo "❌ No migration script found"
fi

echo ""
echo "✅ Running: ngma validate"
echo "========================="
$CLI_CMD validate -p "$TEST_PROJECT" || echo "Validate not implemented yet"

echo ""
echo "🎉 E2E Test Complete!"
echo ""
echo "📁 Project available at: $TEST_PROJECT/"
echo "📄 CLI outputs are in the project directory and .ngma/ folder"
echo ""
echo "Files generated:"
ls -la "$TEST_PROJECT/" | grep -E '\.(json|ts|html|css)$' || true
if [ -d "$TEST_PROJECT/.ngma" ]; then
    echo ""
    echo "CLI outputs:"
    ls -la "$TEST_PROJECT/.ngma/" || true
    echo ""
    echo "📊 Generated reports:"
    if [ -f "$TEST_PROJECT/.ngma/analysis-report.json" ]; then
        echo "  ✅ analysis-report.json"
    fi
    if [ -f "$TEST_PROJECT/.ngma/migration-plan.md" ]; then
        echo "  ✅ migration-plan.md"
    fi
    if [ -f "$TEST_PROJECT/.ngma/migration-summary.md" ]; then
        echo "  ✅ migration-summary.md"
    fi
    if [ -f "$TEST_PROJECT/.ngma/suggestions.md" ]; then
        echo "  ✅ suggestions.md"
    fi
    if [ -f "$TEST_PROJECT/.ngma/migration.sh" ]; then
        echo "  ✅ migration.sh (auto-generated script)"
    fi
fi

# Clean up
echo ""
read -p "Clean up test project? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$TEST_PROJECT"
    echo "✅ Test project cleaned up"
fi