# ZVLZ Tokyo Network Test

A private, self-hosted browser benchmark for the ZVLZ Tokyo node. It measures HTTP download throughput, upload throughput, best-case latency, and jitter without accounts or automatic result storage.

The measurement engine is based on OpenSpeedTest 2.5.4. The interface, branding, privacy behavior, and container deployment are customized for ZVLZ Tokyo.

Interface audio uses the locally vendored UI SFX 0.4.0 runtime with the `zen` pack. Sound is optional, persists its on/off preference in the browser, and never uses the hover cue.

## What it measures

- Download and upload throughput in Mbps
- HTTP round-trip latency in milliseconds
- Jitter derived from consecutive latency samples
- Live throughput graphs
- Optional long-running stress tests

Default profile:

- 10 latency samples
- 12 seconds download
- 12 seconds upload
- 6 parallel HTTP streams
- 30 MiB transfer payload
- 4% browser/protocol overhead compensation

Add `?Clean` to the URL to disable the 4% compensation.

## Deploy with Dokploy

1. Create a new application from this Git repository.
2. Select **Dockerfile** as the build method.
3. Set the internal/container port to **3000**.
4. Attach the desired domain, for example `speedtest.example.com`.
5. Enable HTTPS on the domain.
6. Set the health-check path to `/health` if Dokploy asks for one.
7. Deploy.

No environment variables, volumes, or database are required.

The reverse proxy in front of the container must allow request bodies of at least 35 MiB and timeouts longer than 60 seconds. Avoid response compression, caching, or transformation on `/downloading` and `/upload`.

## Run locally with Docker

```bash
docker compose up --build -d
```

Open `http://localhost:3000`.

## URL controls

| URL parameter | Effect |
|---|---|
| `?Run` | Start immediately |
| `?Run=5` | Start after five seconds |
| `?Test=Download` | Download only |
| `?Test=Upload` | Upload only |
| `?Test=Ping` | Latency only |
| `?XHR=12` | Use 12 parallel streams |
| `?Ping=30` | Use 30 latency samples |
| `?Stress=300` | Run each transfer direction for 300 seconds |
| `?Clean` | Disable overhead compensation |

## Privacy

Results are calculated in the browser and are not stored by default. The customized interface does not link completed results to an external result service. Optional persistence remains disabled through `saveData = false` in `index.html`.

## License and attribution

The original OpenSpeedTest measurement engine is distributed under the MIT License. See `License.md`. UI SFX code is MIT licensed and its audio is CC0; the corresponding notices are stored in `assets/vendor`. Copyright and license notices must be retained in redistributed copies.
