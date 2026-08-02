FROM rust:1.88-bookworm AS packetloss-builder

WORKDIR /build
COPY packet-loss-server/Cargo.toml packet-loss-server/Cargo.lock ./
COPY packet-loss-server/src ./src
RUN cargo build --release --locked

FROM nginxinc/nginx-unprivileged:stable-bookworm

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl jq tini \
    && rm -rf /var/lib/apt/lists/*

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=packetloss-builder /build/target/release/openpacketloss-server /usr/local/bin/openpacketloss-server
COPY docker/zvlz-entrypoint.sh /usr/local/bin/zvlz-entrypoint

COPY --chown=101:101 index.html node-info.json /usr/share/nginx/html/
COPY --chown=101:101 License.md /usr/share/nginx/html/LICENSE.txt
COPY --chown=101:101 downloading upload /usr/share/nginx/html/
COPY --chown=101:101 assets /usr/share/nginx/html/assets
COPY --chown=101:101 packet-loss /usr/share/nginx/html/packet-loss

RUN chmod 0755 /usr/local/bin/zvlz-entrypoint /usr/local/bin/openpacketloss-server \
    && mkdir -p /app \
    && chown -R 101:101 /app /usr/share/nginx/html

WORKDIR /app
USER 101

ENV PLATFORM_MODE=self \
    PORT=8080 \
    STUN_PORT=3478 \
    STUN_URL=auto \
    ICE_PORT_MIN=40000 \
    ICE_PORT_MAX=40050 \
    NODE_GEO_AUTO_DETECT=true \
    NODE_GEO_API=https://ipwho.is \
    RUST_LOG=info

EXPOSE 3000/tcp 3478/udp 40000-40050/udp

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/health >/dev/null || exit 1

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/zvlz-entrypoint"]
