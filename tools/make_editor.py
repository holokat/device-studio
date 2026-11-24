#!/usr/bin/env python3
"""Builds screens/editor/index.html: a video-editing app on a desktop, in plain
HTML/CSS with inline SVG (no bitmaps), for the Studio Display presentation
screen. The layout is fluid (flex/grid), so it fits any display aspect; the
studio lays it out at 1920 px wide. Run: python3 tools/make_editor.py"""
import math, random, pathlib

random.seed(7)
OUT = pathlib.Path(__file__).resolve().parent.parent / 'screens' / 'editor' / 'index.html'
uid = 0

PALETTES = {
    'golden': dict(sky=('#f2a65e', '#fde3b4'), sun='#fff3d6', far='#b48aa0', mid='#6a5878', snow='#f7eee4', near='#2f2a3c', lake=('#e9b37a', '#8d6a7c'), trees='#1f1c29'),
    'day':    dict(sky=('#5d9bd8', '#d8ecff'), sun='#ffffff', far='#9fb8d4', mid='#5e7894', snow='#f5f8fb', near='#2d4a3e', lake=('#7fb2dd', '#3f6c8f'), trees='#1d3a2e'),
    'dusk':   dict(sky=('#5b4a9e', '#f08a7e'), sun='#ffd2a6', far='#8a6aa8', mid='#4d3d74', snow='#e9dcf2', near='#231c38', lake=('#c77d96', '#3b2f5c'), trees='#16122a'),
    'night':  dict(sky=('#0d1630', '#33497a'), sun='#e8efff', far='#2f3f66', mid='#1f2b4a', snow='#aebbd8', near='#0f1526', lake=('#2b3c66', '#0f1730'), trees='#0a0f1c'),
    'forest': dict(sky=('#9cc7c0', '#eef3df'), sun='#fffbe8', far='#9fb5a3', mid='#5f7d64', snow='#f1f4ec', near='#2e4a33', lake=('#8fbfb2', '#456b5c'), trees='#1c3322'),
    'desert': dict(sky=('#e78a4f', '#f9d29a'), sun='#fff0cf', far='#c98a6b', mid='#9c5a46', snow='#f3d9c4', near='#5a3027', lake=('#e7a874', '#94554a'), trees='#3a1f1a'),
}


def ridge(y0, amp, n, seed, w=160):
    r = random.Random(seed)
    pts = [(0, y0)]
    for i in range(1, n):
        x = w * i / n
        pts.append((x, y0 - amp * (0.35 + 0.65 * r.random()) * (1 if i % 2 else 0.45)))
    pts.append((w, y0 - amp * 0.3))
    return pts


def scene(pal, cls='', seed=1, sun=True):
    """A lake-and-mountains frame, 160 x 90, sliced to fill its box."""
    global uid
    uid += 1
    p, s, g = PALETTES[pal], f's{uid}', f'g{uid}'
    far = ridge(52, 22, 7, seed)
    mid = ridge(58, 30, 6, seed + 3)
    path = lambda pts, base: 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + f' L160 {base} L0 {base} Z'
    snow = ''.join(f'<path d="M{x - 5:.1f} {y + 7:.1f} L{x:.1f} {y:.1f} L{x + 5:.1f} {y + 7:.1f} L{x + 2:.1f} {y + 5:.1f} L{x:.1f} {y + 8:.1f} L{x - 2:.1f} {y + 5:.1f}Z" fill="{p["snow"]}"/>'
                   for x, y in mid[1:-1] if y < 42)
    trees = ''.join(f'<path d="M{x:.1f} {64 - h:.1f} L{x + 2.2:.1f} 64.5 L{x - 2.2:.1f} 64.5Z" fill="{p["trees"]}"/>'
                    for x, h in ((random.uniform(0, 160), random.uniform(4, 9)) for _ in range(26)))
    sun_el = f'<circle cx="{110 + seed * 7 % 30}" cy="{26 + seed * 3 % 10}" r="7" fill="{p["sun"]}" opacity=".9"/>' if sun else ''
    return (f'<svg class="scene {cls}" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">'
            f'<defs><linearGradient id="{s}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{p["sky"][0]}"/><stop offset="1" stop-color="{p["sky"][1]}"/></linearGradient>'
            f'<linearGradient id="{g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{p["lake"][0]}"/><stop offset="1" stop-color="{p["lake"][1]}"/></linearGradient></defs>'
            f'<rect width="160" height="64" fill="url(#{s})"/>{sun_el}'
            f'<path d="{path(far, 64)}" fill="{p["far"]}" opacity=".85"/>'
            f'<path d="{path(mid, 64)}" fill="{p["mid"]}"/>{snow}'
            f'<path d="{path(ridge(66, 8, 9, seed + 9), 66)}" fill="{p["near"]}"/>'
            f'<rect y="64" width="160" height="26" fill="url(#{g})"/>'
            f'<g transform="translate(0 128) scale(1 -1)" opacity=".28"><path d="{path(mid, 64)}" fill="{p["mid"]}"/></g>'
            f'{trees}<path d="M0 64.5 H160" stroke="{p["lake"][0]}" stroke-width=".6" opacity=".7"/></svg>')


