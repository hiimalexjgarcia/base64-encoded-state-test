# Agent Notes

## Versioning

Bump the package version on every codebase update, following
[semantic versioning](https://semver.org/). This project is pre-1.0, so:

- **Patch** (`0.x.y`) — fixes and internal changes with no behavior change.
- **Minor** (`0.x+1.0`) — new features, or breaking changes to the share-link
  format or other public behavior.
- **Major** (`1.0.0`) — reserved for the first stable release.

When you bump the version, update all of these together:

1. `package.json` and `package-lock.json` (`npm version <version> --no-git-tag-version`).
2. `CHANGELOG.md` — move `[Unreleased]` entries under the new version and date.
3. The current release in `README.md` ("Release notes").

Do not commit a code change without a corresponding version bump.
