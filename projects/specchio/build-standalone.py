#!/usr/bin/env python3
"""
SPECCHIO — build standalone.

Prende src/ e produce un unico file .html autosufficiente:
  · CSS inline
  · font woff2 come data-URI
  · immagini come data-URI
  · GSAP + ScrollTrigger + Lenis + js/*.js inline, nell'ordine giusto
  · un commento di build con data, commit e conteggio asset

Uso:  python3 tools/build-standalone.py [output.html]
Default output: specchio-standalone.html nella radice del progetto.
"""
import base64
import datetime
import hashlib
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
# layout A: repo sorgente con src/ accanto a tools/
# layout B: cartella del progetto pubblicata (i file stanno accanto allo script)
if (HERE.parent / "src" / "index.html").exists():
    ROOT = HERE.parent
    SRC = ROOT / "src"
else:
    ROOT = HERE
    SRC = HERE

JS_ORDER = [
    "vendor/gsap.min.js",
    "vendor/ScrollTrigger.min.js",
    "vendor/lenis.min.js",
    "js/gl.js",
    "js/parts.js",
    "js/main.js",
]


def data_uri(path: pathlib.Path, mime: str) -> str:
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def main() -> int:
    out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "specchio-standalone.html"
    html = (SRC / "index.html").read_text(encoding="utf-8")
    stats = {"fonts": 0, "images": 0, "js": 0}

    # ── CSS inline (con i font che diventano data-URI) ──
    css = (SRC / "css" / "style.css").read_text(encoding="utf-8")
    for font in sorted((SRC / "fonts").glob("*.woff2")):
        css = css.replace(f"../fonts/{font.name}", data_uri(font, "font/woff2"))
        stats["fonts"] += 1
    html = html.replace(
        '<link rel="stylesheet" href="css/style.css">',
        "<style>\n" + css + "\n</style>",
    )

    # ── immagini inline ──
    for img in sorted((SRC / "art").glob("*.jpg")):
        html = html.replace(
            f'src="art/{img.name}"',
            f'src="{data_uri(img, "image/jpeg")}"',
        )
        stats["images"] += 1

    # ── JS inline, nell'ordine corretto ──
    bundle = []
    for rel in JS_ORDER:
        code = (SRC / rel).read_text(encoding="utf-8")
        bundle.append(f"<script>/* {rel} */\n{code}\n</script>")
        stats["js"] += 1

    for rel in JS_ORDER:
        html = html.replace(f'<script src="{rel}"></script>', "")
    html = html.replace("</body>", "\n".join(bundle) + "\n</body>")

    # ── firma di build ──
    digest = hashlib.sha256(html.encode("utf-8")).hexdigest()[:12]
    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    banner = (
        f"<!--\n"
        f"  SPECCHIO — build standalone\n"
        f"  generato: {stamp}\n"
        f"  asset inline: {stats['fonts']} font · {stats['images']} immagini · {stats['js']} script\n"
        f"  impronta: {digest}\n"
        f"  nessuna richiesta di rete a runtime\n"
        f"-->\n"
    )
    html = re.sub(r"^<!DOCTYPE html>", lambda m: m.group(0) + "\n" + banner, html, count=1)

    out.write_text(html, encoding="utf-8")
    size = out.stat().st_size / 1024 / 1024
    try:
        shown = out.relative_to(ROOT)
    except ValueError:
        shown = out
    print(f"✔ {shown}  ·  {size:.2f} MB  ·  {digest}")
    print(f"  inline: {stats['fonts']} font, {stats['images']} immagini, {stats['js']} script")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
