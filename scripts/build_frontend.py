#!/usr/bin/env python3
"""Build deterministic, fingerprinted static assets for the ZVLZ network test."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DIST = ROOT / "dist"

MUTABLE_ASSETS = (
    "assets/css/app.css",
    "assets/css/darkmode.css",
    "assets/js/config.js",
    "assets/js/theme-init.js",
    "assets/js/node-info.js",
    "assets/js/sound.js",
    "assets/js/app-2.5.4.js",
    "assets/js/darkmode.js",
    "assets/vendor/uisfx.js",
    "packet-loss/fonts.min.css",
    "packet-loss/styles.min.css",
    "packet-loss/critical.css",
    "packet-loss/zvlz.css",
    "packet-loss/config.js",
    "packet-loss/packet-shell.js",
    "packet-loss/main.js",
)

DIGEST_INPUTS = (
    "index.html",
    "node-info.json",
    "assets",
    "packet-loss",
    "scripts/build_frontend.py",
)

IGNORED_DIGEST_PATHS = {
    "assets/js/app-2.5.4.min.js",
    "assets/vendor/index.js.map",
    "packet-loss/bundle.min.js",
}



def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def source_digest() -> str:
    """Hash only frontend build inputs so local and Docker builds match."""
    digest = hashlib.sha256()
    paths: list[Path] = []
    for relative in DIGEST_INPUTS:
        candidate = ROOT / relative
        if candidate.is_dir():
            paths.extend(path for path in candidate.rglob("*") if path.is_file())
        elif candidate.is_file():
            paths.append(candidate)

    for path in sorted(paths):
        relative = path.relative_to(ROOT).as_posix()
        if relative in IGNORED_DIGEST_PATHS:
            continue
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()[:16]


def copy_runtime_tree(dist: Path) -> None:
    if dist.exists():
        shutil.rmtree(dist)
    dist.mkdir(parents=True)

    for directory in ("assets", "packet-loss"):
        shutil.copytree(ROOT / directory, dist / directory)

    for filename in ("License.md", "downloading", "upload", "node-info.json"):
        shutil.copy2(ROOT / filename, dist / filename)

    for obsolete in (
        "assets/js/app-2.5.4.min.js",
        "assets/vendor/index.js.map",
        "packet-loss/bundle.min.js",
    ):
        (dist / obsolete).unlink(missing_ok=True)


def fingerprint(dist: Path, relative: str, content: bytes | None = None) -> str:
    source = dist / relative
    data = source.read_bytes() if content is None else content
    short_hash = sha256(data)[:12]
    target = source.with_name(f"{source.stem}.{short_hash}{source.suffix}")
    target.write_bytes(data)
    if target != source:
        source.unlink(missing_ok=True)
    return "/" + target.relative_to(dist).as_posix()


def replace_reference(html: str, original: str, built: str) -> str:
    clean = original.lstrip("/")
    suffix = r"(?:\?v=[^\"']+)?"
    html = re.sub(re.escape("/" + clean) + suffix, built, html)
    html = re.sub(r"(?<!/)" + re.escape(clean) + suffix, built, html)
    return html


def inline_speed_svg(html: str) -> str:
    svg = (ROOT / "assets/images/app.svg").read_text(encoding="utf-8").strip()
    pattern = re.compile(r"\s*<object\b[^>]*id=\"OpenSpeedTest-UI\"[^>]*>\s*</object>", re.S)
    html, count = pattern.subn("\n" + svg, html, count=1)
    if count != 1:
        raise RuntimeError("Could not find the OpenSpeedTest SVG object in index.html")
    return html


def build(dist: Path) -> dict[str, object]:
    copy_runtime_tree(dist)
    build_id = source_digest()
    built: dict[str, str] = {}

    # Stylesheet URL is embedded in both theme scripts, so fingerprint it first.
    dark_css_url = fingerprint(dist, "assets/css/darkmode.css")
    built["assets/css/darkmode.css"] = dark_css_url

    vendor_url = fingerprint(dist, "assets/vendor/uisfx.js")
    built["assets/vendor/uisfx.js"] = vendor_url

    for relative in MUTABLE_ASSETS:
        if relative in built:
            continue

        content = (dist / relative).read_bytes()
        if relative in {"assets/js/theme-init.js", "assets/js/darkmode.js"}:
            content = content.replace(b"__DARK_MODE_CSS__", dark_css_url.encode("utf-8"))
        if relative == "assets/js/sound.js":
            vendor_relative = "../vendor/" + Path(vendor_url).name
            content = content.replace(b"../vendor/uisfx.js", vendor_relative.encode("utf-8"))

        built[relative] = fingerprint(dist, relative, content)

    index_html = (ROOT / "index.html").read_text(encoding="utf-8")
    packet_html = (ROOT / "packet-loss/index.html").read_text(encoding="utf-8")

    for original, output in built.items():
        index_html = replace_reference(index_html, original, output)
        packet_html = replace_reference(packet_html, original, output)

    index_html = inline_speed_svg(index_html)
    index_html = index_html.replace("__ZVLZ_BUILD_ID__", build_id)
    packet_html = packet_html.replace("__ZVLZ_BUILD_ID__", build_id)

    (dist / "assets/images/app.svg").unlink(missing_ok=True)
    (dist / "index.html").write_text(index_html, encoding="utf-8", newline="\n")
    (dist / "packet-loss/index.html").write_text(packet_html, encoding="utf-8", newline="\n")

    manifest = {
        "build_id": build_id,
        "assets": built,
    }
    (dist / "build-info.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_DIST)
    args = parser.parse_args()
    manifest = build(args.output.resolve())
    print(f"Built {args.output} ({manifest['build_id']})")


if __name__ == "__main__":
    main()
