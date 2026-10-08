#!/usr/bin/env python3
"""
GitHub profil panosu (dashboard) SVG üreticisi.
GitHub Actions içinde her gün çalışır, verileri GitHub API'den çeker ve
dist/dashboard.svg dosyasını üretir.
 
Yerelde deneme:  python generate.py --mock
"""
import base64, datetime as dt, html, json, math, os, sys, urllib.request
 
# ------------------------------------------------------------------ AYARLAR
USERNAME     = os.environ.get("GH_USER", "ShortsAlpha")
DISPLAY_NAME = "Yadaumur"
HUB_TITLE    = f"{DISPLAY_NAME}'un Hub'ına Hoş Geldin"
HUB_SUB      = "Projelerimi ve açık kaynak katkılarımı keşfet"
TAGS         = ["Web Geliştirici", "Python", "iOS"]
CORE_TECH    = ["Python", "Swift", "SwiftUI", "JavaScript", "TypeScript",
                "React", "HTML", "CSS", "FastAPI"]
OUT          = "dist/dashboard.svg"
 
# ------------------------------------------------------------------ RENKLER
BG, CARD, BORDER = "#0a0a0a", "#111111", "#262626"
TXT, MUTED, DIM  = "#f5f5f5", "#a3a3a3", "#737373"
ACCENT           = "#4ade80"
LEVELS = ["#1a1f1b", "#0e4429", "#006d32", "#26a641", "#39d353"]
LANG_COLORS = {
    "Python": "#3572A5", "Swift": "#F05138", "SwiftUI": "#0A84FF",
    "JavaScript": "#f1e05a", "TypeScript": "#3178c6", "React": "#61dafb",
    "HTML": "#e34c26", "CSS": "#663399", "FastAPI": "#05998b",
    "Shell": "#89e051", "Jupyter Notebook": "#DA5B0B", "Objective-C": "#438eff",
    "Vue": "#41b883", "Dockerfile": "#384d54", "SCSS": "#c6538c",
}
FONT = "'Inter','Segoe UI',-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif"
MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]
MONTHS_TR_LONG = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz",
                  "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
 
# Lucide ikonları (ISC lisansı), 24x24 stroke yolları
ICON = {
    "folder": '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    "star": '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    "activity": '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    "chart": '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/>',
    "code": '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    "bookmark": '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    "pin": '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    "building": '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    "calendar": '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
}
GH_MARK = ("M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37"
           "-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96"
           ".1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 "
           ".97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 "
           "1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 "
           "5.73 18.27.5 12 .5Z")
 
 
def esc(s):
    return html.escape(str(s), quote=True)
 
 
