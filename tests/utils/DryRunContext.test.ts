import { DryRunContext, DryRunCommand } from '../../src/utils/DryRunContext';
import chalk from 'chalk';

// Mock chalk to avoid ANSI codes in tests
jest.mock('chalk', () => ({
  green: jest.fn(str => str),
  red: jest.fn(str => str),
  yellow: jest.fn(str => str),
  blue: jest.fn(str => str),
  gray: jest.fn(str => str),
  cyan: jest.fn(str => str),
  bold: jest.fn(str => ({ bold: jest.fn(s => s) }))
}));

describe('DryRunContext', () => {
  let context: DryRunContext;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    context = new DryRunContext(true);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create context in dry-run mode', () => {
      expect(context.isDryRunMode()).toBe(true);
    });

    it('should create context in normal mode', () => {
      const normalContext = new DryRunContext(false);
      expect(normalContext.isDryRunMode()).toBe(false);
    });
  });

  describe('addCommand', () => {
    it('should add command and log it in dry-run mode', () => {
      const command: DryRunCommand = {
        command: 'npm install lodash',
        description: 'Install lodash',
        impact: 'low',
        category: 'dependencies',
        wouldExecute: true
      };

      context.addCommand(command);

      expect(context.getCommands()).toHaveLength(1);
      expect(context.getCommands()[0]).toEqual(command);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log blocked commands with reason', () => {
      const command: DryRunCommand = {
        command: 'rm -rf /',
        description: 'Dangerous command',
        impact: 'high',
        category: 'security',
        wouldExecute: false,
        reason: 'Command is too dangerous'
      };

      context.addCommand(command);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Dangerous command'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Command is too dangerous'));
    });
  });

  describe('executeCommand', () => {
    it('should not execute command in dry-run mode', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const commandInfo: DryRunCommand = {
        command: 'npm test',
        description: 'Run tests',
        impact: 'low',
        category: 'dependencies',
        wouldExecute: true
      };

      const result = await context.executeCommand(mockFn, commandInfo);

      expect(mockFn).not.toHaveBeenCalled();
      expect(result).toEqual({ dryRun: true, command: commandInfo });
      expect(context.getCommands()).toHaveLength(1);
    });

    it('should execute command in normal mode', async () => {
      const normalContext = new DryRunContext(false);
      const mockFn = jest.fn().mockResolvedValue('actual result');
      const commandInfo: DryRunCommand = {
        command: 'npm test',
        description: 'Run tests',
        impact: 'low',
        category: 'dependencies',
        wouldExecute: true
      };

      const result = await normalContext.executeCommand(mockFn, commandInfo);

      expect(mockFn).toHaveBeenCalled();
      expect(result).toBe('actual result');
      expect(normalContext.getCommands()).toHaveLength(0);
    });
  });

  describe('generateReport', () => {
    beforeEach(() => {
      context.addCommand({
        command: 'npm install',
        description: 'Install dependencies',
        impact: 'low',
        category: 'dependencies',
        wouldExecute: true
      });

      context.addCommand({
        command: 'ng update @angular/core',
        description: 'Update Angular',
        impact: 'high',
        category: 'angular',
        wouldExecute: true
      });

      context.addCommand({
        command: 'npm audit fix --force',
        description: 'Fix vulnerabilities',
        impact: 'high',
        category: 'security',
        wouldExecute: false,
        reason: 'Too risky in current state'
      });
    });

    it('should generate correct report', () => {
      const report = context.generateReport();

      expect(report.totalCommands).toBe(3);
      expect(report.wouldExecute).toBe(2);
      expect(report.blocked).toBe(1);
      expect(report.estimatedDuration).toBe('10 minutes');
    });

    it('should identify risks', () => {
      const report = context.generateReport();

      expect(report.risks).toContainEqual(expect.stringContaining('2 commandes à fort impact'));
      expect(report.risks).toContainEqual(expect.stringContaining('Mise à jour Angular majeure'));
    });

    it('should generate recommendations', () => {
      const report = context.generateReport();

      expect(report.recommendations).toContainEqual(expect.stringContaining('1 commandes bloquées'));
      expect(report.recommendations).toContainEqual(expect.stringContaining('branche dédiée'));
    });
  });

  describe('displaySummary', () => {
    it('should display summary table and recommendations', () => {
      context.addCommand({
        command: 'npm install',
        description: 'Install dependencies',
        impact: 'low',
        category: 'dependencies',
        wouldExecute: true
      });

      context.displaySummary();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('RÉSUMÉ DU MODE DRY-RUN'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Total des commandes'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Aucune modification'));
    });

    it('should not display anything if not in dry-run mode', () => {
      const normalContext = new DryRunContext(false);
      normalContext.displaySummary();
      
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('RÉSUMÉ'));
    });
  });

  describe('reset', () => {
    it('should clear all commands', () => {
      context.addCommand({
        command: 'test',
        description: 'Test command',
        impact: 'low',
        category: 'dependencies',
        wouldExecute: true
      });

      expect(context.getCommands()).toHaveLength(1);
      
      context.reset();
      
      expect(context.getCommands()).toHaveLength(0);
    });
  });

  describe('estimatedDuration', () => {
    it('should calculate duration in hours for long operations', () => {
      // Add many ng update commands
      for (let i = 0; i < 15; i++) {
        context.addCommand({
          command: 'ng update @angular/core',
          description: 'Update Angular',
          impact: 'high',
          category: 'angular',
          wouldExecute: true
        });
      }

      const report = context.generateReport();
      expect(report.estimatedDuration).toBe('1h 45min');
    });
  });

  describe('edge cases', () => {
    it('should handle empty command list', () => {
      const report = context.generateReport();

      expect(report.totalCommands).toBe(0);
      expect(report.wouldExecute).toBe(0);
      expect(report.blocked).toBe(0);
      expect(report.estimatedDuration).toBe('0 minutes');
      expect(report.risks).toHaveLength(0);
    });

    it('should handle commands with missing properties', () => {
      const command: DryRunCommand = {
        command: 'npm install',
        description: 'Install',
        impact: 'low',
        category: 'dependencies',
        wouldExecute: true
        // No reason property
      };

      expect(() => context.addCommand(command)).not.toThrow();
    });
  });
});