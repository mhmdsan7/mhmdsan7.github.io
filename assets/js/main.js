/*
 * APT-966 — progressive enhancements.
 * Every page works without JavaScript. This file adds the theme toggle, the
 * mobile menu, copy buttons, table-of-contents highlighting, ATT&CK technique
 * links, and image enlargement.
 */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;

  function all(selector, context) {
    return Array.prototype.slice.call((context || doc).querySelectorAll(selector));
  }

  function svgIcon(paths) {
    return '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      paths + "</svg>";
  }

  var ICON_COPY = svgIcon('<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>');
  var ICON_CHECK = svgIcon('<path d="m5 12.5 4.5 4.5L19 7.5"/>');
  var ICON_CLOSE = svgIcon('<path d="M6 6l12 12M18 6 6 18"/>');

  /* ---- Screen reader announcements -------------------------------------- */

  var liveRegion;
  function announce(message) {
    if (!liveRegion) {
      liveRegion = doc.createElement("div");
      liveRegion.className = "visually-hidden";
      liveRegion.setAttribute("role", "status");
      liveRegion.setAttribute("aria-live", "polite");
      doc.body.appendChild(liveRegion);
    }
    liveRegion.textContent = "";
    window.setTimeout(function () { liveRegion.textContent = message; }, 60);
  }

  /* ---- Clipboard --------------------------------------------------------- */

  function legacyCopy(text) {
    var area = doc.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-9999px";
    doc.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = doc.execCommand("copy"); } catch (e) { ok = false; }
    doc.body.removeChild(area);
    return ok;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  /* A copy button. The text is read when clicked and copied exactly. */
  function makeCopyButton(getText, label, visibleText) {
    var button = doc.createElement("button");
    button.type = "button";
    button.className = "copy-button" + (visibleText ? "" : " copy-button--icon");
    button.setAttribute("aria-label", label);
    button.title = label;
    var idle = ICON_COPY + (visibleText ? "<span>" + visibleText + "</span>" : "");
    var done = ICON_CHECK + (visibleText ? "<span>Copied</span>" : "");
    button.innerHTML = idle;
    var timer;
    button.addEventListener("click", function () {
      copyText(getText()).then(function (ok) {
        window.clearTimeout(timer);
        if (ok) {
          button.classList.add("is-copied");
          button.innerHTML = done;
          announce("Copied to clipboard");
        } else {
          announce("Copy failed. Select the text and press Ctrl+C.");
        }
        timer = window.setTimeout(function () {
          button.classList.remove("is-copied");
          button.innerHTML = idle;
        }, 2000);
      });
    });
    return button;
  }

  /* Scrollable regions (wide code and tables) must be reachable by keyboard. */
  var scrollChecks = [];
  function makeScrollable(element, label) {
    function check() {
      var scrolls = element.scrollWidth > element.clientWidth + 1;
      if (scrolls) {
        element.setAttribute("tabindex", "0");
        element.setAttribute("role", "region");
        element.setAttribute("aria-label", label);
      } else if (element.getAttribute("tabindex") === "0") {
        element.removeAttribute("tabindex");
        element.removeAttribute("role");
        element.removeAttribute("aria-label");
      }
    }
    check();
    scrollChecks.push(check);
  }
  var resizeTimer;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      scrollChecks.forEach(function (check) { check(); });
    }, 150);
  });

  /* ---- Theme -------------------------------------------------------------- */

  var THEME_COLORS = { dark: "#0B0F19", light: "#F6F8FB" };

  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function applyTheme(theme, persist) {
    root.setAttribute("data-theme", theme);
    if (persist) {
      try { localStorage.setItem("theme", theme); } catch (e) { /* storage unavailable */ }
    }
    var meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme]);
    var next = theme === "light" ? "dark" : "light";
    all("[data-theme-toggle]").forEach(function (button) {
      button.setAttribute("aria-label", "Switch to " + next + " theme");
      button.title = "Switch to " + next + " theme";
    });
  }

  applyTheme(currentTheme(), false);

  all("[data-theme-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      applyTheme(currentTheme() === "light" ? "dark" : "light", true);
    });
  });

  window.addEventListener("storage", function (event) {
    if (event.key === "theme" && (event.newValue === "light" || event.newValue === "dark")) {
      applyTheme(event.newValue, false);
    }
  });

  /* ---- Mobile navigation --------------------------------------------------- */

  var navToggle = doc.querySelector(".nav-toggle");
  var nav = doc.getElementById("site-nav");

  if (navToggle && nav) {
    var isOpen = function () { return navToggle.getAttribute("aria-expanded") === "true"; };
    var setNav = function (open, returnFocus) {
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      doc.body.classList.toggle("nav-open", open);
      if (open) {
        var first = nav.querySelector("a");
        if (first) first.focus();
      } else if (returnFocus) {
        navToggle.focus();
      }
    };

    navToggle.addEventListener("click", function () { setNav(!isOpen(), false); });

    doc.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen()) setNav(false, true);
    });

    doc.addEventListener("click", function (event) {
      if (isOpen() && !event.target.closest(".site-header")) setNav(false, false);
    });

    nav.addEventListener("focusout", function (event) {
      var next = event.relatedTarget;
      if (isOpen() && next && !nav.contains(next) && next !== navToggle) setNav(false, false);
    });

    var wide = window.matchMedia("(min-width: 52.0625rem)");
    var onWide = function (event) { if (event.matches && isOpen()) setNav(false, false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  /* "/" jumps to search. */
  doc.addEventListener("keydown", function (event) {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
    var target = event.target;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    event.preventDefault();
    var input = doc.getElementById("search-input");
    if (input) {
      input.focus();
      input.select();
    } else {
      var link = doc.querySelector(".search-trigger");
      if (link) window.location.href = link.href;
    }
  });

  /* ---- Article content ------------------------------------------------------ */

  var prose = doc.querySelector(".article .prose, .page .prose");

  if (prose) {
    /* Code blocks: language label and copy button. */
    all("pre", prose).forEach(function (pre) {
      var code = pre.querySelector("code") || pre;
      var host = pre.closest(".highlighter-rouge") || pre;
      if (!prose.contains(host) || host.parentNode.classList.contains("code-block")) return;

      var match = (host.className + " " + code.className).match(/language-([\w#+.-]+)/);
      var lang = match ? match[1].toLowerCase() : "";
      if (lang === "plaintext" || lang === "text" || lang === "txt") lang = "";

      var wrapper = doc.createElement("div");
      wrapper.className = "code-block";
      host.parentNode.insertBefore(wrapper, host);
      wrapper.appendChild(host);

      var toolbar = doc.createElement("div");
      toolbar.className = "code-toolbar";
      var label = doc.createElement("span");
      label.className = "code-lang";
      label.textContent = lang;
      toolbar.appendChild(label);
      toolbar.appendChild(makeCopyButton(function () {
        return code.textContent.replace(/\n$/, "");
      }, lang ? "Copy " + lang + " code" : "Copy code", "Copy"));
      wrapper.insertBefore(toolbar, host);

      makeScrollable(pre, lang ? lang + " code" : "Code");
    });

    /* Wide tables scroll inside their wrapper. */
    all(".table-wrap", prose).forEach(function (wrap) { makeScrollable(wrap, "Table"); });

    /* Indicator tables: copy every indicator (the values in backticks) exactly. */
    all("table.ioc", prose).forEach(function (table) {
      var values = all("tbody code", table);
      if (!values.length) return;
      var host = table.closest(".table-wrap") || table;
      var toolbar = doc.createElement("div");
      toolbar.className = "table-toolbar";
      var label = doc.createElement("span");
      label.className = "table-toolbar-label";
      label.textContent = values.length + (values.length === 1 ? " indicator" : " indicators");
      toolbar.appendChild(label);
      toolbar.appendChild(makeCopyButton(function () {
        return values.map(function (value) { return value.textContent; }).join("\n");
      }, "Copy all indicators", "Copy all"));
      host.parentNode.insertBefore(toolbar, host);
    });

    /* ATT&CK tables: link technique IDs such as T1486 or T1059.001. */
    all("table.attack td", prose).forEach(function (cell) {
      if (cell.querySelector("a")) return;
      var id = cell.textContent.trim();
      if (!/^T\d{4}(\.\d{3})?$/.test(id)) return;
      var link = doc.createElement("a");
      link.className = "attack-id";
      link.href = "https://attack.mitre.org/techniques/" + id.replace(".", "/") + "/";
      link.textContent = id;
      link.title = "MITRE ATT&CK " + id;
      cell.textContent = "";
      cell.appendChild(link);
    });

    /* Image enlargement in a modal dialog. */
    if (typeof HTMLDialogElement === "function") {
      var dialog;
      var openImage = function (src, alt, caption) {
        if (!dialog) {
          dialog = doc.createElement("dialog");
          dialog.className = "lightbox";
          dialog.setAttribute("aria-label", "Enlarged image");
          dialog.innerHTML = '<button class="icon-button lightbox-close" type="button" aria-label="Close">' +
            ICON_CLOSE + "</button><figure><img alt=\"\"><figcaption></figcaption></figure>";
          doc.body.appendChild(dialog);
          dialog.addEventListener("click", function (event) {
            if (event.target === dialog || event.target.closest(".lightbox-close")) dialog.close();
          });
        }
        var image = dialog.querySelector("img");
        var figcaption = dialog.querySelector("figcaption");
        image.src = src;
        image.alt = alt || "";
        figcaption.textContent = caption || "";
        figcaption.hidden = !caption;
        dialog.showModal();
        dialog.querySelector(".lightbox-close").focus();
      };

      all("img", prose).forEach(function (img) {
        var link = img.closest("a");
        if (link && !link.hasAttribute("data-lightbox")) return;
        if (!link) {
          link = doc.createElement("a");
          link.className = "zoom-link";
          link.href = img.currentSrc || img.src;
          link.setAttribute("data-lightbox", "");
          img.parentNode.insertBefore(link, img);
          link.appendChild(img);
        }
        link.setAttribute("aria-label", "Enlarge image" + (img.alt ? ": " + img.alt : ""));
        link.addEventListener("click", function (event) {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          var figure = link.closest("figure");
          var caption = figure && figure.querySelector("figcaption");
          openImage(link.href, img.alt, caption ? caption.textContent.trim() : "");
        });
      });
    }
  }

  /* "At a glance" values such as SHA-256 hashes get a copy button. */
  all(".glance [data-copy]").forEach(function (value) {
    var text = value.textContent.trim();
    value.appendChild(makeCopyButton(function () { return text; }, "Copy " + value.getAttribute("data-copy"), ""));
  });

  /* Share: copy the article link. */
  all("[data-copy-link]").forEach(function (button) {
    button.addEventListener("click", function () {
      copyText(button.getAttribute("data-copy-link")).then(function (ok) {
        announce(ok ? "Link copied" : "Copy failed");
        if (!ok) return;
        button.classList.add("is-copied");
        window.setTimeout(function () { button.classList.remove("is-copied"); }, 2000);
      });
    });
  });

  /* ---- Table of contents ---------------------------------------------------- */

  all(".toc--inline").forEach(function (details) {
    details.addEventListener("click", function (event) {
      if (event.target.closest("a")) details.open = false;
    });
  });

  var tocLinks = all(".toc a[href^='#']").filter(function (link) { return link.hash.length > 1; });
  if (tocLinks.length) {
    var linksById = {};
    var headings = [];
    tocLinks.forEach(function (link) {
      var id = decodeURIComponent(link.hash.slice(1));
      if (!linksById[id]) {
        linksById[id] = [];
        var heading = doc.getElementById(id);
        if (heading) headings.push(heading);
      }
      linksById[id].push(link);
    });

    var active = null;
    var ticking = false;
    var update = function () {
      ticking = false;
      var offset = parseFloat(getComputedStyle(root).scrollPaddingTop) || 90;
      var current = null;
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].getBoundingClientRect().top - offset - 8 <= 0) current = headings[i];
        else break;
      }
      if (current === active) return;
      if (active) linksById[active.id].forEach(function (link) { link.removeAttribute("aria-current"); });
      active = current;
      if (active) linksById[active.id].forEach(function (link) { link.setAttribute("aria-current", "location"); });
    };
    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }
})();
