"""Render the 1200x630 link-preview image to public/og.png.

Run from site/:  python3 scripts/make-og.py
Needs Playwright with Chromium. Re-run when the headline or the rack changes.
"""
import asyncio, base64, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT = ROOT / "node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2"
STACK = (ROOT / "src/data/stack.ts").read_text()

def units():
    names = re.findall(r'name: "([^"]+)",\s*\n\s*detail: "[^"]*",\s*\n\s*status: "(\w+)"', STACK)
    return list(reversed(names))  # U5 at the top

def html():
    font = base64.b64encode(FONT.read_bytes()).decode()
    rows = units()
    live = sum(1 for _, s in rows if s == "live")
    n = len(rows)
    row_html = "".join(
        f'<div class="u {s}"><span class="n">U{n - i}</span><span class="name">{name}</span><span class="led"></span></div>'
        for i, (name, s) in enumerate(rows)
    )
    return f"""<!doctype html><html><head><style>
@font-face {{ font-family: A; src: url(data:font/woff2;base64,{font}) format('woff2'); font-weight: 100 900; font-stretch: 62% 125%; }}
* {{ box-sizing: border-box; margin: 0; }}
body {{ width: 1200px; height: 630px; background: #e9eef2; font-family: A, sans-serif; color: #111a22;
  display: grid; grid-template-columns: 1.15fr 1fr; gap: 56px; padding: 64px 64px 56px; }}
.left {{ display: flex; flex-direction: column; justify-content: space-between; }}
.who {{ font-size: 26px; font-stretch: 85%; color: #46535f; }}
h1 {{ font-size: 76px; font-weight: 800; font-stretch: 125%; letter-spacing: -0.035em; line-height: 0.95; }}
.site {{ font-size: 28px; font-weight: 800; font-stretch: 75%; }}
.rack {{ background: #1e262e; border-radius: 12px; padding: 22px; display: flex; flex-direction: column; gap: 6px; align-self: center; }}
.head {{ color: #a3afba; font-stretch: 80%; font-size: 22px; display: flex; justify-content: space-between; padding: 0 4px 10px; }}
.head b {{ color: #2fbf71; font-size: 30px; }}
.u {{ display: grid; grid-template-columns: 48px 1fr 18px; align-items: center; gap: 14px; background: #29323b; padding: 16px 18px; border-radius: 3px; color: #e6ebf0; }}
.u.planned {{ background: #343e48; color: #a3afba; }}
.n {{ font-stretch: 62%; font-weight: 700; color: #a3afba; font-size: 18px; }}
.name {{ font-size: 26px; font-weight: 750; font-stretch: 88%; }}
.led {{ width: 16px; height: 16px; border-radius: 50%; background: #66717c; }}
.live .led {{ background: #2fbf71; box-shadow: 0 0 0 5px rgba(47,191,113,.2), 0 0 14px rgba(47,191,113,.6); }}
.building .led {{ background: #f0b429; }}
</style></head><body>
<div class="left"><p class="who">Ravi Kishore, Hyderabad</p><h1>I build infrastructure that can be rebuilt.</h1><p class="site">bvrinfra.in</p></div>
<div class="rack"><div class="head"><span>This site, as built</span><span><b>{live}</b> of {n} live</span></div>{row_html}</div>
</body></html>"""

async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1200, "height": 630})
        await pg.set_content(html(), wait_until="load")
        await pg.evaluate("document.fonts.ready")
        await pg.screenshot(path=str(ROOT / "public/og.png"))
        await b.close()
    print("wrote public/og.png")

asyncio.run(main())
