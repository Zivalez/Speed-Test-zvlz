# ZVLZ Network Test

A self-hosted network diagnostic service combining:

- HTTP download, upload, latency, and jitter testing.
- WebRTC DataChannel packet-loss testing over UDP.
- A built-in STUN endpoint.
- Automatic node metadata for city, region, ISP, ASN, timezone, and public IP.

The project is packaged as one non-root Docker container containing Nginx and the Rust packet-loss backend.

## Architecture

```text
Browser
├── HTTPS → reverse proxy → Nginx :3000
│   ├── fingerprinted frontend assets
│   ├── /downloading
│   ├── /upload
│   └── /webrtc/* → Rust :8080
├── UDP :3478 → built-in STUN server
└── UDP :40000-40050 → WebRTC DataChannel media
```

The bandwidth test and packet-loss test intentionally use different transports. An HTTP speed test may work even when UDP/WebRTC is blocked.

## Why production now matches local UI

Production assets are generated from the readable source files by `scripts/build_frontend.py`.

The build:

1. Uses the readable JavaScript files as the only source of truth.
2. Removes the old manually maintained minified bundles.
3. Inlines the speed-test SVG into production HTML, eliminating the object-load race.
4. Adds a content hash to every mutable CSS and JavaScript asset.
5. Writes `build-info.json` with a deterministic build ID.
6. Keeps HTML uncached while immutable hashed assets can be cached safely.

This prevents Dokploy or the browser from combining a new HTML file with an old JavaScript or CSS bundle.

## Local development

Requirements:

- Python 3.10 or newer.
- Node.js for JavaScript syntax validation.
- Docker for the complete service.

Build and validate the frontend:

```bash
python scripts/build_frontend.py
python scripts/validate_project.py
```

Preview the exact production frontend:

```bash
python -m http.server 4173 --directory dist
```

Open:

```text
http://127.0.0.1:4173/
http://127.0.0.1:4173/packet-loss/
```

The packet-loss backend is not available through the static preview. Use Docker Compose to test the complete application.

## Run with Docker Compose

```bash
docker compose up --build -d
```

Open:

```text
http://localhost:3000
```

Published ports:

| Port | Protocol | Purpose |
|---|---|---|
| 3000 | TCP | Web UI, bandwidth test, and WebRTC signaling |
| 3478 | UDP | STUN |
| 40000-40050 | UDP | WebRTC media |

## Dokploy deployment

Use the repository root as the Docker build context and the included `Dockerfile`.

### HTTP domain

Route the domain to container port `3000`.

### Required UDP publishing

Publish these directly on the server:

```text
3478/udp
40000-40050/udp
```

A normal HTTP reverse proxy does not forward these UDP ports.

### Cloudflare

For the hostname used by the packet-loss test, use DNS-only mode unless a separate product that explicitly proxies arbitrary UDP is configured. Standard Cloudflare HTTP proxying does not expose this STUN and WebRTC UDP range.

### Recommended environment

```env
PLATFORM_MODE=self
PORT=8080
STUN_PORT=3478
STUN_URL=auto
ICE_PORT_MIN=40000
ICE_PORT_MAX=40050
NODE_GEO_AUTO_DETECT=true
NODE_GEO_API=https://ipwho.is
NAT_1TO1_IP=<PUBLIC_IPV4_OF_THE_SERVER>
```

Automatic IP detection is retained, but explicitly setting `NAT_1TO1_IP` is more deterministic on a server behind NAT or multiple proxy layers.

### Confirm the deployed build

Open:

```text
https://your-domain.example/build-info.json
```

Compare its `build_id` with the build ID shown by:

```bash
cat dist/build-info.json
```

The HTML is served with `Cache-Control: no-store`, while filenames such as `app.<hash>.css` and `main.<hash>.js` are immutable. A normal redeploy therefore does not require manually changing `?v=` query strings.

## Configuration

| Variable | Default | Description |
|---|---:|---|
| `PLATFORM_MODE` | `self` | Backend mode |
| `PORT` | `8080` | Internal Rust HTTP port |
| `STUN_PORT` | `3478` | STUN UDP port |
| `STUN_URL` | `auto` | `auto`, explicit STUN URL, or `none` |
| `NAT_1TO1_IP` | auto-detected | Public IPv4 advertised in ICE candidates |
| `ICE_PORT_MIN` | `40000` | First WebRTC UDP media port |
| `ICE_PORT_MAX` | `40050` | Last WebRTC UDP media port |
| `MAX_CONNECTIONS` | `500` | Maximum active peer connections |
| `MAX_CONNECTIONS_PER_IP` | `10` | Per-client active connection limit |
| `NODE_GEO_AUTO_DETECT` | `true` | Fetch node metadata on startup |
| `NODE_GEO_API` | `https://ipwho.is` | Node metadata API |
| `NODE_PUBLIC_IP` | unset | Metadata override |
| `NODE_CITY` | unset | Metadata override |
| `NODE_REGION` | unset | Metadata override |
| `NODE_COUNTRY` | unset | Metadata override |
| `NODE_HIDE_IP` | `false` | Hide the public IP in the UI metadata |
| `RUST_LOG` | `info` | Rust log filter |

## Security and production behavior

- Runtime processes use UID `101` instead of root.
- The Compose service uses a read-only root filesystem and writable tmpfs mounts.
- Mutable node metadata is written atomically under `/tmp/zvlz`.
- Nginx applies a restrictive content security policy and other browser security headers.
- Upload CORS reflection was removed; tests are same-origin.
- WebRTC signaling is rate-limited.
- The server applies connection, SDP, message-size, and data-channel limits.
- SIGTERM and Ctrl+C trigger graceful HTTP and peer-connection shutdown.

## Validation

Run:

```bash
python scripts/build_frontend.py
python scripts/validate_project.py
```

Validation checks include:

- JavaScript syntax.
- Linux line endings for deployment files.
- Speed-test JavaScript-to-SVG ID consistency.
- Missing fingerprinted assets.
- Unresolved build placeholders.
- Accidental references to obsolete minified bundles.
- Production SVG inlining.

For a complete release, also run:

```bash
cargo test --manifest-path packet-loss-server/Cargo.toml --locked
docker compose config
docker compose build --no-cache
docker compose up -d
```

Then test both the HTTP speed test and WebRTC packet-loss test from a device outside the server network.

## Measurement notes

- Speed results measure the route between the browser and this node, not every destination on the internet.
- Packet-loss latency is round-trip time.
- WebRTC payload-size testing is not Path MTU Discovery. Large DataChannel messages may be fragmented by SCTP or WebRTC.
- Direction settings select the loss metric view; the echo path still requires traffic in both directions.

## Licenses

See `License.md`, `packet-loss/LICENSE`, and the vendor license files under `assets/vendor/`.
