# Production Audit and Refactor Summary

## Primary production defect

The repository contained readable source files and separate manually maintained minified bundles:

- `assets/js/app-2.5.4.js` versus `assets/js/app-2.5.4.min.js`
- `packet-loss/main.js` versus `packet-loss/bundle.min.js`

The HTML loaded the minified files, while recent edits were made in the readable sources. Nginx then cached `/assets/` as immutable. This allowed local testing and the Dokploy deployment to execute different code and made recent animations disappear in production.

## Applied changes

### Frontend build integrity

- Added deterministic build script.
- Added content-hashed filenames.
- Removed runtime dependence on manually maintained minified bundles.
- Inlined the speed-test SVG in production output.
- Added `build-info.json` and build ID metadata.
- Added automated reference and syntax validation.

### UI consistency and motion

- Added robust speed-test bootstrap without assigning `window.onload`.
- Added explicit bootstrap error state.
- Added numeric result reveal animation for download, upload, final latency, and final jitter.
- Preserved `prefers-reduced-motion` behavior.
- Kept the existing packet visualization engine and state transitions.
- Replaced external Fontshare dependencies with local fonts.
- Added keyboard activation and visible focus states.
- Added packet settings dialog semantics, Escape handling, focus restoration, and focus trapping.

### Static serving and caching

- HTML, node metadata, and build metadata use no-store caching.
- Fingerprinted CSS and JavaScript use one-year immutable caching.
- Compression is enabled for text assets but disabled on measurement payloads.
- Upload CORS reflection was removed.
- Content security and browser isolation headers were added.

### Container and runtime

- Added a dedicated frontend build stage.
- Kept a separate Rust compilation stage.
- Runtime remains non-root.
- Added read-only Compose filesystem support with tmpfs mounts.
- Node metadata is now written outside the immutable web root.
- Startup validates Nginx and waits for the Rust backend to become healthy.
- The entrypoint logs the active frontend build ID.
- Rust now handles SIGTERM and closes active peer connections on shutdown.

## Important deployment requirement

HTTP routing alone is insufficient for packet-loss testing. Dokploy or the host firewall must publish:

```text
3478/udp
40000-40050/udp
```

`NAT_1TO1_IP` should be set to the VPS public IPv4 when automatic detection is unreliable.

## Remaining architectural constraints

These are inherited behaviors that were intentionally retained to avoid replacing the core test engines:

- The HTTP speed engine remains based on the upstream OpenSpeedTest implementation.
- The packet test remains an echo-based WebRTC DataChannel test.
- Direction selection changes loss accounting and presentation rather than creating a truly one-way network path.
- Payload size is not equivalent to IP Path MTU.
- Public unlimited or stress tests can consume substantial bandwidth; use access controls if the service is exposed broadly.
