/*
 * APT-966 — client-side search over /search.json (titles, tags, categories,
 * summaries, and full article text). Loaded only on /search/.
 */
(function () {
  "use strict";

  var input = document.getElementById("search-input");
  var list = document.getElementById("search-results");
  var status = document.getElementById("search-status");
  var emptyHelp = document.getElementById("search-empty");
  if (!input || !list || !status) return;

  var MAX_RESULTS = 50;
  var docs = null;
  var loading = null;

  /* Match indicators whether they're typed defanged or not. */
  function refang(text) {
    return text
      .replace(/\[\.\]|\(\.\)|\{\.\}|\[dot\]/gi, ".")
      .replace(/\[:\]/g, ":")
      .replace(/\[@\]|\[at\]/gi, "@")
      .replace(/\bhxxp/gi, "http")
      .replace(/\bfxp/gi, "ftp");
  }

  function normalize(text) {
    return refang(String(text || "").toLowerCase());
  }

  function load() {
    if (!loading) {
      loading = fetch(input.getAttribute("data-index"), { credentials: "same-origin" })
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        })
        .then(function (data) {
          docs = data.map(function (d) {
            return {
              d: d,
              title: normalize(d.title),
              tags: normalize((d.tags || []).join(" ")),
              category: normalize(d.category),
              summary: normalize(d.summary),
              content: normalize(d.content)
            };
          });
        });
    }
    return loading;
  }

  function search(query) {
    var terms = normalize(query).split(/\s+/).filter(Boolean);
    var results = [];
    docs.forEach(function (doc) {
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        var term = terms[i];
        var s = 0;
        if (doc.title.indexOf(term) > -1) s += 10;
        if (doc.tags.indexOf(term) > -1) s += 6;
        if (doc.category.indexOf(term) > -1) s += 4;
        if (doc.summary.indexOf(term) > -1) s += 3;
        if (doc.content.indexOf(term) > -1) s += 1;
        if (!s) return;
        score += s;
      }
      results.push({ doc: doc.d, score: score });
    });
    results.sort(function (a, b) {
      return b.score - a.score || (a.doc.date < b.doc.date ? 1 : a.doc.date > b.doc.date ? -1 : 0);
    });
    return results;
  }

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /* Append text to an element, wrapping query terms in <mark>. */
  function appendHighlighted(element, text, terms) {
    var usable = terms.filter(function (term) { return term.length > 1 || terms.length === 1; });
    if (!usable.length) {
      element.appendChild(document.createTextNode(text));
      return;
    }
    var pattern = new RegExp(usable.map(escapeRegExp).join("|"), "gi");
    var last = 0;
    var match;
    while ((match = pattern.exec(text))) {
      if (!match[0].length) { pattern.lastIndex++; continue; }
      if (match.index > last) element.appendChild(document.createTextNode(text.slice(last, match.index)));
      var mark = document.createElement("mark");
      mark.textContent = match[0];
      element.appendChild(mark);
      last = match.index + match[0].length;
    }
    if (last < text.length) element.appendChild(document.createTextNode(text.slice(last)));
  }

  function snippet(content, terms, fallback) {
    var lower = content.toLowerCase();
    var index = -1;
    for (var i = 0; i < terms.length && index < 0; i++) index = lower.indexOf(terms[i]);
    if (index < 0) return fallback || content.slice(0, 200) + (content.length > 200 ? "…" : "");
    var start = Math.max(0, index - 80);
    var end = Math.min(content.length, index + 160);
    if (start > 0) {
      var space = content.lastIndexOf(" ", start);
      if (space > -1 && start - space < 24) start = space + 1;
    }
    if (end < content.length) {
      var next = content.indexOf(" ", end);
      if (next > -1 && next - end < 24) end = next;
    }
    return (start > 0 ? "…" : "") + content.slice(start, end) + (end < content.length ? "…" : "");
  }

  function render(query) {
    list.textContent = "";
    if (emptyHelp) emptyHelp.hidden = true;
    if (!query) {
      status.textContent = "";
      return;
    }

    var results = search(query);
    var rawTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

    if (!results.length) {
      status.textContent = "No results for “" + query + "”.";
      if (emptyHelp) emptyHelp.hidden = false;
      return;
    }

    status.textContent = results.length + (results.length === 1 ? " result" : " results") +
      " for “" + query + "”" + (results.length > MAX_RESULTS ? " (showing " + MAX_RESULTS + ")" : "");

    results.slice(0, MAX_RESULTS).forEach(function (result) {
      var d = result.doc;
      var item = document.createElement("li");
      item.className = "search-result";

      var meta = document.createElement("p");
      meta.className = "meta";
      if (d.category) {
        var category = document.createElement("span");
        category.className = "kicker";
        category.textContent = d.category;
        meta.appendChild(category);
      }
      var date = document.createElement("time");
      date.dateTime = d.date;
      date.textContent = d.dateLabel;
      meta.appendChild(date);

      var heading = document.createElement("h2");
      heading.className = "search-result-title";
      var link = document.createElement("a");
      link.className = "card-link";
      link.href = d.url;
      appendHighlighted(link, d.title, rawTerms);
      heading.appendChild(link);

      var text = document.createElement("p");
      text.className = "search-result-snippet";
      appendHighlighted(text, snippet(d.content || "", rawTerms, d.summary), rawTerms);

      item.appendChild(meta);
      item.appendChild(heading);
      item.appendChild(text);

      if (d.tags && d.tags.length) {
        var tags = document.createElement("ul");
        tags.className = "tags";
        tags.setAttribute("role", "list");
        tags.setAttribute("aria-label", "Tags");
        d.tags.slice(0, 5).forEach(function (tag) {
          var li = document.createElement("li");
          var span = document.createElement("span");
          span.className = "tag";
          span.textContent = tag;
          li.appendChild(span);
          tags.appendChild(li);
        });
        item.appendChild(tags);
      }

      list.appendChild(item);
    });
  }

  function updateUrl(query) {
    var url = window.location.pathname + (query ? "?q=" + encodeURIComponent(query) : "");
    try { window.history.replaceState(null, "", url); } catch (e) { /* ignore */ }
  }

  var timer;
  function run() {
    var query = input.value.trim();
    updateUrl(query);
    if (!query) {
      render("");
      return;
    }
    if (!docs) status.textContent = "Loading the search index…";
    load().then(function () {
      if (input.value.trim() === query) render(query);
    }, function () {
      status.textContent = "Search is unavailable right now. Browse all research instead.";
    });
  }

  input.addEventListener("input", function () {
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 120);
  });

  input.form.addEventListener("submit", function (event) {
    event.preventDefault();
    window.clearTimeout(timer);
    run();
  });

  var initial = new URLSearchParams(window.location.search).get("q");
  if (initial) {
    input.value = initial;
    run();
  } else {
    input.focus();
    load();
  }
})();