def icon(name, x, y, size=22, color=MUTED):
    s = size / 24
    return (f'<g transform="translate({x},{y}) scale({s})" fill="none" stroke="{color}" '
            f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{ICON[name]}</g>')
 
 
def text_w(s, size):
    """Kabaca metin genişliği tahmini."""
    return sum(0.62 if c.isupper() else 0.53 for c in s) * size
 
 
def short(n):
    if n >= 1_000_000: return f"{n/1_000_000:.1f}M".replace(".0M", "M")
    if n >= 1_000:     return f"{n/1_000:.1f}k".replace(".0k", "k")
    return str(n)
 
 
# ------------------------------------------------------------------ VERİ
QUERY = """
query($login:String!){
  user(login:$login){
    name login avatarUrl(size:280) createdAt location company
    followers{totalCount} following{totalCount}
    repositories(ownerAffiliations:OWNER, isFork:false, first:100,
                 orderBy:{field:STARGAZERS, direction:DESC}){
      totalCount
      nodes{ name description stargazerCount isPrivate
             primaryLanguage{name color}
             languages(first:10, orderBy:{field:SIZE, direction:DESC}){ edges{ size node{name color} } } }
    }
    contributionsCollection{ contributionCalendar{ totalContributions
      weeks{ contributionDays{ date contributionCount contributionLevel } } } }
  }
}"""
LEVEL_MAP = {"NONE": 0, "FIRST_QUARTILE": 1, "SECOND_QUARTILE": 2, "THIRD_QUARTILE": 3, "FOURTH_QUARTILE": 4}
 
 
def fetch():
    token = os.environ["GH_TOKEN"]
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=json.dumps({"query": QUERY, "variables": {"login": USERNAME}}).encode(),
        headers={"Authorization": f"bearer {token}", "Content-Type": "application/json"})
    res = json.load(urllib.request.urlopen(req))
    if "errors" in res:
        sys.exit(f"API hatası: {res['errors']}")
    u = res["data"]["user"]
    repos = u["repositories"]["nodes"]
    public = [r for r in repos if not r["isPrivate"]]
    langs = {}
    for r in repos:
        for e in r["languages"]["edges"]:
            n = e["node"]["name"]
            langs.setdefault(n, [e["node"]["color"] or DIM, 0])[1] += e["size"]
    cal = u["contributionsCollection"]["contributionCalendar"]
    av = urllib.request.urlopen(u["avatarUrl"])
    mime = av.headers.get_content_type() or "image/png"
    avatar = av.read()
    return {
        "login": u["login"], "location": u["location"], "company": u["company"],
        "created": u["createdAt"], "followers": u["followers"]["totalCount"],
        "following": u["following"]["totalCount"], "repos": u["repositories"]["totalCount"],
        "stars": sum(r["stargazerCount"] for r in repos),
        "avatar": f"data:{mime};base64," + base64.b64encode(avatar).decode(),
        "total": cal["totalContributions"],
        "weeks": [[(d["date"], d["contributionCount"], LEVEL_MAP.get(d["contributionLevel"], 0))
                   for d in w["contributionDays"]] for w in cal["weeks"]],
        "langs": sorted(((n, c, b) for n, (c, b) in langs.items()), key=lambda x: -x[2]),
        "top": [{"name": r["name"], "desc": r["description"] or "",
                 "lang": (r["primaryLanguage"] or {}).get("name"),
                 "color": (r["primaryLanguage"] or {}).get("color") or DIM,
                 "stars": r["stargazerCount"]} for r in public[:4]],
    }
 
 
def mock():
    import random
    random.seed(4)
    end = dt.date(2026, 10, 8)
    start = end - dt.timedelta(days=364 + (end.weekday() + 1) % 7)
    weeks, cur = [], start
    while cur <= end:
        w = []
        for _ in range(7):
            if cur > end: break
            c = random.choice([0, 0, 0, 1, 2, 3, 5, 8, 12]) if random.random() > .3 else 0
            w.append((cur.isoformat(), c, 0 if c == 0 else 1 if c < 3 else 2 if c < 6 else 3 if c < 10 else 4))
            cur += dt.timedelta(days=1)
        weeks.append(w)
    return {"login": USERNAME, "location": "İstanbul, Türkiye", "company": None,
            "created": "2025-02-14T10:00:00Z", "followers": 12, "following": 9, "repos": 22, "stars": 31,
            "avatar": None, "total": sum(d[1] for w in weeks for d in w), "weeks": weeks,
            "langs": [("Python", "#3572A5", 820000), ("CSS", "#663399", 240000),
                      ("HTML", "#e34c26", 190000), ("JavaScript", "#f1e05a", 150000),
                      ("Swift", "#F05138", 90000), ("Shell", "#89e051", 9000)],
            "top": [{"name": "magalar.com-real", "desc": "Mağaralar için modern web sitesi", "lang": "CSS", "color": "#663399", "stars": 9},
                    {"name": "image-voiceover-to-video-pipeline", "desc": "Görsel + seslendirmeden otomatik video üreten Python hattı", "lang": "Python", "color": "#3572A5", "stars": 7},
                    {"name": "MaritimeDocs", "desc": "Denizcilik belgeleri yönetim uygulaması", "lang": "Python", "color": "#3572A5", "stars": 5},
                    {"name": "Yadaumur", "desc": "Profil README'si ve otomatik pano", "lang": "Python", "color": "#3572A5", "stars": 2}]}
 
 
