#!/usr/bin/env python3
"""Checks the built site before it goes live.

Usage: python3 .github/scripts/check_site.py [_site]

Fails when:
  * a page the site relies on is missing, including published article URLs
    that must keep working;
  * an internal link, image, script, or stylesheet points to a missing file,
    or links to an in-page anchor (#id) that doesn't exist;
  * a page is missing its language, title, description, or canonical URL, has
    other than one <h1>, has duplicate ids, or has images without alt text;
  * the search index, RSS feed, or sitemap is invalid;
  * a published post still contains template placeholders such as TODO(...);
  * the custom domain in CNAME changed.
"""
from __future__ import annotations

import json
import os
import posixpath
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

SITE = Path(sys.argv[1] if len(sys.argv) > 1 else "_site").resolve()
REPO = Path(__file__).resolve().parents[2]
SITE_URL = "https://blog.aladgham.com"
DOMAIN = "blog.aladgham.com"

# Files that must exist after every build. Published article URLs are listed
# so that a front-matter or permalink change can't silently break old links.
REQUIRED = [
    "index.html",
    "404.html",
    "feed.xml",
    "sitemap.xml",
    "robots.txt",
    "search.json",
    "research/index.html",
    "categories/index.html",
    "tags/index.html",
    "search/index.html",
    "about/index.html",
    "archive.html",  # the old archive URL now redirects to /research/
    "assets/css/main.css",
    "assets/js/main.js",
    "assets/js/search.js",
    "assets/img/social-card.png",
    "favicon.ico",
    "apple-touch-icon.png",
    # Published articles
    "ransomware/threat-intel/raas/2025/06/21/ransomhub-ransomware-analysis.html",
]

SKIP_TEXT_TAGS = {"pre", "code", "script", "style", "textarea", "noscript"}

errors: list[str] = []
warnings: list[str] = []


def error(message: str) -> None:
    errors.append(message)
    print(f"::error::{message}")


def warn(message: str) -> None:
    warnings.append(message)
    print(f"::warning::{message}")


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.refs: list[tuple[str, str]] = []
        self.lang: str | None = None
        self.title = ""
        self.description: str | None = None
        self.canonical: str | None = None
        self.h1 = 0
        self.images_without_alt = 0
        self.redirect = False
        self.text: list[str] = []
        self._in_title = False
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        if "id" in a:
            self.ids.append(a["id"])
        if tag == "html":
            self.lang = a.get("lang")
        elif tag == "title":
            self._in_title = True
        elif tag == "h1":
            self.h1 += 1
        elif tag == "meta":
            if a.get("name") == "description":
                self.description = a.get("content", "")
            if a.get("http-equiv", "").lower() == "refresh":
                self.redirect = True
        elif tag == "link" and a.get("rel") == "canonical":
            self.canonical = a.get("href")
        elif tag == "img" and "alt" not in a:
            self.images_without_alt += 1
        if tag in SKIP_TEXT_TAGS:
            self._skip += 1
        for attr in ("href", "src"):
            if a.get(attr) and tag in ("a", "link", "img", "script", "source", "iframe"):
                self.refs.append((tag, a[attr]))

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        if tag in SKIP_TEXT_TAGS and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif not self._skip:
            self.text.append(data)


pages: dict[Path, PageParser] = {}


def parse(path: Path) -> PageParser:
    if path not in pages:
        parser = PageParser()
        parser.feed(path.read_text(encoding="utf-8", errors="replace"))
        pages[path] = parser
    return pages[path]


def resolve(url: str, page: Path) -> tuple[Path | None | bool, str]:
    """Return (target file, fragment). None means external; False means missing."""
    parts = urlsplit(url)
    if parts.scheme in ("http", "https"):
        if not url.startswith(SITE_URL):
            return None, ""
    elif parts.scheme or url.startswith("//"):
        return None, ""  # mailto:, tel:, data:, protocol-relative, ...
    fragment = unquote(parts.fragment)
    path = unquote(parts.path)
    if not path:
        return page, fragment
    if not path.startswith("/"):
        base = "/" + page.parent.relative_to(SITE).as_posix()
        trailing = path.endswith("/")
        path = posixpath.normpath(posixpath.join(base, path)) + ("/" if trailing else "")
    target = SITE / path.lstrip("/")
    candidates = [target / "index.html"] if path.endswith("/") else [
        target, target.with_name(target.name + ".html"), target / "index.html"]
    for candidate in candidates:
        if candidate.is_file():
            return candidate, fragment
    return False, fragment


def check_required() -> None:
    for rel in REQUIRED:
        if not (SITE / rel).is_file():
            error(f"Missing required file: /{rel}")


