# Security Policy

## Reporting a vulnerability

Please report security issues privately through the repository's
[GitHub Security Advisories](https://github.com/hiimalexjgarcia/linkboard/security/advisories/new)
rather than opening a public issue. Include reproduction steps and the
affected commit or deployment URL. You can expect an initial response within
a few days.

## Supported versions

The latest commit on `main` and the current Netlify deployment are supported.
Older commits are not maintained.

## URL state is encoded, not encrypted

All note content lives in the URL hash. Base64url is an encoding, not
encryption: anyone with the link can decode every note, and the URL may be
stored in browser history, chat clients, email, and server logs. Do not put
secrets, credentials, or sensitive personal data in a note.

## Deployment hardening

The production deployment sets:

- `Content-Security-Policy` with `default-src 'self'`, `script-src 'self'`,
  `style-src 'self'`, and `frame-ancestors 'none'`
- `Strict-Transport-Security`
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and
  `Permissions-Policy`
- immutable caching for hashed assets and revalidation for `index.html`

Production source maps are disabled so original source is not published.

## Dependency overrides

`package.json` intentionally pins a few transitive packages:

| Override | Why |
| --- | --- |
| `deepmerge@4.1.2` | Pinned while the advisory against this dependency has no upstream patched release. |
| `glob@^14` | Pulls in the maintained release that resolves inherited path/glob advisories. |
| `minimatch@^11` | Pulls in the patched release for inherited ReDoS advisories. |

These overrides exist to keep `npm audit` clean for the build toolchain. Before
removing or changing one, run `npm ci`, `npm audit --omit=dev --audit-level=high`,
and the full test suite, and check that the upstream dependency graph no longer
needs the pin.

## CI

CI runs on Node 22.12 and 24, audits production dependencies, type-checks,
lints, runs the coverage-gated test suite, and builds the static site.
