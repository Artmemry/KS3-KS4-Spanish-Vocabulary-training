#!/usr/bin/env python3
"""Build the KS3–KS4 Spanish corpus from the five year-group workbooks.

Output: KS3-KS4-Spanish-Vocabulary-training/data/corpus.js, in El Léxico's format, plus a
report of anything that could not be placed. Entry ids are stable — they are
derived from year, unit and lesson position, so re-running after an edit keeps
a student's progress attached to the same words.
"""
import json, os, re, sys, unicodedata
from collections import OrderedDict
import openpyxl

SRC = "/mnt/user-data/uploads/Vocab lists KS3 & KS4"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "KS3-KS4-Spanish-Vocabulary-training")

YEARS = OrderedDict([
    ("Y7",  dict(file="Y7_SP_Vocabulary_by_Lesson_v2.xlsx",  name="Year 7")),
    ("Y8",  dict(file="Y8_SP_Vocabulary_by_Lesson_v2.xlsx",  name="Year 8")),
    ("Y9",  dict(file="Y9_SP_Vocabulary_by_lesson_v2.xlsx",  name="Year 9")),
    ("Y10", dict(file="Y10_SP_Vocabulary_by_Lesson_v2.xlsx", name="Year 10")),
    ("Y11", dict(file="Y11_SP_Vocabulary_by_Lesson_v2.xlsx", name="Year 11")),
])

# Unit names from the KS3/KS4 curriculum progression sheet, so a student reads
# the unit the way the scheme of work names it.
UNIT_NAMES = {
    "Y7": {"1": "Mi familia — my family", "2": "Mi casa y mi ciudad — my home and town",
           "3": "Mi instituto — my school"},
    "Y8": {"4": "Mi modelo y mis pasatiempos — role models and free time",
           "5": "Las vacaciones — holidays", "6": "La comida y la salud — food and health",
           "Otras": "Otras listas — further lists"},
    "Y9": {"7": "El estilo de vida — lifestyles", "8": "Los problemas — problems and the environment",
           "9": "La tecnología — technology"},
    "Y10": {"1": "Los medios y la tecnología — media and technology",
            "2": "Mi mundo — my world", "3": "La vida sana — healthy living",
            "4": "El instituto y el futuro — school and the future"},
    "Y11": {"5": "Los viajes y el turismo — travel and tourism",
            "6": "Mi barrio y el medio ambiente — my area and the environment"},
}

def word_id(word, width=4):
    """A short, stable id for a word: the lesson id plus this. Derived from the
    Spanish headword, so reordering a list never moves anyone's progress."""
    h = 0x811c9dc5
    for ch in unicodedata.normalize("NFD", word.strip().lower()):
        h ^= ord(ch) & 0xFF
        h = (h * 0x01000193) & 0xFFFFFFFF
    return format(h, "08x")[:width]

def norm(s):
    return re.sub(r"\s+", " ", str(s or "").replace("\xa0", " ")).strip()

def split_variants(cell):
    """The workbooks already separate interchangeable forms with a semicolon."""
    parts = [norm(p) for p in re.split(r"[;；]", str(cell or ""))]
    out = []
    for p in parts:
        if p and p not in out:
            out.append(p)
    return out

# ---------------------------------------------------------------- lesson keys
LESSON_NOISE = re.compile(
    r"^(?:SP\s+)?Y?\d{0,2}\s*(?:SP\s+)?(?:KS4\s+CF\s+)?", re.I)

