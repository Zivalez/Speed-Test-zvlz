#!/bin/sh
set -eu
umask 027

node_info_path="${ZVLZ_NODE_INFO_PATH:-/tmp/zvlz/node-info.json}"
geo_api="${NODE_GEO_API:-https://ipwho.is}"
geo_enabled="${NODE_GEO_AUTO_DETECT:-true}"
lookup_ip="${NODE_PUBLIC_IP:-${NAT_1TO1_IP:-}}"
geo_json='{}'
geo_ok="false"
packetloss_pid=""
nginx_pid=""

log() {
  printf '%s\n' "[zvlz] $*"
}

warn() {
  printf '%s\n' "[zvlz] WARNING: $*" >&2
}

cleanup() {
  trap - INT TERM EXIT
  [ -n "$nginx_pid" ] && kill -TERM "$nginx_pid" 2>/dev/null || true
  [ -n "$packetloss_pid" ] && kill -TERM "$packetloss_pid" 2>/dev/null || true
  [ -n "$nginx_pid" ] && wait "$nginx_pid" 2>/dev/null || true
  [ -n "$packetloss_pid" ] && wait "$packetloss_pid" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

mkdir -p "$(dirname "$node_info_path")"

if [ "$geo_enabled" != "false" ] && [ "$geo_enabled" != "0" ]; then
  lookup_url="${geo_api%/}/"
  [ -n "$lookup_ip" ] && lookup_url="${geo_api%/}/${lookup_ip}"

  if geo_response="$(curl -fsSL --retry 2 --retry-delay 1 --connect-timeout 4 --max-time 10 "$lookup_url" 2>/dev/null)" \
    && printf '%s' "$geo_response" | jq -e '.success == true' >/dev/null 2>&1; then
    geo_json="$geo_response"
    geo_ok="true"
  else
    warn "location API unavailable; using environment or fallback metadata"
  fi
fi

json_value() {
  printf '%s' "$geo_json" | jq -r "$1 // empty" 2>/dev/null || true
}

public_ip="${NODE_PUBLIC_IP:-$(json_value '.ip')}"
city="${NODE_CITY:-$(json_value '.city')}"
region="${NODE_REGION:-$(json_value '.region')}"
country="${NODE_COUNTRY:-$(json_value '.country')}"
country_code="${NODE_COUNTRY_CODE:-$(json_value '.country_code')}"
latitude="${NODE_LATITUDE:-$(json_value '.latitude')}"
longitude="${NODE_LONGITUDE:-$(json_value '.longitude')}"
timezone="${NODE_TIMEZONE:-$(json_value '.timezone.id')}"
isp="${NODE_ISP:-$(json_value '.connection.isp')}"
org="${NODE_ORG:-$(json_value '.connection.org')}"
asn="${NODE_ASN:-$(json_value '(.connection.asn | if . == null then empty else tostring end)')}"

city="${city:-Auto Node}"
region="${region:-Region unknown}"
country="${country:-Location unknown}"
timezone="${timezone:-Timezone unknown}"
isp="${isp:-Network provider unknown}"
public_ip="${public_ip:-Public IP unknown}"

source="fallback"
[ "$geo_ok" = "true" ] && source="ipwho.is"
if [ -n "${NODE_CITY:-}${NODE_REGION:-}${NODE_COUNTRY:-}${NODE_PUBLIC_IP:-}" ]; then
  source="environment override"
fi

if [ -z "${NAT_1TO1_IP:-}" ] && [ "$public_ip" != "Public IP unknown" ]; then
  export NAT_1TO1_IP="$public_ip"
fi

display_ip="$public_ip"
[ "${NODE_HIDE_IP:-false}" = "true" ] && display_ip="HIDDEN"

temporary_node_info="${node_info_path}.tmp.$$"
jq -n \
  --arg city "$city" \
  --arg region "$region" \
  --arg country "$country" \
  --arg country_code "$country_code" \
  --arg latitude "$latitude" \
  --arg longitude "$longitude" \
  --arg timezone "$timezone" \
  --arg isp "$isp" \
  --arg org "$org" \
  --arg asn "$asn" \
  --arg ip "$display_ip" \
  --arg source "$source" \
  '{
    city: $city,
    region: $region,
    country: $country,
    country_code: $country_code,
    latitude: (if $latitude == "" then null else ($latitude | tonumber? // $latitude) end),
    longitude: (if $longitude == "" then null else ($longitude | tonumber? // $longitude) end),
    timezone: $timezone,
    isp: $isp,
    org: $org,
    asn: (if $asn == "" then "" elif ($asn | startswith("AS")) then $asn else "AS" + $asn end),
    ip: $ip,
    source: $source
  }' > "$temporary_node_info"
mv "$temporary_node_info" "$node_info_path"

build_id="$(jq -r '.build_id // "unknown"' /usr/share/nginx/html/build-info.json 2>/dev/null || printf 'unknown')"
log "build: $build_id"
log "active node: $city, $region, $country ($source)"
if [ -n "${NAT_1TO1_IP:-}" ]; then
  log "WebRTC public address: $NAT_1TO1_IP"
else
  warn "no public NAT address detected; set NAT_1TO1_IP in Dokploy"
fi

nginx -t
openpacketloss-server &
packetloss_pid=$!

attempt=0
until curl -fsS --max-time 2 "http://127.0.0.1:${PORT:-8080}/health" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if ! kill -0 "$packetloss_pid" 2>/dev/null; then
    wait "$packetloss_pid"
    exit $?
  fi
  if [ "$attempt" -ge 20 ]; then
    warn "packet-loss backend did not become healthy"
    exit 1
  fi
  sleep 0.5
done

nginx -g 'daemon off;' &
nginx_pid=$!

while kill -0 "$packetloss_pid" 2>/dev/null && kill -0 "$nginx_pid" 2>/dev/null; do
  sleep 1
done

packetloss_status=0
nginx_status=0
if ! kill -0 "$packetloss_pid" 2>/dev/null; then
  wait "$packetloss_pid" || packetloss_status=$?
fi
if ! kill -0 "$nginx_pid" 2>/dev/null; then
  wait "$nginx_pid" || nginx_status=$?
fi

[ "$packetloss_status" -ne 0 ] && exit "$packetloss_status"
exit "$nginx_status"
