# Release Validation Report

## Passed in this workspace

- Frontend production build completed successfully.
- Build output is deterministic between the full repository and the exact Docker frontend-builder input set.
- JavaScript syntax validation passed for all maintained frontend sources.
- Speed-test JavaScript references were checked against available SVG and HTML IDs.
- Production HTML contains no legacy manually maintained bundles, unresolved placeholders, asynchronous SVG object, inline event handlers, or external runtime assets.
- All fingerprinted files referenced by `build-info.json` exist.
- Deployment files use Linux line endings.
- Entrypoint shell syntax validation passed.
- Nginx configuration syntax validation passed with the installed Nginx parser.
- Nginx runtime smoke tests passed for:
  - main UI response;
  - packet-loss UI response;
  - immutable cache headers on fingerprinted assets;
  - no-store cache headers on HTML;
  - security headers on HTML and static assets;
  - `POST /upload` returning HTTP 204;
  - `/downloading` returning exactly 31,457,280 bytes.

## Not executable in this workspace

- The Rust toolchain and Docker daemon are not installed here, so `cargo test`, the final multi-stage Docker build, and a real WebRTC/UDP integration test could not be executed locally.
- Chromium navigation is restricted by the execution environment, so a rendered browser screenshot smoke test could not be completed. The production asset graph and server behavior were validated statically and through Nginx instead.

## Required after deployment

1. Confirm `/build-info.json` reports the expected build ID.
2. Confirm TCP 3000 is routed through Dokploy.
3. Confirm UDP 3478 and UDP 40000-40050 are published directly by the host.
4. Run the packet-loss test from a device outside the VPS network.
5. Check browser DevTools for failed requests or Content Security Policy errors.