def parse_lesson(raw, year):
    """Return (unit_key, lesson_number, clean_title) from a lesson label.

    Labels look like:
      'Unit 1 Lesson 1 – The school year - what is your name / greetings'
      'SP Y8 Unit 4 Lesson 3 - ir and opionions'
      'Y10 SP Unit 1.1  Theme 4 (Media and technology), Sub-topic 1 (TV and film): L2: What shows…'
      'Y11 SP U6.1 Places in Town (Higher) — lugares y sitios en mi ciudad'
      'SP Y9 Unit 7 Lesson 1 - family relationship recap'
    """
    t = norm(raw)
    if not t or t.lower().startswith("unassigned"):
        return None, None, None

    # unit number: 'Unit 4', 'U6.1', 'Unit 1.3'
    m = re.search(r"\b(?:Unit|U)\s*(\d+)(?:\.(\d+))?", t, re.I)
    unit = m.group(1) if m else None
    sub = m.group(2) if (m and m.group(2)) else None

    # lesson number: 'Lesson 3', 'L2', 'L3.1'
    ml = re.search(r"\b(?:Lesson|L)\s*(\d+)", t, re.I)
    lesson_no = int(ml.group(1)) if ml else None

    # Title: strip the scaffolding the label repeats — year, 'SP', the unit and
    # the lesson number — and do it repeatedly, because several workbooks nest it
    # ('Lesson 1: SP Y9 Unit 7 Lesson 1 - family relationship recap').
    title = t
    for _ in range(4):
        before = title
        title = re.sub(r"^(?:Lesson|L)\s*\d+(?:\.\d+)?\s*[:.\-–—]?\s*", "", title, flags=re.I)
        title = re.sub(r"^(?:SP\s+)?Y\d{1,2}\s+(?:SP\s+)?", "", title, flags=re.I)
        title = re.sub(r"^(?:SP\s+)?(?:KS4\s+CF\s+)?", "", title, flags=re.I)
        title = re.sub(r"^(?:Unit|U)\s*\d+(?:\.\d+)?\s*[:.\-–—]?\s*", "", title, flags=re.I)
        # a theme/sub-topic preamble is reference, not a title: keep what follows
        title = re.sub(r"^Theme\s*\d+\s*\([^)]*\)\s*,?\s*(?:Sub-?topic\s*\d+\s*\([^)]*\))?\s*[:.\-–—]?\s*",
                       "", title, flags=re.I)
        title = re.sub(r"^[:\-–—\s]+", "", title)
        if title == before:
            break
    # a trailing 'Lesson 3:' left inside a topic prefix ('Transport Lesson 3: ...')
    title = re.sub(r"\s*\bLesson\s*\d+\s*[:.\-–—]\s*", " — ", title, flags=re.I)
    title = re.sub(r"\s{2,}", " ", title).strip(" -–—:/|")
    if not title:
        title = t
    return unit, lesson_no, (sub, title)

# ---------------------------------------------------------------- readers
def read_full_list(path, year):
    """Y7, Y8, Y10, Y11: a 'Full List' sheet, one row per word."""
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    ws = wb["Full List"]
    rows = list(ws.iter_rows(values_only=True))
    hdr = [norm(v).lower() for v in rows[0]]
    ci = {k: hdr.index(k) for k in ("spanish", "english", "unit", "lesson") if k in hdr}
    out = []
    for r in rows[1:]:
        if not r or not r[ci["spanish"]] or not r[ci["english"]]:
            continue
        out.append(dict(es=norm(r[ci["spanish"]]), en=norm(r[ci["english"]]),
                        unit_raw=norm(r[ci["unit"]]) if "unit" in ci else "",
                        lesson_raw=norm(r[ci["lesson"]]) if "lesson" in ci else ""))
    wb.close()
    return out

def read_ep_blocks(path, year):
    """Y9: 'EP style' sheets — a lesson header, then Spanish/English pairs."""
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    out = []
    for name in wb.sheetnames:
        if "languagenut" not in name.lower() and "ep style" not in name.lower():
            continue
        if "languagenut" in name.lower():
            continue                      # the flat export duplicates the EP sheet
        ws = wb[name]
        mu = re.search(r"UNIT\s*(\d+)", name, re.I)
        sheet_unit = mu.group(1) if mu else None
        current = None
        for r in ws.iter_rows(values_only=True):
            a = norm(r[0]) if r and len(r) > 0 else ""
            b = norm(r[1]) if r and len(r) > 1 else ""
            if not a:
                continue
            if re.match(r"^Lesson\s*\d+\s*:", a, re.I) or re.search(r"\bUnit\s*\d+\s*Lesson\s*\d+", a, re.I):
                current = a
                continue
            if a.lower() == "spanish" or not b:
                continue
            if current is None:
                continue
            out.append(dict(es=a, en=b, unit_raw="Unit " + (sheet_unit or ""),
                            lesson_raw=current))
    wb.close()
    return out