def wave(w=600, h=40, seed=1, dense=1.0):
    r = random.Random(seed)
    top, bot = [], []
    n = int(w / 2.2 * dense)
    for i in range(n + 1):
        x = w * i / n
        env = 0.35 + 0.65 * abs(math.sin(i / n * math.pi * (2 + seed % 3))) * (0.6 + 0.4 * r.random())
        a = h / 2 * env * (0.45 + 0.55 * r.random())
        top.append(f'{x:.1f} {h / 2 - a:.1f}')
        bot.append(f'{x:.1f} {h / 2 + a:.1f}')
    return f'<svg class="wave" viewBox="0 0 {w} {h}" preserveAspectRatio="none"><path d="M{" L".join(top)} L{" L".join(reversed(bot))}Z"/></svg>'


ICON = {
    'import': '<path d="M8 2v8M5 7l3 3 3-3M3 12h10"/>',
    'key': '<circle cx="5.5" cy="8" r="2.5"/><path d="M8 8h6M12 8v2.5"/>',
    'check': '<path d="M3 8.5l3 3 7-7"/>',
    'share': '<path d="M8 2v8M5 5l3-3 3 3M4 8v5h8V8"/>',
    'grid': '<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1"/><rect x="9" y="9" width="4.5" height="4.5" rx="1"/>',
    'list': '<path d="M3 4h10M3 8h10M3 12h10"/>',
    'sliders': '<path d="M3 5h10M3 11h10"/><circle cx="6" cy="5" r="1.6"/><circle cx="10" cy="11" r="1.6"/>',
    'mag': '<circle cx="7" cy="7" r="4"/><path d="M10 10l3.5 3.5"/>',
    'play': '<path d="M5 3.5v9l7.5-4.5z" fill="currentColor" stroke="none"/>',
    'back': '<path d="M12 3.5v9L6 8zM5 3.5v9" fill="currentColor"/>',
    'fwd': '<path d="M4 3.5v9L10 8zM11 3.5v9" fill="currentColor"/>',
    'blade': '<path d="M4 13l8-10M9 3h4v4"/>',
    'arrow': '<path d="M5 2.5v10l2.8-2.6L10 14l1.4-.7-2.2-4H13z" fill="currentColor" stroke="none"/>',
    'snap': '<path d="M3 6h10M3 10h10M6 3v10"/>',
    'audio': '<path d="M3 6v4h2.5L9 13V3L5.5 6z"/>',
    'film': '<rect x="2.5" y="3" width="11" height="10" rx="1.5"/><path d="M5 3v10M11 3v10M2.5 6.5H5M2.5 9.5H5M11 6.5h2.5M11 9.5h2.5"/>',
    'star': '<path d="M8 2.5l1.7 3.5 3.8.5-2.8 2.6.7 3.8L8 11.1 4.6 12.9l.7-3.8L2.5 6.5l3.8-.5z"/>',
    'folder': '<path d="M2.5 4.5h4l1.3 1.5h5.7v6.5h-11z"/>',
    'chev': '<path d="M6 4l4 4-4 4"/>',
    'wifi': '<path d="M2 6.5a9 9 0 0 1 12 0M4.2 9a6 6 0 0 1 7.6 0M6.4 11.4a3 3 0 0 1 3.2 0"/><circle cx="8" cy="13.2" r=".9" fill="currentColor"/>',
    'cc': '<rect x="2" y="3.5" width="5" height="4" rx="1.5"/><rect x="9" y="3.5" width="5" height="4" rx="1.5"/><rect x="2" y="9" width="12" height="4" rx="2"/>',
    'search': '<circle cx="7" cy="7" r="4"/><path d="M10 10l3.5 3.5"/>',
}


