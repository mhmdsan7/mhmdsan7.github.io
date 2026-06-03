---
title: Home
---

Mohammed — a Cyber Threat Intelligence enthusiast and practitioner.

This blog is my place to share insights, research, and resources related to threat intelligence, cybersecurity trends, and adversary tactics. Whether you're a beginner or a fellow analyst, I hope you find something useful here.

Lets keep the field more fun.

## Latest Posts

{% for post in site.posts %}
- [{{ post.title }}]({{ post.url | relative_url }}) — {{ post.date | date: "%Y-%m-%d" }}
{% endfor %}
