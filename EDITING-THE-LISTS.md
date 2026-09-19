# El Léxico · KS3 & KS4 Spanish — how the lists work

Live site → https://artmemry.github.io/KS3-KS4-Spanish-Vocabulary-training/

5,376 words across 265 lists, Years 7 to 11, built from the five
`Y*_SP_Vocabulary_by_Lesson_v2.xlsx` workbooks. Everything runs in the
browser: no login, no server, no data leaving the student's device.

## One list, one file

Each lesson is its own file, so you can change a list without touching
anything else:

    data/lists/Y8U4.3.js        Year 8, Unit 4, Lesson 3

Open it on GitHub, click the pencil, edit, commit. That is the whole job —
there is nothing to rebuild and nothing to upload alongside it.

    BBA.list("Y8U4.3", [
      ["ir", "to go"],
      ["voy;yo voy", "I go;I am going"],
      ["el parque;un parque", "the park;a park;park"]
    ]);

One pair per line. A semicolon separates forms that are interchangeable:
everything before the first semicolon is what the student is shown, and the
rest are accepted as correct. So `"el parque;un parque"` prompts with *el
parque*, and `"the park;a park;park"` accepts any of the three.

**You can add, delete and reorder freely.** A word's place in a student's
progress is tied to its Spanish, not to its position in the file, so
inserting a word at the top does not disturb anything below it. Changing a
word's English keeps its history; changing its Spanish starts it afresh,
which is right, because it is then a different word.

## Adding a whole new list

Two steps. Add `data/lists/<id>.js` in the format above, then add one line to
`data/index.js` in the right unit:

    {"l": "Y8U4.21", "t": "Los deportes de invierno", "n": 18}

`n` is only a hint for the contents page; the list itself is the truth and
corrects it as soon as a student opens it.

## The contents page

`data/index.js` holds every year, unit and lesson title. It is what the home
page and the Progress tab read, which is why neither has to download 265
files — a list is fetched only when a student opens it.

To change a lesson's **title**, or a unit's name, edit `data/index.js`.

## Rebuilding from the workbooks

`build_ks_corpus.py` regenerates `data/index.js` and every file in
`data/lists/` from the five workbooks. It overwrites hand edits, so use it
when the workbooks are the newer source, not as routine maintenance.

## What the teacher sees

Codes begin `LEXKS2.` and are read by the one dashboard at
`artmemry.github.io/A-Level-French-BBA/teacher.html`, where KS3–KS4 has its
own section and the roster can be filtered by year group. Set the week's task
there — pick the site, the class, tick the lists, copy the link, post it in
that class's channel.

## Two things worth knowing

**Years 7 to 9 start in the easier direction.** Español → Inglés is the
default for KS3 and the mix for KS4, which is what the GCSE asks for. A
student can change it on the lesson screen either way.

**Moving up in September.** A task link names its class. On a new device it
simply sets it. On a device already set to another year — the same student a
year later — the link does not move them silently; it offers: *This task was
set for Y9. You are down as Y8.* One tap moves them up.

## Not yet placed

423 Year 8 words and 306 Year 11 words are marked *Unassigned* in the source
workbooks — they belong to the year but not yet to a lesson. Rather than lose
them they sit in a *Vocabulario adicional* unit for that year, in lists of
thirty. Move any of them into a real lesson by cutting the line from
`data/lists/Y8UX.*.js` and pasting it into the lesson's own file.

Two source typos worth correcting in the workbooks as well as here, if you
agree they are typos: `Y8U4.3` is titled *ir and opionions*, and a mechanical
`el`/`un` expansion has produced pairs like `"el dinero;un dinero"` →
`"the money;a money"` on some uncountable nouns. Neither breaks anything —
the extra form is only ever *accepted*, never the prompt — but they read
oddly in the list view.
