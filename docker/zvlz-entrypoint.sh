#!/bin/sh
set -eu

html_root="${ZVLZ_HTML_ROOT:-/usr/share/nginx/html}"
geo_api="${NODE_GEO_API:-https://ipwho.is}"
geo_enabled="${NODE_GEO_AUTO_DETECT:-true}"
lookup_ip="${NODE_PUBLIC_IP:-${NAT_1TO1_IP:-}}"
geo_json='{}'
geo_ok="false"

if [ "$geo_enabled" != "false" ] && [ "$geo_enabled" != "0" ]; then
  lookup_url="${geo_api%/}/"
  if [ -n "$lookup_ip" ]; then
    lookup_url="${geo_api%/}/${lookup_ip}"
  fi

  if geo_response="$(curl -fsSL --connect-timeout 4 --max-time 10 "$lookup_url" 2>/dev/null)" \
    && printf '%s' "$geo_response" | jq -e '.success == true' >/dev/null 2>&1; then
    geo_json="$geo_response"
    geo_ok="true"
  else
    echo "[zvlz] Location API unavailable; using environment/fallback metadata." >&2
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
if [ "$geo_ok" = "true" ]; then
  source="ipwho.is"
fi
if [ -n "${NODE_CITY:-}${NODE_REGION:-}${NODE_COUNTRY:-}${NODE_PUBLIC_IP:-}" ]; then
  source="environment override"
fi

if [ -z "${NAT_1TO1_IP:-}" ] && [ "$public_ip" != "Public IP unknown" ]; then
  export NAT_1TO1_IP="$public_ip"
fi

webrtc_host="${NAT_1TO1_IP:-$public_ip}"
stun_port="${STUN_PORT:-3478}"
ice_port_min="${ICE_PORT_MIN:-40000}"
ice_port_max="${ICE_PORT_MAX:-40050}"

if [ "${NODE_HIDE_IP:-false}" = "true" ]; then
  display_ip="HIDDEN"
else
  display_ip="$public_ip"
fi

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
  --arg webrtc_host "$webrtc_host" \
  --arg stun_port "$stun_port" \
  --arg ice_port_min "$ice_port_min" \
  --arg ice_port_max "$ice_port_max" \
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
    source: $source,
    webrtc: {
      host: $webrtc_host,
      stun_port: ($stun_port | tonumber? // 3478),
      ice_port_min: ($ice_port_min | tonumber? // 40000),
      ice_port_max: ($ice_port_max | tonumber? // 40050)
    }
  }' > "$html_root/node-info.json.tmp"
mv "$html_root/node-info.json.tmp" "$html_root/node-info.json"

echo "[zvlz] Active node: $city, $region, $country ($source)"
if [ -n "${NAT_1TO1_IP:-}" ]; then
  echo "[zvlz] WebRTC public address: $NAT_1TO1_IP"
else
  echo "[zvlz] WARNING: no public NAT address detected; set NAT_1TO1_IP in Dokploy." >&2
fi

openpacketloss-server &
packetloss_pid=$!
nginx -g 'daemon off;' &
nginx_pid=$!

stop_services() {
  kill -TERM "$packetloss_pid" "$nginx_pid" 2>/dev/null || true
}

trap stop_services INT TERM EXIT

while kill -0 "$packetloss_pid" 2>/dev/null && kill -0 "$nginx_pid" 2>/dev/null; do
  sleep 2
done

stop_services
set +e
wait "$packetloss_pid"
packetloss_status=$?
wait "$nginx_pid"
nginx_status=$?
set -e

if [ "$packetloss_status" -ne 0 ]; then
  exit "$packetloss_status"
fi
exit "$nginx_status"