def icon(name, cls=''):
    return f'<svg class="ic {cls}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">{ICON[name]}</svg>'


CLIPS = [('A001_C001', 'golden', '0:12'), ('A001_C002', 'day', '0:09'), ('A001_C003', 'dusk', '0:16'),
         ('A001_C004', 'forest', '0:07'), ('A002_C001', 'night', '0:21'), ('A002_C002', 'desert', '0:11'),
         ('A002_C003', 'day', '0:05'), ('A002_C004', 'golden', '0:14')]

library = ''.join(f'<div class="clip{" sel" if i == 2 else ""}"><div class="thumb">{scene(p, seed=i + 2, sun=i % 2 == 0)}<span class="dur">{d}</span></div><span class="cname">{n}</span></div>'
                  for i, (n, p, d) in enumerate(CLIPS))

side = ''.join(f'<div class="row{c}">{icon(i)}<span>{t}</span></div>' for i, t, c in [
    ('folder', 'Mountain Film', ' open'), ('star', 'Smart Collections', ' sub'), ('film', 'Footage', ' sub sel'),
    ('audio', 'Audio', ' sub'), ('grid', 'Graphics', ' sub'), ('list', 'Titles', ' sub'), ('folder', 'Archive 2025', ''), ('folder', 'Client review', '')])


def filmstrip(pal, n, seed):
    return '<div class="strip">' + ''.join(f'<div class="frame">{scene(pal, seed=seed + k, sun=k % 2 == 0)}</div>' for k in range(n)) + '</div>'


primary = [('A001_C001', 'golden', 15), ('A001_C003', 'dusk', 12), ('A002_C001', 'night', 17), ('A001_C002', 'day', 13), ('A002_C002', 'desert', 16), ('A001_C004', 'forest', 13)]
storyline = ''.join(f'<div class="vclip" style="flex:{w}"><span class="clabel">{n}</span>{filmstrip(p, max(2, w // 4), i * 5 + 3)}</div>' for i, (n, p, w) in enumerate(primary))
broll = (f'<div class="gap" style="flex:22"></div><div class="vclip conn" style="flex:12"><span class="clabel">A002_C003</span>{filmstrip("day", 3, 41)}</div>'
         f'<div class="gap" style="flex:30"></div><div class="vclip conn" style="flex:11"><span class="clabel">A002_C004</span>{filmstrip("golden", 3, 47)}</div><div class="gap" style="flex:11"></div>')
titles = '<div class="gap" style="flex:3"></div><div class="tclip" style="flex:14">The Mountains</div><div class="gap" style="flex:36"></div><div class="tclip" style="flex:18">A Film by Nature Studios</div><div class="gap" style="flex:15"></div>'
dialog = ''.join(f'<div class="aclip" style="flex:{w}"><span class="clabel">{n}</span>{wave(260, 34, i + 3)}</div>' for i, (n, _, w) in enumerate(primary))
music = f'<div class="mclip" style="flex:1"><span class="clabel">Mountain Theme.aif</span>{wave(1400, 34, 11, 0.6)}</div>'
amb = f'<div class="gap" style="flex:8"></div><div class="mclip amb" style="flex:70"><span class="clabel">Ambience – Lake.wav</span>{wave(1000, 28, 5, 0.8)}</div><div class="gap" style="flex:8"></div>'

ticks = ''.join(f'<span style="left:{i * 100 / 12:.3f}%">00:00:{i * 5:02d}:00</span>' for i in range(12))


def slider(label, value, pos):
    return f'<div class="prop"><span>{label}</span><div class="track"><i style="width:{pos}%"></i><b style="left:{pos}%"></b></div><em>{value}</em></div>'


