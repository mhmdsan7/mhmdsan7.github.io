# APT-966

Source for [blog.aladgham.com](https://blog.aladgham.com), a cyber threat intelligence and malware research blog by Mohammed Aladgham.

It's a [Jekyll](https://jekyllrb.com) site that **GitHub Pages builds and publishes from the `main` branch**. There's nothing to install: edit files on GitHub, and every change merged into `main` goes live in about a minute.

## Publish a new article

Everything below works in the browser on github.com.

1. **Copy a template.** Open [`_drafts/`](_drafts) and copy the raw contents of the template you need:
   - [`threat-actor-profile.md`](_drafts/threat-actor-profile.md): threat actor / APT profile
   - [`malware-analysis.md`](_drafts/malware-analysis.md): malware analysis report
2. **Create the post.** In [`_posts/`](_posts), choose **Add file → Create new file**. Name it `YYYY-MM-DD-short-title.md` (for example `2026-10-05-loader-analysis.md`) and paste the template.
3. **Write it.** Fill in the front matter, replace every `TODO(...)` placeholder, and delete the sections you don't need.
4. **Add images** (optional). Upload them to `assets/img/posts/short-title/` with **Add file → Upload files**.
5. **Publish.** Delete the `published: false` line, then commit:
   - **Recommended:** choose *Create a new branch for this commit and start a pull request*. The **Build check** runs on the pull request. Merge it when it's green, and the article goes live.
   - Or commit straight to `main` to publish immediately.

Posts in `_drafts/` and posts with `published: false` are never published, so unfinished work can be saved safely. The build check fails if a published post still contains a `TODO(` placeholder.

## Front matter

```yaml
---
title: "Actor name: threat actor profile"
description: "One or two sentences that summarize the article."
categories: [threat-actors]
tags: [ActorName, MalwareFamily, phishing]
---
```

| Field | | What it does |
|---|---|---|
| `title` | required | Article title. |
| `categories` | required | One category ID from the table below. It's also part of the article's URL. |
| `description` | recommended | Summary shown on cards, under the title, in search results, in RSS, and in link previews. |
| `tags` | recommended | Actors, malware families, techniques, themes. Each tag gets a section on the Tags page. |
| `date` | optional | Publication date. Defaults to the date in the file name. |
| `last_modified_at` | optional | Shown as "Updated" and used by RSS and search engines. |
| `image`, `image_alt` | optional | Cover image and its description. Also used as the link-preview image. `image_caption` adds a caption. |
| `featured` | optional | `true` puts the article in the homepage's *Featured research* slot (the newest featured article wins; otherwise the latest article is shown). |
| `toc` | optional | `false` hides the table of contents. It's generated from `##` and `###` headings; add `{: .no_toc}` under a heading to leave it out. |
| `research` | optional | The *At a glance* panel: `tlp`, `actor`, `aliases`, `attribution`, `confidence`, `motivation`, `malware`, `file_type`, `sectors`, `regions`, `platforms`, `first_seen`, `last_seen`, `sha256`. Only fields you fill in are shown. Labels live in [`_data/research_fields.yml`](_data/research_fields.yml). |
| `published` | optional | `false` keeps the post off the site. |

Article URLs follow `/category/YYYY/MM/DD/short-title.html`. Once an article is live, don't change its category, date, or file name; if you must, add `permalink:` with the old URL (the RansomHub article does this).

## Categories

| ID | Name |
|---|---|
| `threat-actors` | Threat Actors & APTs |
| `malware-analysis` | Malware Analysis |
| `ransomware` | Ransomware |
| `campaign-analysis` | Campaign Analysis |
| `detection-engineering` | Detection Engineering |

Each category is a small file in [`categories/`](categories). To add one, copy an existing file and change `title`, `description`, `category_id`, `icon`, `order`, and `permalink`. Categories without articles show a friendly empty state.

## Writing components

Standard Markdown works everywhere. These extras use kramdown's `{: ... }` syntax on the line directly after the block.

**Callouts.** A blockquote with a callout class:

```markdown
> The key finding, in one or two sentences.
{: .callout .finding}
```

Types: `.finding` (Key finding), `.assessment` (Analyst assessment), `.detection` (Detection note), `.note`, and `.warning`. Set your own label with `{: .callout .finding data-title="Initial access"}`.

**MITRE ATT&CK table.** Technique IDs such as `T1059.001` link to attack.mitre.org automatically.

```markdown
| Tactic | Technique | ID |
|---|---|---|
| Execution | Command and Scripting Interpreter: PowerShell | T1059.001 |
{: .attack}
```

**Indicators of compromise.** Keep indicators defanged and inside backticks. They're displayed and copied exactly as written (never re-fanged or turned into links), and the table gets a *Copy all* button.

```markdown
| Type | Indicator | Context |
|---|---|---|
| Domain | `update-check[.]example` | C2 |
{: .ioc}
```

**Key–value table.** Add `{: .kv}` to a two-column table (such as sample metadata) to style the first column as labels.

**Figures.** Screenshots and diagrams with captions. Readers can click to enlarge them.

```liquid
{% include figure.html src="/assets/img/posts/short-title/execution-flow.png" alt="Describe what the image shows" caption="Figure 1. Execution flow." %}
```

Keep screenshots under about 1600 px wide and compress them before uploading (PNG for screenshots, JPEG or WebP for photos).

**Code.** Fenced code blocks with a language (for example `powershell`, `python`, `yaml`, `json`, `text`) are highlighted and get a copy button. Straight quotes, `--`, and `...` are kept exactly as typed everywhere on the site, so command lines copy correctly even outside code blocks.

## Checks

[`.github/workflows/build-check.yml`](.github/workflows/build-check.yml) builds the site with the same builder GitHub Pages uses, then runs [`.github/scripts/check_site.py`](.github/scripts/check_site.py). The check fails on:

- broken internal links or anchors;
- missing pages or page metadata;
- an invalid RSS feed, sitemap, or search index;
- template placeholders left in published posts;
- a changed URL for an existing article.

It runs on every push and pull request, and each run's built site can be downloaded as an artifact.

## Structure

| Path | Contents |
|---|---|
| `_posts/` | Published articles |
| `_drafts/` | Article templates (never published) |
| `categories/` | One page per category |
| `_layouts/`, `_includes/` | Page templates and components |
| `_data/research_fields.yml` | Labels for the *At a glance* panel |
| `assets/css/main.css` | All styles (dark theme by default, optional light theme) |
| `assets/js/` | Small enhancements: theme toggle, menu, copy buttons, search |
| `research.html`, `tags.html`, `search.html`, `about.md` | Site pages |
| `CNAME` | Custom domain (`blog.aladgham.com`) |