def check_pages() -> int:
    links_checked = 0
    html_files = sorted(SITE.rglob("*.html"))
    for page in html_files:
        rel = "/" + page.relative_to(SITE).as_posix()
        p = parse(page)
        if p.redirect:
            continue
        if not p.lang:
            error(f"{rel}: <html> has no lang attribute")
        if not p.title.strip():
            error(f"{rel}: empty <title>")
        if not (p.description or "").strip():
            error(f"{rel}: missing meta description")
        if not (p.canonical or "").startswith(SITE_URL):
            error(f"{rel}: canonical URL missing or not on {SITE_URL}: {p.canonical!r}")
        if p.h1 != 1:
            error(f"{rel}: expected exactly one <h1>, found {p.h1}")
        if p.images_without_alt:
            error(f"{rel}: {p.images_without_alt} image(s) without an alt attribute")
        duplicates = sorted({i for i in p.ids if p.ids.count(i) > 1})
        if duplicates:
            error(f"{rel}: duplicate id(s): {', '.join(duplicates)}")
        text = " ".join(p.text)
        leak = re.search(r"\{\{|\{%|%\}", text)
        if leak:
            snippet = text[max(0, leak.start() - 40): leak.start() + 40].strip()
            warn(f"{rel}: possible unrendered Liquid outside code: ...{snippet}...")

        for tag, url in p.refs:
            links_checked += 1
            target, fragment = resolve(url, page)
            if target is None:
                continue
            if target is False:
                error(f"{rel}: broken {tag} reference: {url}")
                continue
            if fragment and fragment != "top" and target.suffix == ".html":
                if fragment not in parse(target).ids:
                    error(f"{rel}: link to missing anchor: {url}")
    print(f"Checked {len(html_files)} HTML files and {links_checked} references.")
    return len(html_files)


def check_search_index() -> None:
    path = SITE / "search.json"
    if not path.is_file():
        return
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        error(f"search.json is not valid JSON: {exc}")
        return
    if not isinstance(data, list):
        error("search.json should be a list")
        return
    for item in data:
        for key in ("title", "url", "date", "content", "tags"):
            if key not in item:
                error(f"search.json entry {item.get('url')!r} is missing '{key}'")
        target, _ = resolve(item.get("url", ""), SITE / "index.html")
        if target is False:
            error(f"search.json points to a missing page: {item.get('url')}")
    print(f"Search index: {len(data)} entries.")


def check_feed() -> None:
    path = SITE / "feed.xml"
    if not path.is_file():
        return
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        error(f"feed.xml is not valid XML: {exc}")
        return
    ns = {"a": "http://www.w3.org/2005/Atom"}
    entries = root.findall("a:entry", ns)
    for entry in entries:
        link = entry.find("a:link", ns)
        href = link.get("href") if link is not None else ""
        if not href.startswith(SITE_URL):
            error(f"feed.xml entry link is not on {SITE_URL}: {href}")
    print(f"Feed: {len(entries)} entries.")


def check_sitemap() -> None:
    path = SITE / "sitemap.xml"
    if not path.is_file():
        return
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        error(f"sitemap.xml is not valid XML: {exc}")
        return
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [el.text or "" for el in root.findall("s:url/s:loc", ns)]
    for loc in locs:
        if not loc.startswith(SITE_URL):
            error(f"sitemap.xml URL is not on {SITE_URL}: {loc}")
            continue
        target, _ = resolve(loc, SITE / "index.html")
        if target is False:
            error(f"sitemap.xml lists a missing page: {loc}")
    print(f"Sitemap: {len(locs)} URLs.")


def front_matter(text: str) -> str:
    match = re.match(r"^---\s*\n(.*?)\n---\s*(\n|$)", text, re.S)
    return match.group(1) if match else ""


def check_sources() -> None:
    cname = REPO / "CNAME"
    if not cname.is_file() or cname.read_text(encoding="utf-8").strip() != DOMAIN:
        error(f"CNAME must contain {DOMAIN}")

    category_ids = set()
    for page in (REPO / "categories").glob("*.md"):
        match = re.search(r"^category_id:\s*['\"]?([\w-]+)", front_matter(page.read_text(encoding="utf-8")), re.M)
        if match:
            category_ids.add(match.group(1))

    posts = sorted((REPO / "_posts").glob("*.md")) + sorted((REPO / "_posts").glob("*.markdown"))
    for post in posts:
        text = post.read_text(encoding="utf-8")
        fm = front_matter(text)
        if re.search(r"^published:\s*false\s*$", fm, re.M):
            continue
        rel = post.relative_to(REPO).as_posix()
        if "TODO(" in text:
            error(f"{rel}: still contains TODO(...) template placeholders")
        cats = re.search(r"^categories:\s*\[([^\]]*)\]", fm, re.M)
        if cats:
            names = [c.strip().strip("'\"") for c in cats.group(1).split(",") if c.strip()]
        else:
            block = re.search(r"^categories:\s*\n((?:\s+-\s*.+\n?)+)", fm, re.M)
            single = re.search(r"^categor(?:y|ies):\s*([^\[\n]+)$", fm, re.M)
            if block:
                names = [re.sub(r"^\s*-\s*", "", line).strip().strip("'\"") for line in block.group(1).splitlines() if line.strip()]
            elif single:
                names = single.group(1).split()
            else:
                names = []
        slugs = {re.sub(r"[^a-z0-9]+", "-", n.lower()).strip("-") for n in names}
        if not slugs & category_ids:
            warn(f"{rel}: none of its categories {sorted(names)} match a page in categories/ "
                 f"({', '.join(sorted(category_ids))})")


def write_summary(page_count: int) -> None:
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary:
        return
    lines = ["## Site check", "", f"- HTML files checked: {page_count}",
             f"- Errors: {len(errors)}", f"- Warnings: {len(warnings)}", ""]
    lines += [f"- :x: {e}" for e in errors] + [f"- :warning: {w}" for w in warnings]
    with open(summary, "a", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


def main() -> int:
    if not SITE.is_dir():
        print(f"Built site not found at {SITE}")
        return 1
    check_required()
    page_count = check_pages()
    check_search_index()
    check_feed()
    check_sitemap()
    check_sources()
    write_summary(page_count)
    print(f"\n{len(errors)} error(s), {len(warnings)} warning(s).")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
