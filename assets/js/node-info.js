(function () {
  "use strict";

  const fallback = {
    city: "Auto Node",
    region: "Locating",
    country: "Node location",
    country_code: "",
    latitude: null,
    longitude: null,
    timezone: "Timezone pending",
    isp: "Network provider pending",
    org: "",
    asn: "",
    ip: "Public IP pending",
    source: "pending",
    webrtc: {
      host: "",
      stun_port: 3478,
      ice_port_min: 40000,
      ice_port_max: 40050
    }
  };

  let nodeInfo = fallback;

  function clean(value, replacement) {
    const text = String(value ?? "").trim();
    return text || replacement;
  }

  function cap(value, maxLength) {
    const text = clean(value, "");
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
  }

  function upper(value, replacement) {
    return clean(value, replacement).toLocaleUpperCase("en-US");
  }

  function coordinate(value, positive, negative) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    return `${Math.abs(number).toFixed(4)}° ${number >= 0 ? positive : negative}`;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setFontSize(id, value) {
    const element = document.getElementById(id);
    if (element) element.style.fontSize = `${value}px`;
  }

  function setTextAll(selector, value) {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value;
    });
  }

  function applyNodeInfo() {
    const city = upper(nodeInfo.city, "AUTO NODE");
    const region = upper(nodeInfo.region, "REGION UNKNOWN");
    const country = upper(nodeInfo.country, "LOCATION UNKNOWN");
    const countryCode = upper(nodeInfo.country_code, "");
    const location = countryCode ? `${city}, ${countryCode}` : city;
    const provider = upper(nodeInfo.isp || nodeInfo.org, "NETWORK PROVIDER UNKNOWN");
    const asn = upper(nodeInfo.asn, "ASN UNKNOWN");
    const timezone = upper(nodeInfo.timezone, "TIMEZONE UNKNOWN");
    const publicIp = clean(nodeInfo.ip, "PUBLIC IP UNKNOWN");
    const latitude = coordinate(nodeInfo.latitude, "N", "S");
    const longitude = coordinate(nodeInfo.longitude, "E", "W");
    const coordinates = latitude && longitude ? `${latitude} / ${longitude}` : `${region} / ${country}`;

    setText("nodeCityResultDesk", city);
    setText("nodeCityIntroDesk", city);
    setText("nodeCityResultMob", city);
    setText("nodeCityIntroMob", city);
    setText("nodeRouteResultDesk", `HTTP / 6 STREAMS / ${city}`);
    setText("nodeCoordinatesDesk", `NETWORK BENCHMARK / ${coordinates}`);
    setText("nodeCoordinatesMob", `NETWORK BENCHMARK / ${location}`);
    setText("nodeHeroDesk", `A direct browser-to-server benchmark for the ZVLZ ${cap(city, 24)} node.`);
    setText("nodeHeroMob", `A direct benchmark to the ZVLZ ${cap(city, 20)} node.`);
    setText("nodeLocationDesk", cap(location, 22));
    setFontSize("nodeLocationDesk", location.length > 18 ? 30 : location.length > 13 ? 38 : 46);
    setText("nodeRegionDesk", `${cap(region, 26)} · ${cap(country, 26)}`);
    setText("nodeProviderDesk", cap(provider, 32));
    setText("nodeMetaDesk", `${asn} · ${timezone} · ${publicIp}`);
    setText("nodeLocationMob", cap(location, 22));
    setFontSize("nodeLocationMob", location.length > 18 ? 19 : location.length > 14 ? 23 : 28);
    setText("nodeRegionMob", `${cap(region, 24)} · ${cap(country, 24)}`);
    setText("nodeProviderMob", `${cap(provider, 28)} · ${timezone}`);
    setText("YourIPText", `NODE / ZVLZ ${city} / BROWSER → SERVER`);

    setTextAll(".js-node-city", city);
    setTextAll(".js-node-location", location);
    setTextAll(".js-node-region", `${region} · ${country}`);
    setTextAll(".js-node-provider", provider);
    setTextAll(".js-node-timezone", timezone);
    setTextAll(".js-node-ip", publicIp);

    const loader = document.querySelector(".loader-copy");
    if (loader) loader.textContent = `Preparing ${city} node`;

    if (Array.isArray(window.openSpeedTestServerList) && window.openSpeedTestServerList[0]) {
      window.openSpeedTestServerList[0].ServerName = `ZVLZ ${city}`;
    }

    document.title = document.body?.dataset.page === "packet-loss"
      ? `ZVLZ ${city} | Packet Loss Test`
      : `ZVLZ ${city} | Network Test`;
  }

  window.applyZvlzNodeInfo = applyNodeInfo;
  window.getZvlzNodeInfo = () => nodeInfo;

  window.zvlzNodeInfoReady = fetch("/node-info.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Node metadata returned ${response.status}`);
      return response.json();
    })
    .then((data) => {
      nodeInfo = {
        ...fallback,
        ...data,
        webrtc: { ...fallback.webrtc, ...(data.webrtc || {}) }
      };
      applyNodeInfo();
      document.dispatchEvent(new CustomEvent("zvlz:node-info", { detail: nodeInfo }));
      return nodeInfo;
    })
    .catch(() => {
      applyNodeInfo();
      return nodeInfo;
    });

  document.addEventListener("DOMContentLoaded", applyNodeInfo);
})();
