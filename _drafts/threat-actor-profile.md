---
# =============================================================================
# TEMPLATE: Threat actor / APT profile
#
# 1. Copy this file into _posts/ as YYYY-MM-DD-short-title.md
#    (for example 2026-10-05-actor-name-profile.md).
# 2. Replace every TODO(...) placeholder and delete sections you don't need.
#    Cite a source for every claim. Don't publish unverified attribution.
# 3. Delete the `published: false` line when the profile is ready to go live.
#
# Files in _drafts/ and posts with `published: false` are never published.
# The build check fails if a published post still contains "TODO(".
# =============================================================================
published: false
title: "TODO(Actor name): threat actor profile"
description: "TODO(One or two sentences: who the actor is, what they target, and why this profile matters now.)"
categories: [threat-actors]
tags: [TODO(actor-name), TODO(alias), TODO(malware-family)]
# featured: true                     # show in the homepage "Featured research" slot
# image: /assets/img/posts/TODO(short-title)/cover.png
# image_alt: "TODO(describe the cover image)"
# last_modified_at: YYYY-MM-DD       # shown as "Updated" when set
research:                            # "At a glance" panel; delete lines you don't use
  tlp: CLEAR
  actor: "TODO(primary name)"
  aliases: ["TODO(alias)", "TODO(alias)"]
  attribution: "TODO(assessed sponsor or nexus, or 'Unattributed')"
  confidence: "TODO(Low | Moderate | High)"
  motivation: "TODO(e.g. espionage, financial gain)"
  sectors: ["TODO(sector)"]
  regions: ["TODO(region)"]
  first_seen: "TODO(YYYY)"
---

> TODO(State the single most important takeaway about this actor in one or two sentences.)
{: .callout .finding}

## Overview

TODO(Two or three paragraphs: who the actor is, their objectives, how long they've been active, and why they matter now.)

## Aliases

Vendors track overlapping activity under different names. Overlaps are approximate.

| Name | Tracked by | Notes |
|---|---|---|
| TODO(name) | TODO(vendor or report) | TODO(scope of overlap) |

## Attribution and confidence

TODO(Summarize the attribution assessment and the evidence behind it: infrastructure, tooling, targeting, operational patterns. Note alternative hypotheses.)

> TODO(Analyst assessment in estimative language, e.g. "We assess with moderate confidence that ...". State key assumptions and what would change the assessment.)
{: .callout .assessment}

## Targeting

- **Sectors:** TODO(sectors)
- **Regions:** TODO(countries or regions)
- **Victimology:** TODO(organization types, roles, or systems targeted)

## Observed campaigns

| Period | Campaign | Summary | Source |
|---|---|---|---|
| TODO(YYYY-MM) | TODO(campaign name) | TODO(one-line summary) | TODO([ref](#references)) |

## Tools and malware

| Tool | Type | Notes |
|---|---|---|
| TODO(name) | TODO(e.g. loader, backdoor, public tool) | TODO(how and when it's used) |

## Tactics, techniques, and procedures

Technique IDs link to MITRE ATT&CK automatically.

| Tactic | Technique | ID |
|---|---|---|
| TODO(e.g. Initial Access) | TODO(technique name) | TODO(Txxxx) |
{: .attack}

## Detection opportunities

> TODO(The most reliable detection opportunity and the telemetry it needs.)
{: .callout .detection}

TODO(Describe behaviors to hunt for, required log sources, and expected false positives. Only include queries or rules you've tested.)

```text
TODO(hunting query or detection logic)
```

## Recommendations

1. TODO(recommendation)
2. TODO(recommendation)

## References

1. TODO([Title, Publisher, YYYY-MM-DD](https://example.com))