# ---------------------------------------------------------------- build
def main():
    corpus, report, seen_pairs = [], [], set()
    unplaced = {}
    lesson_index = OrderedDict()     # (year, unit) -> OrderedDict(lesson_key -> title)
    dropped = {"no lesson": 0, "duplicate": 0, "empty": 0}

    for year, meta in YEARS.items():
        path = os.path.join(SRC, meta["file"])
        rows = read_ep_blocks(path, year) if year == "Y9" else read_full_list(path, year)

        # first pass: group rows by (unit, lesson label) preserving first-seen order
        groups = OrderedDict()
        for row in rows:
            unit, lesson_no, parsed = parse_lesson(row["lesson_raw"], year)
            if parsed is None:
                # The workbook says these words belong to the year but not yet to a
                # lesson. Dropping them would lose real vocabulary, so they go into a
                # clearly-labelled extra unit, in lists of 30 rather than one long one.
                unplaced.setdefault(year, []).append(row)
                report.append(f"{year}: not yet placed — '{row['es'][:40]}' "
                              f"(lesson cell: {row['lesson_raw'][:60] or 'blank'})")
                continue
            sub, title = parsed
            if unit is None:
                mu = re.search(r"(\d+)", row["unit_raw"] or "")
                unit = mu.group(1) if mu else "0"
            key = (unit, row["lesson_raw"])
            groups.setdefault(key, dict(unit=unit, lesson_no=lesson_no, sub=sub,
                                        title=title, rows=[]))["rows"].append(row)

        # order: by unit, then by the lesson number where we have one, then first appearance
        order = sorted(groups.items(),
                       key=lambda kv: (float(kv[1]["unit"]) if kv[1]["unit"].isdigit() else 99,
                                       kv[1]["lesson_no"] if kv[1]["lesson_no"] is not None else 99,
                                       list(groups).index(kv[0])))

        per_unit_counter = {}
        for (unit, raw), g in order:
            uid = f"{year}U{g['unit']}"
            per_unit_counter.setdefault(uid, 0)
            per_unit_counter[uid] += 1
            lnum = per_unit_counter[uid]
            lesson_id = f"{uid}.{lnum}"
            title = g["title"]
            if g["sub"] and not title.startswith(f"{g['unit']}.{g['sub']}"):
                title = f"{g['unit']}.{g['sub']} · {title}"
            unit_name = UNIT_NAMES.get(year, {}).get(g["unit"], f"Unidad {g['unit']}")
            unit_label = f"{meta['name']} · Unidad {g['unit']} — {unit_name}"
            lesson_index.setdefault(uid, OrderedDict())[lesson_id] = title

            n = 0
            for row in g["rows"]:
                es = split_variants(row["es"])
                en = split_variants(row["en"])
                if not es or not en:
                    dropped["empty"] += 1
                    continue
                sig = (year, es[0].lower(), en[0].lower())
                if sig in seen_pairs:
                    dropped["duplicate"] += 1
                    continue
                seen_pairs.add(sig)
                n += 1
                corpus.append(OrderedDict([
                    ("id", f"{lesson_id}.{n:03d}"),
                    ("year", year),
                    ("unit", uid),
                    ("unitName", unit_label),
                    ("lesson", lesson_id),
                    ("lessonTitle", title),
                    ("es", es),
                    ("en", en),
                ]))

    # the extra words, per year, in lists of 30
    CHUNK = 30
    for year, rows in unplaced.items():
        meta = YEARS[year]
        uid = f"{year}UX"
        unit_label = (f"{meta['name']} · Vocabulario adicional — extra words for this year, "
                      f"not yet placed in a lesson")
        kept = []
        for row in rows:
            es, en = split_variants(row["es"]), split_variants(row["en"])
            if not es or not en:
                dropped["empty"] += 1; continue
            sig = (year, es[0].lower(), en[0].lower())
            if sig in seen_pairs:
                dropped["duplicate"] += 1; continue
            seen_pairs.add(sig)
            kept.append((es, en))
        for i in range(0, len(kept), CHUNK):
            lnum = i // CHUNK + 1
            lesson_id = f"{uid}.{lnum}"
            title = f"Vocabulario adicional {lnum} — extra words, not yet in a lesson"
            lesson_index.setdefault(uid, OrderedDict())[lesson_id] = title
            for n, (es, en) in enumerate(kept[i:i + CHUNK], 1):
                corpus.append(OrderedDict([
                    ("id", f"{lesson_id}.{n:03d}"), ("year", year), ("unit", uid),
                    ("unitName", unit_label), ("lesson", lesson_id), ("lessonTitle", title),
                    ("es", es), ("en", en)]))

    # keep the corpus in year, then unit, then lesson order
    ykeys = list(YEARS)
    def sort_key(e):
        uid = e["unit"]
        mu = re.search(r"U(\d+|X)", uid)
        un = 99 if mu.group(1) == "X" else int(mu.group(1))
        ml = re.search(r"\.(\d+)$", e["lesson"])
        return (ykeys.index(e["year"]), un, int(ml.group(1)) if ml else 0, e["id"])
    corpus.sort(key=sort_key)

    # ---------------------------------------------------------------- write
    # One file per lesson, so a list can be edited on its own, plus a manifest
    # (index.js) the site reads to draw the contents page. Ids are derived from
    # the Spanish headword, never from the row number: a teacher can insert,
    # delete and reorder words in a list without detaching anyone's progress.
    lists_dir = os.path.join(OUT, "data", "lists")
    os.makedirs(lists_dir, exist_ok=True)
    for old_file in os.listdir(lists_dir):
        if old_file.endswith(".js"):
            os.remove(os.path.join(lists_dir, old_file))

    by_lesson = OrderedDict()
    for e in corpus:
        by_lesson.setdefault(e["lesson"], []).append(e)

    manifest_units, id_clashes = OrderedDict(), 0
    for lesson_id, entries in by_lesson.items():
        e0 = entries[0]
        lines, used = [], set()
        for e in entries:
            key = word_id(e["es"][0])
            if key in used:                       # vanishingly rare; widen rather than collide
                key = word_id(e["es"][0], 6)
                id_clashes += 1
            used.add(key)
            es = ";".join(e["es"])
            en = ";".join(e["en"])
            lines.append("  [%s, %s]" % (json.dumps(es, ensure_ascii=False),
                                         json.dumps(en, ensure_ascii=False)))
        body = (
            "/* %s — %s\n"
            "   %s\n"
            "   One pair per line: [\"Spanish\", \"English\"]. Separate interchangeable\n"
            "   forms with a semicolon — \"el chico;un chico\" / \"the boy;a boy;boy\".\n"
            "   Add, remove or reorder freely: a word keeps its place in a student's\n"
            "   progress as long as its Spanish stays the same. */\n"
            "BBA.list(%s, [\n%s\n]);\n"
        ) % (lesson_id, e0["lessonTitle"].replace("*/", ""), e0["unitName"].replace("*/", ""),
             json.dumps(lesson_id), ",\n".join(lines))
        with open(os.path.join(lists_dir, lesson_id + ".js"), "w", encoding="utf-8", newline="\n") as f:
            f.write(body)

        u = manifest_units.setdefault(e0["unit"], OrderedDict(
            [("u", e0["unit"]), ("y", e0["year"]), ("name", e0["unitName"]), ("lessons", [])]))
        u["lessons"].append(OrderedDict([("l", lesson_id), ("t", e0["lessonTitle"]), ("n", len(entries))]))

    years = [OrderedDict([("y", y), ("name", m["name"])]) for y, m in YEARS.items()]
    manifest = OrderedDict([("years", years), ("units", list(manifest_units.values()))])
    with open(os.path.join(OUT, "data", "index.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write(
            "/* The contents page: every year, unit and lesson, with the number of words\n"
            "   each list holds. The site reads this to draw the home page and the progress\n"
            "   tab; the lists themselves load one at a time, from data/lists/.\n"
            "\n"
            "   Editing an existing list: change data/lists/<lesson>.js only. The count below\n"
            "   is a hint and corrects itself once the list loads.\n"
            "   Adding a new list: add the file, then one line here in the right unit.\n"
            "   Generated by build_ks_corpus.py, which rewrites both. */\n"
            "window.BBA_INDEX = " + json.dumps(manifest, ensure_ascii=False, indent=1) + ";\n")

    if id_clashes:
        print("widened ids to avoid a clash:", id_clashes)

    units = OrderedDict()
    for e in corpus:
        units.setdefault(e["unit"], {"name": e["unitName"], "year": e["year"], "lessons": 0, "words": 0})
        units[e["unit"]]["words"] += 1
    for uid, lessons in lesson_index.items():
        if uid in units:
            units[uid]["lessons"] = len(lessons)

    print(f"{len(corpus)} entries · {sum(len(v) for v in lesson_index.values())} lessons · {len(units)} units")
    for uid, u in units.items():
        print(f"   {uid:7s} {u['lessons']:3d} lessons {u['words']:5d} words   {u['name']}")
    print("dropped:", dropped, "| not-yet-placed kept as extra:",
          {y: len(v) for y, v in unplaced.items()})
    with open(os.path.join(OUT, "data", "_build-report.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(report))
    print("report lines:", len(report))

main()
