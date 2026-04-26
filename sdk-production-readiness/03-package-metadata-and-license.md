# 03: Package Metadata and License

## Priority: BLOCKING

## Summary

The package is missing critical metadata for npm publication and has no license file. Fix `package.json` fields and add an Apache 2.0 LICENSE.

## What Needs to Change

### 1. Remove `"private": true`

npm refuses to publish packages marked private. Remove this field.

### 2. Add license field and LICENSE file

Set `"license": "Apache-2.0"` in package.json.

Create a `LICENSE` file in the package root with the standard Apache License 2.0 text. Use the current year (2026) and "Anthropic, PBC" as the copyright holder (verify this is correct for the Vienna project — check other LICENSE files in the monorepo or ask).

### 3. Add repository field

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/tryvienna/desktop.git",
    "directory": "packages/sdk"
  }
}
```

(Verify the actual GitHub URL by checking the monorepo's root package.json or git remote.)

### 4. Add homepage and bugs

```json
{
  "homepage": "https://github.com/tryvienna/desktop/tree/main/packages/sdk#readme",
  "bugs": {
    "url": "https://github.com/tryvienna/desktop/issues"
  }
}
```

### 5. Add engines field

The monorepo requires Node >= 22:

```json
{
  "engines": {
    "node": ">=22.0.0"
  }
}
```

Verify this by checking the root package.json or `.nvmrc`.

### 6. Add keywords

```json
{
  "keywords": [
    "vienna",
    "plugin",
    "sdk",
    "entity",
    "integration",
    "graphql",
    "electron"
  ]
}
```

### 7. Update description

Change from the current internal-facing description to something suitable for npm:

```json
{
  "description": "SDK for building Vienna plugins — define entities, integrations, and UI extensions"
}
```

### 8. Set appropriate version

Change from `0.0.1` to `0.1.0` to signal "initial development release with unstable API" per semver conventions. `0.0.x` signals "not even worth looking at."

### 9. Add author field

```json
{
  "author": "Vienna <hello@tryvienna.dev>"
}
```

(Verify the correct author name and email.)

## Verification

1. `npm pack --dry-run` — verify metadata looks correct
2. `npm publish --dry-run` — should not error on missing fields
3. Check that `pnpm install` still works in the monorepo

## Notes

The user mentioned pairing the Apache 2.0 license with a Plugin Developer Agreement covering API stability, breaking changes, plugin store policies, and liability. This is out of scope for the SDK code work but should be noted in the README as a TODO/placeholder.
