# Developer Workflow

## Standard Flow

1. Branch from `main`.
2. Implement feature/fix.
3. Add or update tests.
4. Run quality gates.
5. Open PR to `main`.
6. Merge only when CI is green.

## Quality Gates

```bash
npm run format
npm run lint
npm run test:coverage
```

## Release Discipline

- Keep PRs scoped.
- Keep commit messages explicit.
- Do not bypass failing checks.
