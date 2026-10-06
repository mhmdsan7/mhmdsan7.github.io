---
layout: page
title: About
description: "APT-966 is the research blog of Mohammed Aladgham, a Cyber Threat Intelligence analyst."
permalink: /about/
eyebrow: About
---

Mohammed — a Cyber Threat Intelligence enthusiast and practitioner.

This blog is my place to share insights, research, and resources related to threat intelligence, cybersecurity trends, and adversary tactics. Whether you're a beginner or a fellow analyst, I hope you find something useful here.

Let's keep the field more fun.

## What you'll find here

{% assign about_categories = site.pages | where: "layout", "category" | sort: "order" %}
{% for cat in about_categories -%}
- **[{{ cat.title }}]({{ cat.url | relative_url }})**: {{ cat.description }}
{% endfor %}

## A note on indicators

Indicators of compromise are defanged (for example `hxxps://example[.]com` or `203.0.113[.]10`) so they can't be opened by accident. They're displayed and copied exactly as written. Re-fang and validate them deliberately before any operational use.

## Elsewhere

- X (Twitter): [@{{ site.twitter_username }}](https://twitter.com/{{ site.twitter_username }})
- LinkedIn: [{{ site.linkedin_username }}](https://www.linkedin.com/in/{{ site.linkedin_username }})
- GitHub: [{{ site.github_username }}](https://github.com/{{ site.github_username }})
- RSS: [subscribe to new research]({{ '/feed.xml' | relative_url }})