wheel = lambda name, x, y: f'<div class="wheel"><div class="disc"><b style="left:{x}%;top:{y}%"></b></div><span>{name}</span></div>'

inspector = (
    '<div class="itabs"><span class="on">' + icon('film') + '</span><span>' + icon('sliders') + '</span><span>' + icon('audio') + '</span><span>' + icon('star') + '</span></div>'
    '<div class="ihead"><b>A001_C003</b><span>00:00:16:08</span></div>'
    '<div class="isec"><h4>' + icon('chev', 'open') + 'Compositing</h4>' + '<div class="prop"><span>Blend Mode</span><div class="pop">Normal</div></div>' + slider('Opacity', '100.0 %', 100) + '</div>'
    '<div class="isec"><h4>' + icon('chev', 'open') + 'Color Wheels</h4><div class="wheels">' + wheel('Shadows', 46, 55) + wheel('Midtones', 55, 44) + wheel('Highlights', 52, 40) + '</div></div>'
    '<div class="isec"><h4>' + icon('chev', 'open') + 'Exposure</h4>' + slider('Exposure', '0.0', 50) + slider('Contrast', '1.08', 58) + slider('Highlights', '−0.24', 38) + slider('Shadows', '0.18', 62) + slider('Saturation', '1.12', 61) + '</div>'
    '<div class="isec"><h4>' + icon('chev') + 'Transform</h4></div><div class="isec"><h4>' + icon('chev') + 'Crop</h4></div><div class="isec"><h4>' + icon('chev') + 'Distort</h4></div>'
)

DOCK = [('#2b8cff', '#64c6ff', 'face'), ('#ff5e57', '#ffb199', 'grid'), ('#1f8bff', '#5ae0ff', 'compass'), ('#34c759', '#a6f08f', 'bubble'),
        ('#3a86ff', '#9ec5ff', 'mail'), ('#ff9f0a', '#ffd60a', 'photos'), ('#0a84ff', '#30d158', 'video'), ('#ffffff', '#e8e8ed', 'cal'),
        ('#fefefe', '#d9d9de', 'notes'), ('#fc3c44', '#ff7b8a', 'note'), ('#111114', '#3a3a3f', 'reel'), ('#8e8e93', '#c7c7cc', 'gear'), ('#0a84ff', '#64d2ff', 'store')]


def dock_icon(a, b, kind):
    glyph = {
        'face': '<path d="M14 12v4M26 12v4M13 25c3 3 11 3 14 0M20 8v12h-3" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
        'grid': ''.join(f'<rect x="{9 + (i % 3) * 8}" y="{9 + (i // 3) * 8}" width="5.5" height="5.5" rx="1.6" fill="#fff"/>' for i in range(9)),
        'compass': '<circle cx="20" cy="20" r="11" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M24.5 15.5l-3 7-6 2 3-7z" fill="#fff"/>',
        'bubble': '<path d="M20 10c-6.6 0-11 4-11 8.6 0 2.6 1.5 4.9 3.9 6.4L12 30l5.3-3c.9.2 1.8.3 2.7.3 6.6 0 11-4 11-8.7S26.6 10 20 10z" fill="#fff"/>',
        'mail': '<rect x="9" y="12" width="22" height="16" rx="3" fill="#fff"/><path d="M10 13.5l10 8 10-8" stroke="' + a + '" stroke-width="1.8" fill="none"/>',
        'photos': ''.join(f'<ellipse cx="20" cy="14" rx="3.4" ry="6" fill="{c}" opacity=".9" transform="rotate({k * 45} 20 20)"/>' for k, c in enumerate(['#ff9f0a', '#ffd60a', '#a5e15b', '#30d158', '#64d2ff', '#5e5ce6', '#bf5af2', '#ff375f'])),
        'video': '<rect x="9" y="14" width="15" height="12" rx="3" fill="#fff"/><path d="M25 18l6-3.5v11L25 22z" fill="#fff"/>',
        'cal': '<text x="20" y="15" font-size="6.5" text-anchor="middle" fill="#ff3b30" font-weight="700" font-family="-apple-system,Helvetica">WED</text><text x="20" y="30" font-size="15" text-anchor="middle" fill="#1d1d1f" font-family="-apple-system,Helvetica">1</text>',
        'notes': '<rect x="0" y="0" width="40" height="9" fill="#ffd60a"/><path d="M9 17h22M9 22h22M9 27h16" stroke="#c7c7cc" stroke-width="1.3"/>',
        'note': '<path d="M17 27.5V13l11-2.5v14" stroke="#fff" stroke-width="2.2" fill="none"/><circle cx="14.8" cy="27.6" r="2.8" fill="#fff"/><circle cx="25.8" cy="24.6" r="2.8" fill="#fff"/>',
        'reel': '<rect x="9" y="11" width="22" height="18" rx="3" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M12 25l5-6 4 4 3-3 4 5" stroke="#ffd60a" stroke-width="1.8" fill="none" stroke-linejoin="round"/><rect x="13" y="8" width="3" height="5" rx="1" fill="#ff375f"/><rect x="24" y="8" width="3" height="5" rx="1" fill="#30d158"/>',
        'gear': '<circle cx="20" cy="20" r="9" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="3 2.2"/><circle cx="20" cy="20" r="4" fill="#fff"/>',
        'store': '<path d="M14 27l7-13M26 27l-7-13M12 23h16" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
    }[kind]
    global uid
    uid += 1
    return (f'<svg class="dock-ic" viewBox="0 0 40 40"><defs><linearGradient id="d{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{b}"/><stop offset="1" stop-color="{a}"/></linearGradient>'
            f'<clipPath id="c{uid}"><rect width="40" height="40" rx="9.5"/></clipPath></defs><g clip-path="url(#c{uid})"><rect width="40" height="40" fill="url(#d{uid})"/>{glyph}</g></svg>')


