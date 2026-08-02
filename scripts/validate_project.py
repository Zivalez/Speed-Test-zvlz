#!/usr/bin/env python3
"""Fast validation for source and built ZVLZ project files."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def check_line_endings() -> None:
    for relative in ("docker/zvlz-entrypoint.sh", "Dockerfile", "nginx.conf", "compose.yml"):
        data = (ROOT / relative).read_bytes()
        if b"\r\n" in data:
            fail(f"CRLF line endings found in {relative}")



def check_deployment_syntax() -> None:
    shell = subprocess.run(
        ["sh", "-n", str(ROOT / "docker/zvlz-entrypoint.sh")],
        capture_output=True,
        text=True,
    )
    if shell.returncode:
        fail(f"Shell syntax error in docker/zvlz-entrypoint.sh:\n{shell.stderr}")

    nginx = shutil.which("nginx")
    if not nginx:
        return

    with tempfile.TemporaryDirectory(prefix="zvlz-nginx-") as temporary:
        config = Path(temporary) / "nginx.conf"
        config.write_text(
            "pid " + temporary + "/nginx.pid;\n"
            "error_log stderr notice;\n"
            "events {}\n"
            "http {\n"
            "  include /etc/nginx/mime.types;\n"
            f"  include {ROOT / 'nginx.conf'};\n"
            "}\n",
            encoding="utf-8",
        )
        result = subprocess.run(
            [nginx, "-t", "-c", str(config), "-p", temporary],
            capture_output=True,
            text=True,
        )
        if result.returncode:
            fail(f"Nginx configuration error:\n{result.stderr}")

def check_javascript() -> None:
    files = [
        "assets/js/config.js",
        "assets/js/theme-init.js",
        "assets/js/node-info.js",
        "assets/js/app-2.5.4.js",
        "assets/js/darkmode.js",
        "packet-loss/config.js",
        "packet-loss/packet-shell.js",
        "packet-loss/main.js",
    ]
    for relative in files:
        result = subprocess.run(["node", "--check", str(ROOT / relative)], capture_output=True, text=True)
        if result.returncode:
            fail(f"JavaScript syntax error in {relative}:\n{result.stderr}")


def check_speed_ids() -> None:
    js = (ROOT / "assets/js/app-2.5.4.js").read_text(encoding="utf-8")
    svg = (ROOT / "assets/images/app.svg").read_text(encoding="utf-8")
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    required = set(re.findall(r'_\("([A-Za-z0-9_-]+)"\)', js))
    available = set(re.findall(r'\bid="([^"]+)"', svg + html))
    missing = sorted(required - available)
    if missing:
        fail("Speed-test JavaScript references missing IDs: " + ", ".join(missing))


def check_dist() -> None:
    if not DIST.exists():
        fail("dist/ does not exist; run scripts/build_frontend.py first")
    manifest = json.loads((DIST / "build-info.json").read_text(encoding="utf-8"))
    for output in manifest["assets"].values():
        if not (DIST / output.lstrip("/")).is_file():
            fail(f"Fingerprint manifest points to missing asset: {output}")

    combined_html = (DIST / "index.html").read_text(encoding="utf-8") + (DIST / "packet-loss/index.html").read_text(encoding="utf-8")
    if "bundle.min.js" in combined_html or "app-2.5.4.min.js" in combined_html:
        fail("Built HTML still references a legacy minified bundle")
    if 'src="//' in combined_html or 'href="//' in combined_html:
        fail("Protocol-relative asset URL found in built HTML")
    if "__ZVLZ_" in combined_html or "__DARK_MODE_CSS__" in combined_html:
        fail("Unresolved build placeholder found in dist HTML")
    if '<object' in (DIST / "index.html").read_text(encoding="utf-8"):
        fail("Production index still contains the asynchronous SVG object")
    if re.search(r"\bon(?:click|load|error|keydown|keyup)=", combined_html, re.I):
        fail("Inline event handler found in built HTML")
    if re.search(r'(?:src|href)="https?://', combined_html, re.I):
        fail("External runtime asset found in built HTML")

    refs = re.findall(r'(?:src|href)="(/[^"]+)"', combined_html)
    ignored = {"/", "/packet-loss/"}
    for reference in refs:
        if reference in ignored or reference.startswith("/webrtc/"):
            continue
        path = DIST / reference.lstrip("/")
        if not path.exists():
            fail(f"Built HTML references missing file: {reference}")


def main() -> None:
    check_line_endings()
    check_deployment_syntax()
    check_javascript()
    check_speed_ids()
    check_dist()
    print("Validation passed")


if __name__ == "__main__":
    main()
