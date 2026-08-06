# Contributing to munim-wifi

Thank you for helping improve `munim-wifi`.

## Development

1. Fork and clone the repository.
2. Install dependencies with `npm install`.
3. Change the TypeScript spec or platform implementation.
4. Run `npm run codegen` after every spec change.
5. Verify with `npm run build`, `npm run typecheck:example`, and `npm pack --dry-run`.
6. Test relevant native behavior on a physical device; Wi-Fi information is limited or unavailable in simulators.

Never edit `nitrogen/generated` directly. Nitrogen owns those files.

## Pull requests

- Keep changes focused and explain platform differences.
- Add or update README documentation for public API changes.
- Use Conventional Commit titles such as `feat:`, `fix:`, `docs:`, or `chore:`.
- Do not weaken permission, entitlement, privacy, or user-consent behavior to simulate unsupported capabilities.

## Reporting bugs

Include the package version, React Native or Expo version, OS and device version, permission state, a minimal reproduction, and relevant native logs. Do not include real Wi-Fi passwords, private BSSIDs, or other sensitive network data.
