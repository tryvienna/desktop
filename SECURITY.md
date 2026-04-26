# Security Policy

Vienna executes user-approved shell commands, spawns subprocesses, loads
third-party plugins, and bridges IPC between a main and renderer process. It
has real attack surface, and we take vulnerability reports seriously.

## Reporting a vulnerability

**Please do not open a public GitHub issue.**

Email `security@tryvienna.dev` with:

- A description of the issue and its impact
- Steps to reproduce (a proof-of-concept is ideal, but not required)
- Affected versions
- Any suggested mitigation
- Whether you'd like credit in the disclosure, and if so under what name

You can request a PGP key at the same address if you want to encrypt the
report.

## What to expect

- **Acknowledgement within 3 business days.** If you don't hear back, resend
  or try `hello@tryvienna.dev` as a fallback with "SECURITY" in the subject.
- **Initial assessment within 7 days.** We'll tell you whether we can
  reproduce it, our severity read, and a rough fix timeline.
- **Coordinated disclosure.** We aim to ship fixes within 90 days of
  acknowledgement for high/critical issues, sooner when feasible. We'll
  coordinate the public disclosure window with you.
- **Credit.** If you'd like public credit, we'll include you in release notes
  and the advisory.

## Scope

In-scope:

- The main Vienna desktop app and its packages in this repository
- The relay server (`apps/relay`)
- The `@tryvienna/sdk` and `@tryvienna/ui` packages
- First-party plugins under the `tryvienna` GitHub organization

Out-of-scope (report directly to the upstream maintainers):

- Vulnerabilities in third-party plugins not authored by us
- Upstream Electron, Node, or OS vulnerabilities without a Vienna-specific
  amplification
- Denial-of-service from a user running commands against their own machine
- Self-XSS or issues requiring an attacker to already have full local access

## Hardening posture

We care about, and welcome issues on, the following in particular:

- **Shell execution surface.** Anything that causes the desktop to execute a
  command the user did not approve, or to bypass permission prompts.
- **Plugin sandbox escapes.** A plugin gaining access to APIs or data beyond
  what its declared permissions allow.
- **IPC contract violations.** Renderer causing main-process actions that
  bypass Zod validation, permission checks, or origin checks.
- **OAuth / auth-code handling.** Token leakage, redirect-URI smuggling,
  callback-port races.
- **Auto-updater.** Install-time code execution or downgrade attacks.
- **Keychain / secret storage.** Anything that exposes stored API keys.

## Safe harbor

We will not pursue legal action against good-faith security research that:

- Respects user privacy and data — no exfiltration beyond what's necessary
  to demonstrate the issue
- Avoids disruption to third-party users and services
- Gives us reasonable time to fix the issue before public disclosure
- Does not involve attacks on tryvienna.dev infrastructure without prior
  written permission

If in doubt, email first.
