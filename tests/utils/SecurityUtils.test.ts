import { SecurityUtils } from '../../src/utils/SecurityUtils';

describe('SecurityUtils', () => {
  describe('validateFilePath', () => {
    it('should accept valid file paths', () => {
      expect(SecurityUtils.validateFilePath('/home/user/project')).toBe(true);
      expect(SecurityUtils.validateFilePath('./src/index.ts')).toBe(true);
      expect(SecurityUtils.validateFilePath('package.json')).toBe(true);
    });

    it('should reject paths with directory traversal', () => {
      expect(SecurityUtils.validateFilePath('../../../etc/passwd')).toBe(false);
      expect(SecurityUtils.validateFilePath('/home/../../../etc')).toBe(false);
      expect(SecurityUtils.validateFilePath('..\\..\\windows\\system32')).toBe(false);
    });

    it('should reject paths with null bytes', () => {
      expect(SecurityUtils.validateFilePath('/home/user\0/file')).toBe(false);
      expect(SecurityUtils.validateFilePath('file\0.txt')).toBe(false);
    });

    it('should reject invalid inputs', () => {
      expect(SecurityUtils.validateFilePath('')).toBe(false);
      expect(SecurityUtils.validateFilePath(null as any)).toBe(false);
      expect(SecurityUtils.validateFilePath(undefined as any)).toBe(false);
      expect(SecurityUtils.validateFilePath(123 as any)).toBe(false);
    });
  });

  describe('sanitizeCommand', () => {
    it('should allow safe npm commands', () => {
      expect(SecurityUtils.sanitizeCommand('npm install')).toBe('npm install');
      expect(SecurityUtils.sanitizeCommand('npm run build')).toBe('npm run build');
      expect(SecurityUtils.sanitizeCommand('npm audit fix')).toBe('npm audit fix');
    });

    it('should allow safe git commands', () => {
      expect(SecurityUtils.sanitizeCommand('git status')).toBe('git status');
      expect(SecurityUtils.sanitizeCommand('git add .')).toBe('git add .');
      expect(SecurityUtils.sanitizeCommand('git commit -m "test"')).toBe('git commit -m "test"');
    });

    it('should remove dangerous characters', () => {
      expect(SecurityUtils.sanitizeCommand('npm install; rm -rf /')).toBe('npm install rm -rf /');
      expect(SecurityUtils.sanitizeCommand('npm install && echo bad')).toBe('npm install  echo bad');
      expect(SecurityUtils.sanitizeCommand('npm install | cat /etc/passwd')).toBe('npm install  cat /etc/passwd');
    });

    it('should reject non-allowed commands', () => {
      expect(() => SecurityUtils.sanitizeCommand('curl evil.com')).toThrow();
      expect(() => SecurityUtils.sanitizeCommand('wget malware.exe')).toThrow();
      expect(() => SecurityUtils.sanitizeCommand('rm -rf /')).toThrow();
    });

    it('should reject dangerous git commands', () => {
      expect(() => SecurityUtils.sanitizeCommand('git push --force')).toThrow();
      expect(() => SecurityUtils.sanitizeCommand('git reset --hard')).toThrow();
    });
  });

  describe('validatePackageName', () => {
    it('should accept valid npm package names', () => {
      expect(SecurityUtils.validatePackageName('lodash')).toBe(true);
      expect(SecurityUtils.validatePackageName('@angular/core')).toBe(true);
      expect(SecurityUtils.validatePackageName('my-package-123')).toBe(true);
      expect(SecurityUtils.validatePackageName('@scope/package.name')).toBe(true);
    });

    it('should reject invalid package names', () => {
      expect(SecurityUtils.validatePackageName('_underscore')).toBe(false);
      expect(SecurityUtils.validatePackageName('.dotfile')).toBe(false);
      expect(SecurityUtils.validatePackageName('UPPERCASE')).toBe(false);
      expect(SecurityUtils.validatePackageName('package name with spaces')).toBe(false);
    });

    it('should reject packages exceeding length limit', () => {
      const longName = 'a'.repeat(215);
      expect(SecurityUtils.validatePackageName(longName)).toBe(false);
    });

    it('should reject invalid inputs', () => {
      expect(SecurityUtils.validatePackageName('')).toBe(false);
      expect(SecurityUtils.validatePackageName(null as any)).toBe(false);
      expect(SecurityUtils.validatePackageName(undefined as any)).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should accept valid URLs', () => {
      expect(SecurityUtils.validateUrl('https://registry.npmjs.org')).toBe(true);
      expect(SecurityUtils.validateUrl('http://example.com')).toBe(true);
      expect(SecurityUtils.validateUrl('https://api.github.com/repos')).toBe(true);
    });

    it('should reject non-http(s) protocols', () => {
      expect(SecurityUtils.validateUrl('file:///etc/passwd')).toBe(false);
      expect(SecurityUtils.validateUrl('ftp://server.com')).toBe(false);
      expect(SecurityUtils.validateUrl('javascript:alert(1)')).toBe(false);
    });

    it('should reject localhost and private IPs', () => {
      expect(SecurityUtils.validateUrl('http://localhost:8080')).toBe(false);
      expect(SecurityUtils.validateUrl('http://127.0.0.1')).toBe(false);
      expect(SecurityUtils.validateUrl('http://192.168.1.1')).toBe(false);
      expect(SecurityUtils.validateUrl('http://10.0.0.1')).toBe(false);
      expect(SecurityUtils.validateUrl('http://172.16.0.1')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(SecurityUtils.validateUrl('not a url')).toBe(false);
      expect(SecurityUtils.validateUrl('')).toBe(false);
      expect(SecurityUtils.validateUrl('//no-protocol.com')).toBe(false);
    });
  });

  describe('sanitizeForDisplay', () => {
    it('should escape HTML characters', () => {
      expect(SecurityUtils.sanitizeForDisplay('<script>alert(1)</script>'))
        .toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
      expect(SecurityUtils.sanitizeForDisplay('"quoted"'))
        .toBe('&quot;quoted&quot;');
      expect(SecurityUtils.sanitizeForDisplay("it's"))
        .toBe('it&#x27;s');
    });

    it('should handle empty or invalid inputs', () => {
      expect(SecurityUtils.sanitizeForDisplay('')).toBe('');
      expect(SecurityUtils.sanitizeForDisplay(null as any)).toBe('');
      expect(SecurityUtils.sanitizeForDisplay(undefined as any)).toBe('');
    });
  });
});