dock = ''.join(f'<span class="di">{dock_icon(*d)}' + ('<i class="dot"></i>' if k in (0, 10) else '') + '</span>' for k, d in enumerate(DOCK))

CSS = r'''
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%}
body{font:12px/1.3 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;color:#e8e8ed;-webkit-font-smoothing:antialiased;
  background:radial-gradient(120% 90% at 18% 10%,#6a4bd8 0%,rgba(106,75,216,0) 55%),radial-gradient(110% 100% at 85% 90%,#e0569a 0%,rgba(224,86,154,0) 60%),linear-gradient(150deg,#2a1d6e,#7a2f8f 55%,#c94e7c);
  display:flex;flex-direction:column;overflow:hidden}
.scene{display:block;width:100%;height:100%}
.ic{width:14px;height:14px;flex:none}
.menubar{flex:none;height:26px;display:flex;align-items:center;gap:20px;padding:0 16px;background:rgba(18,14,40,.38);font-size:13px;color:#fff}
.menubar b{font-weight:700}.menubar .right{margin-left:auto;display:flex;align-items:center;gap:16px}.menubar .ic{width:16px;height:16px}
.logo{width:13px;height:13px;border-radius:50%;background:conic-gradient(#ffd60a,#ff375f,#bf5af2,#0a84ff,#30d158,#ffd60a)}
.window{flex:1;min-height:0;margin:10px 14px 0;border-radius:12px 12px 0 0;background:#1c1c1e;box-shadow:0 0 0 .5px rgba(255,255,255,.14),0 30px 80px rgba(0,0,0,.55);display:flex;flex-direction:column;overflow:hidden}
.titlebar{flex:none;height:44px;display:flex;align-items:center;gap:10px;padding:0 14px;background:#2a2a2d;border-bottom:1px solid #0d0d0f}
.lights{display:flex;gap:8px;margin-right:12px}.lights i{width:12px;height:12px;border-radius:50%;background:#ff5f57}.lights i:nth-child(2){background:#febc2e}.lights i:nth-child(3){background:#28c840}
.tb{display:flex;align-items:center;justify-content:center;height:26px;min-width:30px;padding:0 7px;border-radius:6px;color:#c7c7cc;background:#3a3a3d}
.tb.blue{color:#64d2ff}.tb .ic{width:15px;height:15px}
.title{flex:1;text-align:center;color:#d1d1d6;font-weight:600;font-size:13px}
.seg3{display:flex;gap:2px;padding:2px;border-radius:7px;background:#3a3a3d}.seg3 .tb{background:none}.seg3 .tb.on{background:#5a5a5e;color:#fff}
.top{flex:58;min-height:0;display:flex;border-bottom:1px solid #0d0d0f}
.libs{flex:0 0 13%;background:#202023;border-right:1px solid #0d0d0f;padding:10px 8px;display:flex;flex-direction:column;gap:2px}
.libs .h{font-size:11px;color:#8e8e93;font-weight:600;padding:4px 8px 6px}
.row{display:flex;align-items:center;gap:7px;padding:5px 8px;border-radius:6px;color:#d1d1d6;white-space:nowrap;overflow:hidden}
.row.sub{padding-left:24px}.row.sel{background:#3d3d42;color:#fff}.row .ic{color:#8e8e93}.row.open .ic{color:#bf5af2}
.browser{flex:0 0 22%;display:flex;flex-direction:column;border-right:1px solid #0d0d0f;background:#1c1c1e}
.bhead{flex:none;height:32px;display:flex;align-items:center;gap:8px;padding:0 10px;color:#8e8e93;border-bottom:1px solid #0d0d0f}
.bhead .pill{padding:3px 8px;border-radius:5px;background:#2c2c2e;color:#d1d1d6}.bhead .sp{flex:1}
.grid{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:min-content;gap:12px 10px;padding:12px;overflow:hidden;align-content:start}
.clip{display:flex;flex-direction:column;gap:5px}.thumb{position:relative;aspect-ratio:16/9;border-radius:4px;overflow:hidden;box-shadow:0 0 0 1px #000}
.clip.sel .thumb{box-shadow:0 0 0 2px #ffd60a}.dur{position:absolute;right:4px;bottom:3px;font-size:10px;padding:0 4px;border-radius:3px;background:rgba(0,0,0,.55);color:#fff}
.cname{font-size:11px;color:#aeaeb2}
.viewer{flex:1;min-width:0;display:flex;flex-direction:column;background:#141416}
.vhead{flex:none;height:32px;display:flex;align-items:center;gap:10px;padding:0 12px;color:#8e8e93;border-bottom:1px solid #0d0d0f}
.vhead .c{flex:1;text-align:center;color:#d1d1d6;font-weight:600}
.stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:12px}
.frame16{position:relative;height:100%;aspect-ratio:16/9;max-width:100%;box-shadow:0 0 0 1px #000,0 10px 30px rgba(0,0,0,.6);overflow:hidden}
.frame16 .safe{position:absolute;inset:8% 6%;border:1px dashed rgba(255,255,255,.18)}
.frame16 .ttl{position:absolute;left:7%;bottom:12%;color:#fff;font:700 34px/1.05 -apple-system,Helvetica;letter-spacing:-.5px;text-shadow:0 2px 14px rgba(0,0,0,.35)}
.frame16 .ttl small{display:block;font:500 13px/1.2 -apple-system,BlinkMacSystemFont,Helvetica,sans-serif;letter-spacing:2px;opacity:.85;margin-top:6px}
.transport{flex:none;height:38px;display:flex;align-items:center;justify-content:center;gap:18px;color:#d1d1d6;border-top:1px solid #0d0d0f}
.transport .tc{font:500 15px "SF Mono",Menlo,monospace;color:#fff;letter-spacing:.5px;padding:3px 10px;border-radius:5px;background:#2c2c2e}
.transport .ic{width:14px;height:14px}
.inspector{flex:0 0 19%;background:#202023;display:flex;flex-direction:column;overflow:hidden}
.itabs{flex:none;height:32px;display:flex;align-items:center;justify-content:center;gap:16px;border-bottom:1px solid #0d0d0f;color:#8e8e93}.itabs .on{color:#0a84ff}
.ihead{display:flex;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #0d0d0f}.ihead span{color:#8e8e93;font-family:"SF Mono",Menlo,monospace;font-size:11px}
.isec{padding:8px 12px 10px;border-bottom:1px solid #2a2a2d}
.isec h4{display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:#e5e5ea;margin-bottom:6px}.isec h4 .ic{width:11px;height:11px;color:#8e8e93}.isec h4 .open{transform:rotate(90deg)}
.prop{display:grid;grid-template-columns:34% 1fr 46px;align-items:center;gap:8px;height:22px;color:#aeaeb2;font-size:11px}
.prop em{font-style:normal;text-align:right;color:#e5e5ea;font-family:"SF Mono",Menlo,monospace;font-size:10.5px}
.pop{grid-column:2/4;height:18px;border-radius:4px;background:#3a3a3d;color:#e5e5ea;padding:1px 8px}
.track{position:relative;height:3px;border-radius:2px;background:#3a3a3d}.track i{position:absolute;left:0;top:0;bottom:0;border-radius:2px;background:#0a84ff}
.track b{position:absolute;top:50%;width:11px;height:11px;margin:-5.5px 0 0 -5.5px;border-radius:50%;background:#f2f2f7;box-shadow:0 1px 3px rgba(0,0,0,.5)}
.wheels{display:flex;justify-content:space-between;gap:6px;padding:4px 0}
.wheel{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;color:#aeaeb2;font-size:10.5px}
.disc{position:relative;width:100%;aspect-ratio:1;max-width:68px;border-radius:50%;background:radial-gradient(circle,rgba(40,40,44,.15) 0,rgba(40,40,44,.92) 70%),conic-gradient(#ff453a,#ffd60a,#30d158,#64d2ff,#0a84ff,#bf5af2,#ff453a);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
.disc b{position:absolute;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;border:1.5px solid #fff;box-shadow:0 0 3px #000}
.timeline{flex:42;min-height:0;display:flex;flex-direction:column;background:#19191b}
.tlbar{flex:none;height:32px;display:flex;align-items:center;gap:8px;padding:0 12px;color:#8e8e93;border-bottom:1px solid #0d0d0f}
.tlbar .c{flex:1;text-align:center;color:#d1d1d6;font-weight:600}.tlbar .tb{height:22px;background:#2c2c2e}
.ruler{flex:none;position:relative;height:20px;border-bottom:1px solid #2a2a2d;margin-left:120px;
  background:repeating-linear-gradient(90deg,#4a4a4e 0 1px,transparent 1px calc(100%/60)) bottom/100% 5px no-repeat}
.ruler span{position:absolute;top:3px;padding-left:4px;border-left:1px solid #5a5a5e;font:10px "SF Mono",Menlo,monospace;color:#8e8e93;height:15px}
.lanes{flex:1;min-height:0;position:relative;display:flex;flex-direction:column;gap:5px;padding:8px 0}
.lane{display:flex;align-items:stretch;gap:2px;padding:0 8px 0 0}.lane .lh{flex:0 0 112px;display:flex;align-items:center;gap:6px;padding:0 10px;color:#8e8e93;font-size:10.5px}
.lane .lb{flex:1;display:flex;gap:2px;min-width:0}
.t{height:6.5%}.b{height:14%}.v{height:22%}.a{height:12%}.m{height:11%}
.gap{min-width:0}
.vclip,.aclip,.mclip,.tclip{position:relative;min-width:0;border-radius:4px;overflow:hidden}
.vclip{background:#2b3c66;box-shadow:inset 0 0 0 1px #6e8de0}.vclip.conn{box-shadow:inset 0 0 0 1px #8fb3ff;background:#30447a}
.strip{position:absolute;inset:16px 1px 1px;display:flex;gap:1px}.frame{flex:1;min-width:0;overflow:hidden}
.clabel{position:absolute;left:5px;top:2px;font-size:10px;color:#e5e5ea;white-space:nowrap;z-index:1}
.tclip{background:#7d4ed8;box-shadow:inset 0 0 0 1px #b694ff;color:#fff;font-size:10px;padding:1px 6px;white-space:nowrap}
.aclip{background:#1f5e3a;box-shadow:inset 0 0 0 1px #3fbf74}.mclip{background:#145a5e;box-shadow:inset 0 0 0 1px #36c2c9}.mclip.amb{background:#1b4a63;box-shadow:inset 0 0 0 1px #4aa8e0}
.wave{position:absolute;left:0;right:0;bottom:2px;width:100%;height:calc(100% - 16px)}.aclip .wave path{fill:#4cd98a}.mclip .wave path{fill:#4ad7de}.mclip.amb .wave path{fill:#6cc0f5}
.sel-clip{box-shadow:inset 0 0 0 2px #ffd60a!important}
.playhead{position:absolute;top:-20px;bottom:0;left:calc(120px + (100% - 128px)*.37);width:1.5px;background:#ff453a;z-index:3}
.playhead:before{content:"";position:absolute;top:0;left:-5px;border:6px solid transparent;border-top:8px solid #ff453a}
.dockwrap{flex:none;height:74px;display:flex;align-items:center;justify-content:center;margin-top:-12px;position:relative;z-index:4}
.dock{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:20px;background:rgba(40,34,70,.48);box-shadow:inset 0 0 0 .5px rgba(255,255,255,.3),0 8px 24px rgba(0,0,0,.25);position:relative}
.dock-ic{width:50px;height:50px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
.di{position:relative;display:block;height:50px}.dot{position:absolute;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.85);bottom:-6px;left:23px}
'''

