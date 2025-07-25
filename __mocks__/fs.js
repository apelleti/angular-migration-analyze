const path = require('path');

const mockFiles = {
  '/test/package.json': JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      '@angular/core': '^15.0.0',
      'rxjs': '^7.0.0'
    },
    devDependencies: {
      'typescript': '^4.8.0'
    }
  }),
  '/test/package-lock.json': JSON.stringify({
    lockfileVersion: 2,
    name: 'test-project',
    version: '1.0.0',
    packages: {}
  }),
  '/test/angular.json': JSON.stringify({
    $schema: './node_modules/@angular/cli/lib/config/schema.json',
    version: 1,
    projects: {
      'test-app': {
        projectType: 'application',
        architect: {
          build: {
            builder: '@angular-devkit/build-angular:browser',
            options: {
              outputPath: 'dist/test-app'
            }
          }
        }
      }
    }
  }),
  '/test/tsconfig.json': JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      module: 'ES2020',
      lib: ['ES2020'],
      strict: true
    }
  }),
  '/test/project/.ng-migrate.json': JSON.stringify({
    targetVersion: '16',
    skipPackages: [],
    customRules: [],
    registry: 'https://registry.npmjs.org'
  }),
  '/test/project/package.json': JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      '@angular/core': '^15.0.0',
      'rxjs': '^7.0.0'
    },
    devDependencies: {
      'typescript': '^4.8.0'
    }
  }),
  '/test/project/package-lock.json': JSON.stringify({
    lockfileVersion: 2,
    name: 'test-project',
    version: '1.0.0',
    packages: {
      '': {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@angular/core': '^15.0.0',
          'rxjs': '^7.0.0'
        },
        devDependencies: {
          'typescript': '^4.8.0'
        }
      }
    }
  })
};

const fs = {
  readFileSync: jest.fn((filePath, encoding) => {
    const normalizedPath = path.normalize(filePath.toString());
    
    // Always return default package.json for any package.json request
    if (normalizedPath.endsWith('package.json')) {
      // Check if it's the project package.json specifically
      if (normalizedPath.includes('/test/project/')) {
        return mockFiles['/test/project/package.json'];
      }
      return mockFiles['/test/package.json'];
    }
    
    // Always return default package-lock.json for any package-lock.json request
    if (normalizedPath.endsWith('package-lock.json')) {
      // Check if it's the project package-lock.json specifically
      if (normalizedPath.includes('/test/project/')) {
        return mockFiles['/test/project/package-lock.json'];
      }
      return mockFiles['/test/package-lock.json'];
    }
    
    // Always return default .ng-migrate.json for any .ng-migrate.json request
    if (normalizedPath.endsWith('.ng-migrate.json')) {
      return mockFiles['/test/project/.ng-migrate.json'];
    }
    
    // Check mock files
    for (const [mockPath, content] of Object.entries(mockFiles)) {
      if (normalizedPath.endsWith(mockPath) || normalizedPath.includes(path.basename(mockPath))) {
        return content;
      }
    }
    
    throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
  }),
  
  existsSync: jest.fn((filePath) => {
    const normalizedPath = path.normalize(filePath.toString());
    
    // Always return true for package.json
    if (normalizedPath.endsWith('package.json')) {
      return true;
    }
    
    // Always return true for package-lock.json
    if (normalizedPath.endsWith('package-lock.json')) {
      return true;
    }
    
    // Always return true for .ng-migrate.json
    if (normalizedPath.endsWith('.ng-migrate.json')) {
      return true;
    }
    
    // Check if it's one of our mocked files
    for (const mockPath of Object.keys(mockFiles)) {
      if (normalizedPath.endsWith(mockPath) || normalizedPath.includes(path.basename(mockPath))) {
        return true;
      }
    }
    
    return false;
  }),
  
  statSync: jest.fn((filePath) => {
    const normalizedPath = path.normalize(filePath.toString());
    
    // Check if file exists in our mocks
    const exists = fs.existsSync(normalizedPath);
    
    if (exists) {
      return {
        isFile: () => true,
        isDirectory: () => false,
        size: 1000,
        mtime: new Date(),
        mode: 33188
      };
    }
    
    throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
  }),
  
  writeFileSync: jest.fn(),
  
  promises: {
    writeFile: jest.fn(() => Promise.resolve()),
    readFile: jest.fn((filePath) => Promise.resolve(fs.readFileSync(filePath)))
  },
  
  // Helper to add mock files for tests
  __setMockFiles: (files) => {
    Object.assign(mockFiles, files);
  },
  
  __resetMockFiles: () => {
    // Keep only default files
    Object.keys(mockFiles).forEach(key => {
      if (!key.startsWith('/test/')) {
        delete mockFiles[key];
      }
    });
  }
};

module.exports = fs;