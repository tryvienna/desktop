/**
 * CONTRIBUTING.md for a scaffolded plugin — short, links back to the
 * main Vienna project for the detailed guide.
 */
export function renderContributing(): string {
  return `# Contributing

Thanks for contributing. This plugin follows the conventions of the main
[Vienna project](https://github.com/tryvienna/desktop) — start there for
the detailed guide.

## Quick reference

- **Setup**: \`pnpm install\`
- **Typecheck**: \`pnpm typecheck\`
- **Lint**: \`pnpm lint\`
- **Commit style**: [Conventional Commits](https://www.conventionalcommits.org/)
- **DCO sign-off**: \`git commit -s\` (required)

## Before you send a PR

- Open an issue first for anything non-trivial
- Add tests for new behavior; include a regression test for bug fixes
- Keep PRs focused and explain the *why* in the description

## Code of Conduct

This project follows the Vienna
[Code of Conduct](https://github.com/tryvienna/desktop/blob/main/CODE_OF_CONDUCT.md).
Report concerns to \`conduct@tryvienna.dev\`.

## Security

Report vulnerabilities privately to \`security@tryvienna.dev\`. See the
main Vienna [SECURITY.md](https://github.com/tryvienna/desktop/blob/main/SECURITY.md)
for the full disclosure process.
`;
}
