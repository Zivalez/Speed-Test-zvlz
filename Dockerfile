FROM nginxinc/nginx-unprivileged:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 index.html /usr/share/nginx/html/index.html
COPY --chown=101:101 License.md /usr/share/nginx/html/LICENSE.txt
COPY --chown=101:101 downloading /usr/share/nginx/html/downloading
COPY --chown=101:101 upload /usr/share/nginx/html/upload
COPY --chown=101:101 assets /usr/share/nginx/html/assets

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