viewer_scene = scene('golden', seed=4)
html = f'''<!doctype html>
<html><head><meta charset="utf-8"><title>Editor screen</title><style>{CSS}</style></head>
<body>
<div class="menubar"><span class="logo"></span><b>Reel</b><span>File</span><span>Edit</span><span>Trim</span><span>Mark</span><span>Clip</span><span>Modify</span><span>View</span><span>Window</span><span>Help</span>
  <div class="right">{icon('wifi')}{icon('cc')}{icon('search')}<span>Wed Apr 1&#160;&#160;9:41 AM</span></div></div>
<div class="window">
  <div class="titlebar"><div class="lights"><i></i><i></i><i></i></div>
    <span class="tb">{icon('import')}</span><span class="tb">{icon('key')}</span><span class="tb blue">{icon('check')}</span>
    <div class="title">Mountain Film</div>
    <div class="seg3"><span class="tb on">{icon('grid')}</span><span class="tb">{icon('film')}</span><span class="tb">{icon('sliders')}</span></div><span class="tb">{icon('share')}</span></div>
  <div class="top">
    <aside class="libs"><div class="h">Libraries</div>{side}</aside>
    <section class="browser"><div class="bhead"><span class="pill">All Clips</span><span class="sp"></span>{icon('grid')}{icon('list')}{icon('mag')}</div><div class="grid">{library}</div></section>
    <section class="viewer"><div class="vhead"><span>4K 23.98p, Stereo</span><span class="c">Mountain Film</span><span>49%</span><span>View</span></div>
      <div class="stage"><div class="frame16">{viewer_scene}<div class="safe"></div><div class="ttl">The Mountains<small>A FILM BY NATURE STUDIOS</small></div></div></div>
      <div class="transport">{icon('back')}{icon('play')}{icon('fwd')}<span class="tc">00:00:28:17</span></div></section>
    <aside class="inspector">{inspector}</aside>
  </div>
  <div class="timeline">
    <div class="tlbar"><span class="tb">Index</span>{icon('arrow')}{icon('blade')}{icon('snap')}<span class="c">Mountain Film&#160;&#160;·&#160;&#160;01:02:14</span>{icon('audio')}{icon('film')}{icon('sliders')}</div>
    <div class="ruler">{ticks}</div>
    <div class="lanes">
      <div class="lane t"><div class="lh">Titles</div><div class="lb">{titles}</div></div>
      <div class="lane b"><div class="lh">B-roll</div><div class="lb">{broll}</div></div>
      <div class="lane v"><div class="lh">{icon('film')} Primary</div><div class="lb">{storyline}</div></div>
      <div class="lane a"><div class="lh">{icon('audio')} Dialogue</div><div class="lb">{dialog}</div></div>
      <div class="lane m"><div class="lh">Music</div><div class="lb">{music}</div></div>
      <div class="lane m"><div class="lh">Ambience</div><div class="lb">{amb}</div></div>
      <div class="playhead"></div>
    </div>
  </div>
</div>
<div class="dockwrap"><div class="dock">{dock}</div></div>
</body></html>
'''
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(html)
print(OUT, len(html))
