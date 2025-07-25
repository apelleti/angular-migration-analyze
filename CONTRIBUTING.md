# Contributing to Angular Migration Analyzer

First off, thank you for considering contributing to Angular Migration Analyzer! It's people like you that make Angular Migration Analyzer such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps which reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed after following the steps
- Explain which behavior you expected to see instead and why
- Include logs and stack traces if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- Use a clear and descriptive title
- Provide a step-by-step description of the suggested enhancement
- Provide specific examples to demonstrate the steps
- Describe the current behavior and explain which behavior you expected to see instead
- Explain why this enhancement would be useful

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/angular-migration-analyzer.git
cd angular-migration-analyzer

# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Build the project
npm run build
```

## Project Structure

```
angular-migration-analyzer/
├── src/
│   ├── analyzers/        # Analysis modules
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types
│   └── cli.ts           # CLI entry point
├── tests/               # Test files
├── docs/                # Documentation
└── examples/            # Example projects
```

## Testing

We use Jest for testing. Please write tests for new code you create.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Coding Style

- We use TypeScript for type safety
- Follow the existing code style
- Use meaningful variable names
- Write self-documenting code
- Add comments for complex logic

### TypeScript Guidelines

- Always specify return types
- Use interfaces over type aliases when possible
- Avoid `any` type
- Use strict mode

### Example

```typescript
// Good
export interface AnalysisOptions {
  includeDevDependencies?: boolean;
  checkVulnerabilities?: boolean;
}

export async function analyzeProject(
  projectPath: string,
  options: AnalysisOptions = {}
): Promise<AnalysisResult> {
  // Implementation
}

// Bad
export async function analyzeProject(projectPath: any, options: any) {
  // Implementation
}
```

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation only changes
- `style:` - Changes that don't affect the meaning of the code
- `refactor:` - A code change that neither fixes a bug nor adds a feature
- `perf:` - A code change that improves performance
- `test:` - Adding missing tests or correcting existing tests
- `chore:` - Changes to the build process or auxiliary tools

### Examples

```
feat: add support for yarn workspaces
fix: resolve peer dependency detection for scoped packages
docs: update migration guide for Angular 18
test: add tests for monorepo analysis
```

## Adding New Analyzers

To add a new analyzer:

1. Create a new file in `src/analyzers/`
2. Extend the `BaseAnalyzer` class
3. Implement the `analyze` method
4. Add tests in `tests/analyzers/`
5. Register the analyzer in `MigrationAnalyzer`

```typescript
import { BaseAnalyzer } from './BaseAnalyzer';

export class MyNewAnalyzer extends BaseAnalyzer {
  name = 'my-new-analyzer';

  async analyze(): Promise<MyAnalysisResult> {
    // Implementation
  }
}
```

## Documentation

- Update the README.md if you change functionality
- Add JSDoc comments to all public APIs
- Update the CLI help text if you add new commands
- Add examples for new features

## Release Process

1. Update the version in `package.json`
2. Update CHANGELOG.md
3. Create a pull request
4. After merge, create a GitHub release
5. The CI/CD pipeline will publish to npm

## Questions?

Feel free to open an issue with your question or reach out on our [Discord channel](https://discord.gg/angular).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.