import * as path from 'path';

export class SecurityUtils {
  private static readonly DANGEROUS_PATTERNS = [
    /\.\./g, // Path traversal
    /[;&|`$]/g, // Command injection
    /[<>]/g, // Redirection
    /[\n\r]/g, // Line breaks
  ];

  private static readonly ALLOWED_COMMANDS = ['npm', 'ng', 'git', 'node', 'npx', 'pnpm', 'yarn'];

  /**
   * Validate a file path to prevent directory traversal attacks
   */
  static validateFilePath(filePath: string): boolean {
    if (!filePath || typeof filePath !== 'string') {
      return false;
    }

    // Check for null bytes
    if (filePath.includes('\0')) {
      return false;
    }

    // Normalize and resolve the path
    const normalizedPath = path.normalize(filePath);
    const resolvedPath = path.resolve(filePath);

    // Check for path traversal
    if (normalizedPath.includes('..') || resolvedPath.includes('..')) {
      return false;
    }

    // Additional checks for Windows
    if (process.platform === 'win32') {
      // Check for alternate data streams
      if (filePath.includes(':')) {
        const parts = filePath.split(':');
        if (parts.length > 2 || (parts.length === 2 && !parts[0].match(/^[a-zA-Z]$/))) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Sanitize a command to prevent command injection
   */
  static sanitizeCommand(command: string): string {
    if (!command || typeof command !== 'string') {
      throw new Error('Invalid command');
    }

    // Check if command starts with allowed commands
    const commandParts = command.trim().split(/\s+/);
    const baseCommand = commandParts[0];

    if (!this.ALLOWED_COMMANDS.includes(baseCommand)) {
      throw new Error(`Command '${baseCommand}' is not allowed`);
    }

    // Remove dangerous characters
    let sanitized = command;
    this.DANGEROUS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Additional validation for specific commands
    if (baseCommand === 'git' && commandParts[1]) {
      const allowedGitCommands = ['add', 'commit', 'status', 'diff', 'log', 'checkout', 'branch'];
      if (!allowedGitCommands.includes(commandParts[1])) {
        throw new Error(`Git command '${commandParts[1]}' is not allowed`);
      }
    }

    return sanitized;
  }

  /**
   * Validate package name to prevent malicious packages
   */
  static validatePackageName(packageName: string): boolean {
    if (!packageName || typeof packageName !== 'string') {
      return false;
    }

    // Check length
    if (packageName.length > 214) {
      return false;
    }

    // npm package name rules
    const validPackageNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

    return validPackageNameRegex.test(packageName);
  }

  /**
   * Sanitize user input for display
   */
  static sanitizeForDisplay(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Generate a safe temporary file path
   */
  static generateSafeTempPath(prefix: string = 'ng-migrate'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const safeName = `${prefix}-${timestamp}-${random}`;

    return path.join(process.cwd(), '.tmp', safeName);
  }

  /**
   * Check if a URL is safe to fetch
   */
  static validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);

      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false;
      }

      // Check for localhost and private IPs
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      ) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}