# ------------------------------------------------------------------ ÇİZİM
def card(x, y, w, h, extra=""):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{CARD}" stroke="{BORDER}" {extra}/>'
 
 
def render(d):
    W, H = 1200, 1250
    L, LW = 30, 330           # sol sütun
    R, RW = 395, 775          # sağ sütun
    o = []
    a = o.append
 
    # --- Sol sütun ---------------------------------------------------
    cx, cy, r = L + LW / 2, 180, 145
    a(f'<g class="fade" style="animation-delay:0ms">')
    a(f'<circle cx="{cx}" cy="{cy}" r="{r+6}" fill="none" stroke="{BORDER}" stroke-width="6"/>')
    a(f'<circle class="ring" cx="{cx}" cy="{cy}" r="{r+6}" fill="none" stroke="{ACCENT}" stroke-width="2" '
      f'stroke-dasharray="{2*math.pi*(r+6):.1f}" transform="rotate(-90 {cx} {cy})"/>')
    if d["avatar"]:
        a(f'<clipPath id="av"><circle cx="{cx}" cy="{cy}" r="{r}"/></clipPath>')
        a(f'<image href="{d["avatar"]}" x="{cx-r}" y="{cy-r}" width="{2*r}" height="{2*r}" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>')
    else:
        a(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#1c1c1c"/>')
    a('</g>')
 
    y = 380
    a(f'<g class="fade" style="animation-delay:150ms">')
    a(f'<text x="{L}" y="{y}" font-size="38" font-weight="700" fill="{TXT}">{esc(DISPLAY_NAME)}</text>')
    a(f'<text x="{L}" y="{y+40}" font-size="24" fill="{DIM}">@{esc(d["login"])}</text>')
    by = y + 72
    a(f'<rect x="{L}" y="{by}" width="{LW}" height="54" rx="10" fill="#171717" stroke="{BORDER}"/>')
    label = "GitHub'da Takip Et"
    tw = text_w(label, 19) + 32
    sx = L + (LW - tw) / 2
    a(f'<g transform="translate({sx},{by+15}) scale(1)"><path d="{GH_MARK}" fill="{TXT}"/></g>')
    a(f'<text x="{sx+34}" y="{by+34}" font-size="19" font-weight="500" fill="{TXT}">{label}</text>')
    a('</g>')
 
    # etiketler
    tags = TAGS + (["Çok Aktif"] if d["total"] >= 300 else [])
    tx, ty = L, by + 90
    a(f'<g class="fade" style="animation-delay:300ms">')
    for t in tags:
        w = text_w(t, 17) + 30
        if tx + w > L + LW:
            tx, ty = L, ty + 46
        a(f'<rect x="{tx}" y="{ty}" width="{w}" height="36" rx="18" fill="none" stroke="{BORDER}"/>')
        a(f'<text x="{tx+w/2}" y="{ty+24}" font-size="17" fill="#d4d4d4" text-anchor="middle">{esc(t)}</text>')
        tx += w + 10
    a('</g>')
 
    # bilgi satırları
    iy = ty + 80
    created = dt.datetime.fromisoformat(d["created"].replace("Z", "+00:00"))
    rows = []
    if d.get("company"):  rows.append(("building", d["company"]))
    if d.get("location"): rows.append(("pin", d["location"]))
    rows.append(("calendar", f"{MONTHS_TR_LONG[created.month-1]} {created.year} tarihinde katıldı"))
    a(f'<g class="fade" style="animation-delay:450ms">')
    for ic, t in rows:
        a(icon(ic, L, iy - 17, 22, MUTED))
        a(f'<text x="{L+36}" y="{iy}" font-size="19" fill="#d4d4d4">{esc(t)}</text>')
        iy += 44
    iy += 14
    a(icon("users", L, iy - 17, 22, TXT))
    a(f'<text x="{L+36}" y="{iy}" font-size="19" fill="{TXT}"><tspan font-weight="700">{d["followers"]}</tspan> takipçi'
      f'<tspan fill="{DIM}">  ·  </tspan><tspan font-weight="700">{d["following"]}</tspan> takip</text>')
    a('</g>')
 
    # --- Sağ sütun ---------------------------------------------------
    # Karşılama kartı
    y = 30
    a(f'<g class="fade" style="animation-delay:100ms">')
    a(card(R, y, RW, 130))
    a(f'<text x="{R+34}" y="{y+58}" font-size="30" font-weight="700" fill="{TXT}">{esc(HUB_TITLE)}</text>')
    a(f'<text x="{R+34}" y="{y+94}" font-size="19" fill="{MUTED}">{esc(HUB_SUB)}</text>')
    upd = dt.date.today().strftime("%d.%m.%Y")
    dx = R + RW - 34 - text_w(f"Güncel · {upd}", 15) - 16
    a(f'<circle class="pulse" cx="{dx}" cy="{y+65}" r="5" fill="{ACCENT}"/>')
    a(f'<circle cx="{dx}" cy="{y+65}" r="5" fill="{ACCENT}"/>')
    a(f'<text x="{R+RW-34}" y="{y+70}" font-size="15" fill="{DIM}" text-anchor="end">Güncel · <tspan fill="{ACCENT}">{upd}</tspan></text>')
    a('</g>')
 
    # İstatistik kutuları
    y = 185
    stats = [("folder", short(d["repos"]), "TOPLAM REPO"),
             ("star", short(d["stars"]), "TOPLAM YILDIZ"),
             ("users", short(d["followers"]), "TAKİPÇİ"),
             ("activity", short(d["total"]), "YILLIK KATKI")]
    gap = 18
    sw = (RW - gap * 3) / 4
    for i, (ic, num, lab) in enumerate(stats):
        x = R + i * (sw + gap)
        a(f'<g class="rise" style="animation-delay:{200+i*90}ms">')
        a(card(x, y, sw, 150))
        a(icon(ic, x + sw / 2 - 13, y + 24, 26, MUTED))
        a(f'<text x="{x+sw/2}" y="{y+100}" font-size="44" font-weight="700" fill="{TXT}" text-anchor="middle">{num}</text>')
        a(f'<text x="{x+sw/2}" y="{y+130}" font-size="14" letter-spacing="1.6" fill="{MUTED}" text-anchor="middle">{lab}</text>')
        a('</g>')
 
    # Teknolojiler & Diller
    y = 385
    a(f'<g class="fade" style="animation-delay:900ms">')
    a(icon("code", R, y - 4, 26, MUTED))
    a(f'<text x="{R+38}" y="{y+18}" font-size="26" font-weight="700" fill="{TXT}">Teknolojiler &amp; Diller</text>')
    a('</g>')
    cy0 = y + 45
    ch = 250
    hw = (RW - 18) / 2
    # sol: temel teknolojiler
    a(f'<g class="fade" style="animation-delay:950ms">')
    a(card(R, cy0, hw, ch))
    a(f'<text x="{R+26}" y="{cy0+42}" font-size="15" letter-spacing="1.6" fill="{MUTED}">TEMEL TEKNOLOJİLER</text>')
    a('</g>')
    px, py = R + 26, cy0 + 66
    for i, t in enumerate(CORE_TECH):
        col = LANG_COLORS.get(t, MUTED)
        w = text_w(t, 16) + 44
        if px + w > R + hw - 20:
            px, py = R + 26, py + 50
        a(f'<g class="pop" style="animation-delay:{1000+i*70}ms">')
        a(f'<rect x="{px}" y="{py}" width="{w}" height="38" rx="19" fill="{col}" fill-opacity=".12" stroke="{col}" stroke-opacity=".45"/>')
        a(f'<circle cx="{px+18}" cy="{py+19}" r="5" fill="{col}"/>')
        a(f'<text x="{px+30}" y="{py+25}" font-size="16" fill="{TXT}">{esc(t)}</text>')
        a('</g>')
        px += w + 10
 
    # sağ: dil halkası
    rx0 = R + hw + 18
    a(f'<g class="fade" style="animation-delay:1000ms">{card(rx0, cy0, hw, ch)}</g>')
    langs = d["langs"][:5]
    total_b = sum(b for _, _, b in d["langs"]) or 1
    dcx, dcy, dr = rx0 + 95, cy0 + 110, 62
    circ = 2 * math.pi * dr
    a(f'<circle cx="{dcx}" cy="{dcy}" r="{dr}" fill="none" stroke="#1c1c1c" stroke-width="22"/>')
    acc = 0
    for i, (n, c, b) in enumerate(langs):
        frac = b / total_b
        seg = frac * circ
        a(f'<circle class="seg" cx="{dcx}" cy="{dcy}" r="{dr}" fill="none" stroke="{c}" stroke-width="22" '
          f'stroke-dasharray="{seg:.2f} {circ:.2f}" stroke-dashoffset="{-acc:.2f}" '
          f'transform="rotate(-90 {dcx} {dcy})" style="--len:{seg:.2f};animation-delay:{1100+i*180}ms"/>')
        acc += seg
    a(f'<text x="{dcx}" y="{dcy+6}" font-size="17" fill="{MUTED}" text-anchor="middle">{len(d["langs"])} dil</text>')
    lx0 = rx0 + 190
    for i, (n, c, b) in enumerate(langs):
        ly = cy0 + 46 + i * 36
        pct = round(b / total_b * 100)
        a(f'<g class="fade" style="animation-delay:{1150+i*120}ms">')
        a(f'<circle cx="{lx0}" cy="{ly-6}" r="7" fill="{c}"/>')
        a(f'<text x="{lx0+18}" y="{ly}" font-size="17" fill="{TXT}">{esc(n)}</text>')
        a(f'<text x="{rx0+hw-24}" y="{ly}" font-size="17" fill="{MUTED}" text-anchor="end">%{pct}</text>')
        a('</g>')
    mb = total_b / 1024 / 1024
    a(f'<text x="{rx0+26}" y="{cy0+ch-24}" font-size="14" fill="{DIM}">{mb:.1f} MB kod üzerinden</text>')
 
    left_end = iy + 20
    tech_end = cy0 + ch
    # Katkılar
    y = max(left_end, tech_end) + 50
    CX, CW = L, R + RW - L
    a(f'<g class="fade" style="animation-delay:400ms">')
    a(icon("chart", CX, y - 4, 26, MUTED))
    a(f'<text x="{CX+38}" y="{y+18}" font-size="26" font-weight="700" fill="{TXT}">Katkılar</text>')
    a(f'<text x="{CX+CW}" y="{y+18}" font-size="19" fill="{MUTED}" text-anchor="end"><tspan font-weight="700" fill="{TXT}">{short(d["total"])}</tspan>  son bir yılda</text>')
    a('</g>')
    gy = y + 45
    gh = 250
    a(f'<g class="fade" style="animation-delay:450ms">{card(CX, gy, CW, gh)}</g>')
    weeks = d["weeks"][-53:]
    left = CX + 62
    step = (CW - 62 - 26) / len(weeks)
    cs = step - 4
    top = gy + 50
    # ay etiketleri
    last_m = None
    for wi, w in enumerate(weeks):
        m = int(w[0][0][5:7])
        if m != last_m and (wi < len(weeks) - 2):
            if last_m is not None or int(w[0][0][8:10]) <= 7:
                a(f'<text x="{left+wi*step}" y="{gy+34}" font-size="14" fill="{DIM}">{MONTHS_TR[m-1]}</text>')
            last_m = m
    for row, lab in ((1, "Pzt"), (3, "Çar"), (5, "Cum")):
        a(f'<text x="{CX+22}" y="{top+row*step+cs-3}" font-size="13" fill="{DIM}">{lab}</text>')
    for wi, w in enumerate(weeks):
        for day in w:
            date, cnt, lvl = day
            wd = (dt.date.fromisoformat(date).weekday() + 1) % 7   # Pazar=0
            x, yy = left + wi * step, top + wd * step
            cls = "cell hot" if lvl == 4 else "cell"
            delay = wi * 20 + wd * 12
            a(f'<rect class="{cls}" x="{x:.1f}" y="{yy:.1f}" width="{cs:.1f}" height="{cs:.1f}" rx="4" '
              f'fill="{LEVELS[lvl]}" style="animation-delay:{1200+delay}ms"><title>{date}: {cnt} katkı</title></rect>')
    ly = top + 7 * step + 26
    a(f'<text x="{CX+24}" y="{ly}" font-size="15" fill="{DIM}">Son 52 haftanın aktivitesi</text>')
    lx = CX + CW - 24 - 5 * 16 - 40
    a(f'<text x="{lx-10}" y="{ly}" font-size="13" fill="{DIM}" text-anchor="end">Az</text>')
    for i, c in enumerate(LEVELS):
        a(f'<rect x="{lx+i*16}" y="{ly-11}" width="12" height="12" rx="3" fill="{c}"/>')
    a(f'<text x="{lx+5*16+4}" y="{ly}" font-size="13" fill="{DIM}">Çok</text>')
 
    # Öne çıkan projeler
    y = gy + gh + 50
    a(f'<g class="fade" style="animation-delay:2100ms">')
    a(icon("bookmark", L, y - 4, 26, MUTED))
    a(f'<text x="{L+38}" y="{y+18}" font-size="26" font-weight="700" fill="{TXT}">Öne Çıkan Projeler</text>')
    a('</g>')
    py0 = y + 45
    ph = 120
    pw = (CW - 18) / 2
    for i, p in enumerate(d["top"][:4]):
        x = L + (i % 2) * (pw + 18)
        yy = py0 + (i // 2) * (ph + 18)
        name = p["name"] if len(p["name"]) <= 48 else p["name"][:47] + "…"
        desc = p["desc"] if len(p["desc"]) <= 66 else p["desc"][:65] + "…"
        a(f'<g class="rise" style="animation-delay:{2200+i*120}ms">')
        a(card(x, yy, pw, ph))
        a(icon("bookmark", x + 22, yy + 22, 18, MUTED))
        a(f'<text x="{x+50}" y="{yy+38}" font-size="18" font-weight="600" fill="{TXT}">{esc(name)}</text>')
        a(f'<text x="{x+22}" y="{yy+70}" font-size="15" fill="{MUTED}">{esc(desc)}</text>')
        if p["lang"]:
            a(f'<circle cx="{x+28}" cy="{yy+96}" r="6" fill="{p["color"]}"/>')
            a(f'<text x="{x+42}" y="{yy+101}" font-size="14" fill="{MUTED}">{esc(p["lang"])}</text>')
        a(icon("star", x + pw - 70, yy + 87, 16, MUTED))
        a(f'<text x="{x+pw-48}" y="{yy+101}" font-size="14" fill="{MUTED}">{p["stars"]}</text>')
        a('</g>')
    rows = (min(len(d["top"]), 4) + 1) // 2
    H = int(py0 + rows * (ph + 18) + 20) if rows else int(py0)
 
    style = f"""
    text{{font-family:{FONT}}}
    .fade{{opacity:0;animation:fade .7s ease-out forwards}}
    .rise{{opacity:0;animation:rise .7s cubic-bezier(.2,.7,.2,1) forwards}}
    .pop{{opacity:0;transform-box:fill-box;transform-origin:center;animation:pop .45s cubic-bezier(.3,1.6,.5,1) forwards}}
    .cell{{opacity:0;transform-box:fill-box;transform-origin:center;animation:cell .5s ease-out forwards}}
    .hot{{animation:cell .5s ease-out forwards, glow 3s ease-in-out 3s infinite}}
    .ring{{stroke-dashoffset:{2*math.pi*151:.1f};animation:ring 1.6s ease-out .2s forwards}}
    .seg{{animation:seg 1s ease-out both}}
    .pulse{{transform-box:fill-box;transform-origin:center;animation:pulse 2s ease-out infinite}}
    @keyframes fade{{to{{opacity:1}}}}
    @keyframes rise{{from{{opacity:0;transform:translateY(14px)}}to{{opacity:1;transform:none}}}}
    @keyframes pop{{from{{opacity:0;transform:scale(.6)}}to{{opacity:1;transform:none}}}}
    @keyframes cell{{from{{opacity:0;transform:scale(.2)}}to{{opacity:1;transform:none}}}}
    @keyframes glow{{0%,100%{{fill:{LEVELS[4]}}}50%{{fill:#a7f3b5}}}}
    @keyframes ring{{to{{stroke-dashoffset:0}}}}
    @keyframes seg{{from{{stroke-dasharray:0 9999}}}}
    @keyframes pulse{{from{{opacity:.8;transform:scale(1)}}to{{opacity:0;transform:scale(3.2)}}}}
    """
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
            f'<style>{style}</style>'
            f'<rect width="{W}" height="{H}" rx="18" fill="{BG}"/>'
            + "".join(o) + '</svg>')
 
 
if __name__ == "__main__":
    data = mock() if "--mock" in sys.argv else fetch()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(render(data))
    print("yazıldı:", OUT)
 
