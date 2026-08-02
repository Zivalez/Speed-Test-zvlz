# ZVLZ Network Test

A single self-hosted network diagnostics project with two separate browser tests:

- **Speed Test** at `/` measures HTTP download, upload, latency, and jitter.
- **Packet Loss Test** at `/packet-loss/` measures UDP/WebRTC packet loss, directional loss, latency, jitter, and out-of-order delivery.

The interface uses the ZVLZ visual system and automatically detects the VPS public IP location when the container starts. The active node panel can show city, region, country, coordinates, timezone, ISP, ASN, and public IP.

The landing surface is a small React/TypeScript island built from `ui/`. Its visual is generated locally by a lightweight canvas renderer: a deterministic ASCII point field, boulder, and route figure inspired by the `hero-ascii-one` composition. It has no remote scene, watermark, image dependency, or 3D runtime. The hero bundle remains separate from the speed engine.

Motion patterns are adapted from transitions.dev: staggered hero text, scale/fade modal states, text-state swaps, and vertical spinning result reels. Every custom transition has a `prefers-reduced-motion` fallback.

## Runtime architecture

One Docker image runs:

- Nginx on TCP port `3000` for both web interfaces, speed-test transfers, and WebRTC signaling proxying.
- The Rust OpenPacketLoss backend internally on TCP port `8080`.
- Built-in STUN on UDP port `3478`.
- WebRTC media on UDP ports `40000-40050`.

The packet-loss server public NAT address is populated from the same public-IP lookup used for node metadata. No database or persistent volume is required.

## Deploy with Dokploy

Use **Docker Compose**, not a Dockerfile-only application. Packet loss requires published UDP ports, which an HTTP domain route alone cannot provide.

1. Push this complete directory to your GitHub repository.
2. In Dokploy, create a **Compose** project from that repository.
3. Select `compose.yml` as the Compose file.
4. Add your domain to service `zvlz-network-test`, container port `3000`, and enable HTTPS.
5. Deploy.
6. In the VPS/provider firewall, allow inbound:
   - `3478/UDP`
   - `40000-40050/UDP`
7. The web domain only needs normal HTTPS access through Dokploy/Traefik.

The health endpoint is `/health`. It checks the packet-loss backend through Nginx, so a failed WebRTC backend also makes the container unhealthy.

### Important port note

The UDP ports must be reachable directly on the VPS public IP. Do not put UDP `3478` or `40000-40050` behind a normal HTTP reverse proxy. The browser reads the detected public IPv4 from `/node-info.json` for STUN, so an HTTP CDN/proxy can still serve the page; Cloudflare does not proxy these UDP ports. If public-IP detection fails, set `NODE_PUBLIC_IP` explicitly. If the page loads but the UI reports `UDP Path Unreachable`, closed/missing UDP ports, Dockerfile-only deployment, or an incorrect public NAT IP are the most likely causes.

The packet page checks `/health` before creating an offer. `Signaling Service Unavailable` means the internal Rust backend or Nginx proxy failed; `UDP Path Unreachable` means HTTP signaling worked but ICE could not establish the direct UDP channel.

## Automatic node location

At each container start, `docker/zvlz-entrypoint.sh` calls `https://ipwho.is/` once from the VPS. The response is written to `/node-info.json` and the public IP is supplied to the WebRTC backend as `NAT_1TO1_IP`.

IP geolocation is approximate. Country is usually reliable; city and region can reflect the provider's registered network location instead of the exact data center. Any field can be corrected through Dokploy environment variables:

| Variable | Purpose |
|---|---|
| `NODE_GEO_AUTO_DETECT` | Set to `false` to disable the lookup. |
| `NODE_GEO_API` | Override the GeoIP base endpoint; default is `https://ipwho.is`. |
| `NODE_PUBLIC_IP` | Override the detected public IP and WebRTC NAT address. |
| `NAT_1TO1_IP` | Override only the WebRTC public NAT address. |
| `NODE_CITY` | Override city. |
| `NODE_REGION` | Override region/state/prefecture. |
| `NODE_COUNTRY` | Override country. |
| `NODE_COUNTRY_CODE` | Override two-letter country code. |
| `NODE_LATITUDE` | Override latitude. |
| `NODE_LONGITUDE` | Override longitude. |
| `NODE_TIMEZONE` | Override timezone, for example `Asia/Tokyo`. |
| `NODE_ISP` | Override provider/ISP label. |
| `NODE_ORG` | Override network organization. |
| `NODE_ASN` | Override ASN. |
| `NODE_HIDE_IP` | Set to `true` to show `HIDDEN` instead of the public IP in the UI. |

Example manual correction for Tokyo:

```yaml
environment:
  NODE_CITY: Tokyo
  NODE_REGION: Tokyo
  NODE_COUNTRY: Japan
  NODE_COUNTRY_CODE: JP
  NODE_LATITUDE: 35.6762
  NODE_LONGITUDE: 139.6503
  NODE_TIMEZONE: Asia/Tokyo
```

## Run locally

```bash
docker compose up --build
```

Open `http://localhost:3000`. Packet loss also needs UDP ports from `compose.yml`; Docker Desktop networking can behave differently from a Linux VPS, so the production VPS is the authoritative WebRTC test.

## Frontend build

The Docker build compiles the React hero automatically. To rebuild only that hero while developing:

```bash
cd ui
npm ci
npm run build
```

The ASCII scene is procedural and rendered once in the browser, then redrawn only when its canvas changes size. This keeps the landing surface self-contained and avoids downloading a remote visual runtime.

## Speed-test profile

- 10 latency samples
- 12 seconds download
- 12 seconds upload
- 6 parallel HTTP streams
- 30 MiB transfer payload
- 4% browser/protocol overhead compensation

Add `?Clean` to disable compensation. Other OpenSpeedTest URL controls such as `?Run`, `?Test=Download`, `?XHR=12`, and `?Stress=300` remain available.

## Privacy

Results are calculated in the browser and are not persisted by default. The packet-loss page does not redirect or link completed results to an external results service. The startup geolocation request sends the VPS public IP to ipwho.is; it does not send visitor IP addresses or test results.

## License and attribution

The speed engine is based on OpenSpeedTest and the packet-loss engine/frontend are based on OpenPacketLoss; their MIT license notices are retained in `License.md`, `packet-loss/LICENSE`, and `packet-loss-server/LICENSE`. UI SFX code is MIT licensed and its audio is CC0; notices are retained under `assets/vendor`.
