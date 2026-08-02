# syntax=docker/dockerfile:1.7

FROM python:3.13-alpine AS frontend-builder
WORKDIR /src

COPY index.html License.md node-info.json downloading upload ./
COPY assets ./assets
COPY packet-loss ./packet-loss
COPY scripts/build_frontend.py ./scripts/build_frontend.py

RUN python ./scripts/build_frontend.py --output /build/dist

FROM rust:1.88-bookworm AS packetloss-builder
WORKDIR /build

COPY packet-loss-server/Cargo.toml packet-loss-server/Cargo.lock ./
COPY packet-loss-server/src ./src

RUN cargo build --release --locked \
    && strip /build/target/release/openpacketloss-server

FROM nginxinc/nginx-unprivileged:stable-bookworm AS runtime

LABEL org.opencontainers.image.title="ZVLZ Network Test" \
      org.opencontainers.image.description="Self-hosted HTTP speed and WebRTC packet-loss benchmark" \
      org.opencontainers.image.licenses="MIT"

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl jq tini \
    && rm -rf /var/lib/apt/lists/*

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=packetloss-builder /build/target/release/openpacketloss-server /usr/local/bin/openpacketloss-server
COPY docker/zvlz-entrypoint.sh /usr/local/bin/zvlz-entrypoint
COPY --chown=101:101 --from=frontend-builder /build/dist/ /usr/share/nginx/html/

RUN chmod 0755 /usr/local/bin/zvlz-entrypoint /usr/local/bin/openpacketloss-server \
    && mkdir -p /tmp/zvlz \
    && chown -R 101:101 /tmp/zvlz /usr/share/nginx/html

WORKDIR /tmp/zvlz
USER 101

ENV PLATFORM_MODE=self \
    PORT=8080 \
    STUN_PORT=3478 \
    STUN_URL=auto \
    ICE_PORT_MIN=40000 \
    ICE_PORT_MAX=40050 \
    NODE_GEO_AUTO_DETECT=true \
    NODE_GEO_API=https://ipwho.is \
    ZVLZ_NODE_INFO_PATH=/tmp/zvlz/node-info.json \
    RUST_LOG=info

EXPOSE 3000/tcp 3478/udp 40000-40050/udp
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=6s --start-period=25s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/health >/dev/null \
   && curl -fsS http://127.0.0.1:3000/build-info.json >/dev/null \
   && curl -fsS http://127.0.0.1:3000/node-info.json >/dev/null \
   || exit 1

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/zvlz-entrypoint"]
