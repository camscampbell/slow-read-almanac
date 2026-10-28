/* The Slow Read Almanac — static version.
   The reads live in reads.json. To add or change a read, edit that file. */
(function () {
  "use strict";

  /* ---------- settings ---------- */
  // Link to an online submission form (Tally, Google Forms…). Leave empty to use the copy-and-send slip.
  var SUBMIT_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdxfRhVBb9b0DbxxCIZ7ptXuUHJmlKEt3xxy9KrmCaUSUD65A/viewform";
  var HOME = "https://camscampbellreads.substack.com";

  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var FREQ = { weekly: "Weekly", fortnightly: "Fortnightly", daily: "Daily", monthly: "Monthly", other: "Other" };
  var ACCESS_LABEL = { free: "Free", mixed: "Free with paid extras", paid: "Paid only" };
  var STATUS_LABEL = { progress: "In progress", soon: "Starting soon", upcoming: "Upcoming", finished: "Finished" };

  var state = { reads: [] };
  var reads = [];
  var today = new Date(); today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var ui = { status: "all", lang: "all", pub: "all", access: "all", q: "" };
  try { var saved = JSON.parse(localStorage.getItem("almanac-filters") || "null"); if (saved) ui = Object.assign(ui, saved); } catch (e) {}

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function parseD(s) { var p = String(s || "").split("-"); return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function fmt(d) { return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function compact(d) { return iso(d).replace(/-/g, ""); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "read"; }
  function langs() { var seen = []; reads.forEach(function (r) { var l = (r.lang || "Other").trim(); if (seen.indexOf(l) < 0) seen.push(l); }); return seen; }
  function pubs() { var seen = {}; reads.forEach(function (r) { var k = (r.publication || r.host || "").trim(); if (!k) return; if (!seen[k]) seen[k] = { name: k, host: (r.host || "").trim(), n: 0 }; seen[k].n++; }); return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b); }).map(function (k) { return seen[k]; }); }
  var LANG_SLOT = { "English": 1, "Russian": 2, "French": 3, "Spanish": 4, "Italian": 5, "Japanese": 6, "Chinese": 7, "Latin": 8, "German and French": 9, "Dutch and French": 10, "German": 11, "Ancient Greek": 12 };
  function langColor(l) {
    var k = (l || "Other").trim(), n = LANG_SLOT[k];
    if (!n) { var h = 0; for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0; n = h % 12 + 1; }
    return "var(--lang-" + n + ")";
  }
  function isOpen(r) { return !r.end; }
  function endOf(r) { return r.end ? parseD(r.end) : addDays(today, 3650); }
  function endLabel(r) { return r.end ? fmt(parseD(r.end)) : "ongoing"; }
  function status(r) {
    var s = parseD(r.start), e = endOf(r);
    if (e < today) return "finished";
    if (s > today) return daysBetween(today, s) <= 30 ? "soon" : "upcoming";
    return "progress";
  }
  function saveUi() { try { localStorage.setItem("almanac-filters", JSON.stringify(ui)); } catch (e) {} }
  function filtered() {
    var q = ui.q.trim().toLowerCase();
    return reads.filter(function (r) {
      var st = status(r);
      if (ui.status === "progress" && st !== "progress") return false;
      if (ui.status === "upcoming" && st !== "soon" && st !== "upcoming") return false;
      if (ui.status === "finished" && st !== "finished") return false;
      if (ui.lang !== "all" && (r.lang || "Other").trim() !== ui.lang) return false;
      if (ui.access !== "all" && r.access !== ui.access) return false;
      if (ui.pub !== "all" && (r.publication || r.host || "").trim() !== ui.pub) return false;
      if (q && [r.title, r.author, r.host, r.publication, r.translation, r.series].join(" ").toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function progressOf(r) {
    var s = parseD(r.start), e = parseD(r.end);
    if (isOpen(r)) return { label: "Week " + (Math.floor(daysBetween(s, today) / 7) + 1) + ", no fixed end", pct: null };
    var totalW = Math.floor(daysBetween(s, e) / 7) + 1;
    var curW = Math.min(totalW, Math.floor(daysBetween(s, today) / 7) + 1);
    var pct = Math.max(0, Math.min(100, daysBetween(s, today) / Math.max(1, daysBetween(s, e)) * 100));
    if (r.freq === "daily") return { label: "Day " + (daysBetween(s, today) + 1) + " of " + (daysBetween(s, e) + 1), pct: pct };
    return { label: (r.freq === "weekly" ? "Instalment " : "Week ") + curW + " of " + totalW, pct: pct };
  }
  var el = function (id) { return document.getElementById(id); };

  /* ---------- scaffold ---------- */
  function scaffold() {
    el("app").innerHTML =
      '<header class="mast">' +
        '<div class="mast-name"><p class="eyebrow">A shared calendar of Substack slow reads</p><h1>The Slow Read Almanac</h1>' +
        '<p>Long, patient reads of big books, one instalment at a time. Find a read to join, add it to your own calendar, or tell us about one you are hosting.</p></div>' +
        '<dl class="mast-stamp" id="stamp"></dl>' +
        '<div class="mast-actions"><a class="btn" href="#submit" id="go-submit">Submit a slow read</a><button class="btn ghost" id="ics-all" type="button">Download all as .ics</button>' +
        '<div class="seg theme-seg" role="group" aria-label="Colour theme"><button type="button" data-theme-pick="auto">Auto</button><button type="button" data-theme-pick="light">Light</button><button type="button" data-theme-pick="dark">Dark</button></div></div>' +
      '</header>' +
      '<section aria-labelledby="tl-h"><div class="section-head"><h2 id="tl-h">The year in reads</h2><div class="filters" id="filters"></div></div>' +
        '<div class="tl-scroll" id="timeline"></div><div class="legend" id="legend"></div></section>' +
      '<section aria-labelledby="list-h"><div class="section-head"><h2 id="list-h">All reads</h2><p class="eyebrow" id="count"></p></div><div id="list"></div></section>' +
      '<section id="submit" class="slip" aria-labelledby="slip-h"></section>' +
      '<footer>Calendar last updated <span class="mono">' + esc(state.updated ? fmt(parseD(state.updated)) : "") + '</span>. Kept by Cams Campbell of <a href="' + HOME + '" target="_blank" rel="noopener">Cams Campbell Reads</a>.</footer>';
  }

  /* ---------- render ---------- */
  function renderStamp() {
    var prog = reads.filter(function (r) { return status(r) === "progress"; }).length;
    var soon = reads.filter(function (r) { return status(r) === "soon"; }).length;
    el("stamp").innerHTML =
      "<dt>Today</dt><dd>" + fmt(today) + "</dd>" +
      "<dt>In progress</dt><dd>" + prog + "</dd>" +
      "<dt>Starting in 30 days</dt><dd>" + soon + "</dd>" +
      "<dt>Listed</dt><dd>" + reads.length + "</dd>";
  }
  function renderFilters() {
    var segs = [["all", "All"], ["progress", "In progress"], ["upcoming", "Upcoming"], ["finished", "Finished"]];
    var opts = ['<option value="all">All languages</option>'].concat(langs().map(function (l) { return '<option value="' + esc(l) + '"' + (ui.lang === l ? " selected" : "") + ">" + esc(l) + "</option>"; }));
    el("filters").innerHTML =
      '<div class="seg" role="group" aria-label="Status">' + segs.map(function (s) { return '<button type="button" data-status="' + s[0] + '" aria-pressed="' + (ui.status === s[0]) + '">' + s[1] + "</button>"; }).join("") + "</div>" +
      '<label class="field-inline" for="f-langsel">Original language <select id="f-langsel">' + opts.join("") + "</select></label>" +
      '<label class="field-inline" for="f-pubsel">Substack <select id="f-pubsel"><option value="all">All Substacks</option>' + pubs().map(function (p) { return '<option value="' + esc(p.name) + '"' + (ui.pub === p.name ? " selected" : "") + ">" + esc(p.name + (p.host && p.host !== p.name ? " (" + p.host + ")" : "")) + " · " + p.n + "</option>"; }).join("") + "</select></label>" +
      '<label class="field-inline" for="f-accesssel">Access <select id="f-accesssel"><option value="all">Any</option>' + ["free", "mixed", "paid"].map(function (k) { return '<option value="' + k + '"' + (ui.access === k ? " selected" : "") + ">" + ACCESS_LABEL[k] + "</option>"; }).join("") + "</select></label>" +
      '<input type="search" id="f-search" placeholder="Search title, author, host" aria-label="Search reads" value="' + esc(ui.q) + '">';
  }
  function renderTimeline(list) {
    var box = el("timeline");
    if (!list.length) { box.innerHTML = '<p class="empty">No reads match these filters yet.</p>'; el("legend").innerHTML = ""; return; }
    var min = today, max = today;
    list.forEach(function (r) { var s = parseD(r.start), e = isOpen(r) ? s : parseD(r.end); if (s < min) min = s; if (e > max) max = e; });
    var from = new Date(min.getFullYear(), min.getMonth(), 1);
    var to = new Date(max.getFullYear(), max.getMonth() + 1, 1);
    if ((to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth() < 6) to = new Date(from.getFullYear(), from.getMonth() + 6, 1);
    var n = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
    function pos(d) {
      var mi = (d.getFullYear() - from.getFullYear()) * 12 + d.getMonth() - from.getMonth();
      var dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return Math.max(0, Math.min(1, (mi + (d.getDate() - 1) / dim) / n));
    }
    var head = "";
    for (var i = 0; i < n; i++) {
      var m = new Date(from.getFullYear(), from.getMonth() + i, 1);
      head += "<span>" + MONTHS[m.getMonth()] + (i === 0 || m.getMonth() === 0 ? " <b>" + m.getFullYear() + "</b>" : "") + "</span>";
    }
    var rows = list.map(function (r) {
      var s = parseD(r.start), e = isOpen(r) ? to : addDays(parseD(r.end), 1), st = status(r);
      var left = pos(s) * 100, right = e >= to ? 100 : pos(e) * 100;
      return '<div class="tl-row"><div class="tl-label"><span class="t">' + esc(r.title) + '</span><span class="h">' + esc(r.series ? r.series + " · " + (r.publication || r.host) : (r.publication || r.host)) + "</span></div>" +
        '<div class="tl-track"><button type="button" class="tl-bar ' + st + (isOpen(r) ? " open" : "") + '" data-jump="' + esc(r.id) + '" style="left:' + left.toFixed(3) + "%;width:" + Math.max(0.4, right - left).toFixed(3) + "%;--c:" + langColor(r.lang) + '" aria-label="' + esc(r.title + ", " + fmt(s) + " to " + endLabel(r)) + '" title="' + esc(r.title + " · " + fmt(s) + " – " + endLabel(r)) + '"></button></div></div>';
    }).join("");
    box.innerHTML = '<div class="tl" style="--months:' + n + '"><div class="tl-row tl-head"><div class="tl-label"><span class="h">Read</span></div><div class="tl-months">' + head +
      (today >= from && today < to ? '<i class="tl-now" style="left:' + (pos(today) * 100).toFixed(3) + '%"><span>Today</span></i>' : "") + "</div></div>" + rows +
      (today >= from && today < to ? '<div class="tl-today" style="--p:' + pos(today).toFixed(4) + '"></div>' : "") + "</div>";
    var used = []; list.forEach(function (r) { var l = (r.lang || "Other").trim(); if (used.indexOf(l) < 0) used.push(l); });
    el("legend").innerHTML = used.map(function (l) { return '<span class="dot" style="--c:' + langColor(l) + '">' + esc(l) + "</span>"; }).join("") + "<span>Faded bars have finished.</span>";
    var tp = pos(today);
    requestAnimationFrame(function () { if (box.scrollWidth > box.clientWidth) box.scrollLeft = Math.max(0, tp * box.scrollWidth - box.clientWidth * 0.35); });
  }
  function card(r) {
    var st = status(r), s = parseD(r.start), e = isOpen(r) ? s : parseD(r.end), url = safeUrl(r.url);
    var p = st === "progress" ? progressOf(r) : null;
    var gcal = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent("Slow read: " + r.title + (r.publication ? " (" + r.publication + ")" : "")) +
      "&dates=" + compact(s) + "/" + compact(addDays(e, 1)) + "&details=" + encodeURIComponent([r.cadence, url].filter(Boolean).join("\n"));
    return '<article class="card" id="r-' + esc(r.id) + '" style="--c:' + langColor(r.lang) + '">' +
      '<div class="card-top"><span class="chips"><span class="pill ' + st + '">' + STATUS_LABEL[st] + "</span>" + (ACCESS_LABEL[r.access] ? '<span class="access ' + r.access + '">' + ACCESS_LABEL[r.access] + "</span>" : "") + '</span><span class="dot" style="--c:' + langColor(r.lang) + '">' + esc(r.lang || "Other") + "</span></div>" +
      (r.series ? '<p class="eyebrow">' + esc(r.series) + "</p>" : "") + "<h3>" + esc(r.title) + "</h3>" +
      '<p class="byline">' + esc(r.author) + (r.translation ? " · translated by " + esc(r.translation) : "") + "</p>" +
      "<p>" + (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(r.publication || url) + "</a>" : esc(r.publication)) + (r.host ? " · hosted by " + esc(r.host) : "") + "</p>" +
      '<p class="dates">' + fmt(s) + " → " + endLabel(r) + "</p>" +
      (r.cadence || FREQ[r.freq] ? '<p class="cadence">' + esc(r.cadence || FREQ[r.freq]) + "</p>" : "") +
      (p ? (p.pct === null ? "" : '<div class="prog" aria-hidden="true"><i style="width:' + p.pct.toFixed(1) + '%"></i></div>') + '<p class="prog-label">' + p.label + "</p>" : "") +
      (r.notes ? '<p class="notes">' + esc(r.notes) + "</p>" : "") +
      '<div class="card-actions"><a class="btn-sm" href="' + gcal + '" target="_blank" rel="noopener">Add to Google Calendar</a>' +
      '<button type="button" class="btn-sm" data-ics="' + esc(r.id) + '">Download .ics</button></div></article>';
  }
  function renderList(list) {
    el("count").textContent = list.length + (list.length === 1 ? " read" : " reads");
    if (!list.length) { el("list").innerHTML = '<p class="empty">Nothing here yet. Clear the filters, or submit a read you are hosting.</p>'; return; }
    var groups = [["progress", "In progress"], ["soon", "Starting in the next 30 days"], ["upcoming", "Later"], ["finished", "Finished"]];
    el("list").innerHTML = groups.map(function (g) {
      var items = list.filter(function (r) { return status(r) === g[0]; });
      if (!items.length) return "";
      return '<div class="group"><h3 class="group-title">' + g[1] + '</h3><div class="cards">' + items.map(card).join("") + "</div></div>";
    }).join("");
  }
  function renderAll() { var list = filtered(); renderStamp(); renderTimeline(list); renderList(list); }

  /* ---------- submission slip ---------- */
  var FIELDS = ["title", "author", "lang", "translation", "series", "host", "publication", "url", "start", "end", "freq", "cadence", "notes", "contact"];
  function renderSlip() {
    var intro = '<div class="slip-intro"><p class="eyebrow">Submission slip</p><h2 id="slip-h">Hosting a slow read?</h2>' +
      "<p>Tell us about a slow read running on Substack. Every submission is checked by hand before it appears on the calendar.</p>" +
      "<p>The almanac only lists reads that run on a Substack publication. Reads hosted on other websites or blogs are not included.</p>" +
      "<p>Give the exact start and end dates of your schedule, and a link to your announcement post if you have one.</p></div>";
    if (SUBMIT_FORM_URL) {
      el("submit").innerHTML = intro + '<div><p>Submissions go through a short Google Form. It takes about two minutes, and your contact details are only seen by Cams.</p><p><a class="btn" href="' + esc(SUBMIT_FORM_URL) + '" target="_blank" rel="noopener">Open the submission form</a></p></div>';
      return;
    }
    el("submit").innerHTML = intro +
      '<form class="grid" id="slip-form" novalidate>' +
        '<label for="f-title">Book title<input id="f-title" required autocomplete="off"></label>' +
        '<label for="f-author">Author<input id="f-author" required autocomplete="off"></label>' +
        '<label for="f-lang">Original language<input id="f-lang" list="lang-list" placeholder="Russian" autocomplete="off"></label>' +
        '<label for="f-translation">Translation <small>(optional)</small><input id="f-translation" placeholder="e.g. Rosamund Bartlett" autocomplete="off"></label>' +
        '<label class="wide" for="f-series">Series or read-along name <small>(optional, e.g. Wolf Crawl)</small><input id="f-series" autocomplete="off"></label>' +
        '<label for="f-host">Host<input id="f-host" required autocomplete="off"></label>' +
        '<label for="f-publication">Substack name<input id="f-publication" required autocomplete="off"></label>' +
        '<label class="wide" for="f-url">Link to the Substack or announcement post<input id="f-url" type="url" required placeholder="https://yourname.substack.com/p/..."></label>' +
        '<label for="f-start">First instalment<input id="f-start" type="date" required></label>' +
        '<label for="f-end">Last instalment<input id="f-end" type="date" required></label>' +
        '<label for="f-freq">How often<select id="f-freq"><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="daily">Daily</option><option value="monthly">Monthly</option><option value="other">Other</option></select></label>' +
        '<label for="f-cadence">Schedule in your words <small>(optional)</small><input id="f-cadence" placeholder="Two chapters every Sunday" autocomplete="off"></label>' +
        '<label class="wide" for="f-notes">Anything readers should know <small>(optional)</small><textarea id="f-notes" rows="2"></textarea></label>' +
        '<label class="wide" for="f-contact">How Cams can reach you <small>(Substack handle or email)</small><input id="f-contact" autocomplete="off"></label>' +
        '<div class="form-actions"><button class="btn" type="submit">Prepare my submission</button><span class="msg" id="f-msg" role="status"></span></div>' +
        '<div class="copybox" id="copybox" hidden></div>' +
      "</form>" +
      '<datalist id="lang-list">' + ["Russian", "English", "French", "German", "Italian", "Spanish", "Japanese", "Ancient Greek", "Latin"].concat(langs()).filter(function (v, i, a) { return a.indexOf(v) === i; }).map(function (l) { return '<option value="' + esc(l) + '">'; }).join("") + "</datalist>";
    el("slip-form").addEventListener("submit", onSubmit);
  }
  function setMsg(t, kind) { var m = el("f-msg"); m.textContent = t; m.className = "msg" + (kind ? " " + kind : ""); }
  function onSubmit(ev) {
    ev.preventDefault();
    var v = {}; FIELDS.forEach(function (k) { v[k] = (el("f-" + k).value || "").trim(); });
    var missing = ["title", "author", "host", "publication", "url", "start", "end"].filter(function (k) { return !v[k]; });
    if (missing.length) { setMsg("Fill in the " + missing.map(function (k) { return { title: "book title", author: "author", host: "host", publication: "Substack name", url: "link", start: "first instalment date", end: "last instalment date" }[k]; }).join(", ") + ".", "err"); return; }
    if (!/^https:\/\//i.test(v.url)) { setMsg("The link needs to start with https://", "err"); return; }
    if (v.end < v.start) { setMsg("The last instalment is before the first. Check the dates.", "err"); return; }
    setMsg("");
    var text = ["Slow read submission for The Slow Read Almanac", "", "Book: " + v.title, "Author: " + v.author, "Original language: " + (v.lang || "-"), "Translation: " + (v.translation || "-"),
      "Series: " + (v.series || "-"), "Host: " + v.host, "Substack: " + v.publication, "Link: " + v.url, "First instalment: " + v.start, "Last instalment: " + v.end,
      "How often: " + (FREQ[v.freq] || v.freq), "Schedule: " + (v.cadence || "-"), "Notes: " + (v.notes || "-"), "Contact: " + (v.contact || "-")].join("\n");
    var box = el("copybox"); box.hidden = false;
    box.innerHTML = '<p><strong>Your submission is ready.</strong> Copy the details below and send them to Cams as a comment or message on ' +
      '<a href="' + HOME + '" target="_blank" rel="noopener">Cams Campbell Reads</a>.</p><pre id="copytext">' + esc(text) + "</pre>" +
      '<div><button type="button" class="btn-sm" id="copy-btn">Copy details</button> <span class="msg" id="copy-msg" role="status"></span></div>';
    el("copy-btn").addEventListener("click", function () {
      function selectCopy() { var r = document.createRange(); r.selectNodeContents(el("copytext")); var s = getSelection(); s.removeAllRanges(); s.addRange(r); el("copy-msg").textContent = "Selected. Press Ctrl+C or Cmd+C to copy."; }
      try { navigator.clipboard.writeText(text).then(function () { el("copy-msg").textContent = "Copied."; }, selectCopy); } catch (e) { selectCopy(); }
    });
  }

  /* ---------- .ics ---------- */
  function icsEscape(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
  function icsEvents(r) {
    var s = parseD(r.start), e = isOpen(r) ? s : parseD(r.end), stamp = compact(today) + "T000000Z";
    var desc = icsEscape([(r.series ? r.series + ": " : "") + r.author + (r.translation ? ", translated by " + r.translation : ""), r.cadence, r.url].filter(Boolean).join("\n"));
    var out = ["BEGIN:VEVENT", "UID:" + r.id + "@slow-read-almanac", "DTSTAMP:" + stamp, "DTSTART;VALUE=DATE:" + compact(s), "DTEND;VALUE=DATE:" + compact(addDays(e, 1)),
      "SUMMARY:" + icsEscape("Slow read: " + r.title + (r.publication ? " (" + r.publication + ")" : "")), "DESCRIPTION:" + desc, "TRANSP:TRANSPARENT", "END:VEVENT"];
    if (r.freq === "weekly" || r.freq === "fortnightly") {
      out = out.concat(["BEGIN:VEVENT", "UID:" + r.id + "-instalments@slow-read-almanac", "DTSTAMP:" + stamp, "DTSTART;VALUE=DATE:" + compact(s), "DTEND;VALUE=DATE:" + compact(addDays(s, 1)),
        "RRULE:FREQ=WEEKLY;INTERVAL=" + (r.freq === "weekly" ? 1 : 2) + (isOpen(r) ? "" : ";UNTIL=" + compact(e)), "SUMMARY:" + icsEscape(r.title + ": new instalment"), "DESCRIPTION:" + desc, "TRANSP:TRANSPARENT", "END:VEVENT"]);
    }
    return out;
  }
  function saveIcs(list, name) {
    var text = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Slow Read Almanac//EN", "CALSCALE:GREGORIAN"].concat([].concat.apply([], list.map(icsEvents))).concat(["END:VCALENDAR"]).join("\r\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/calendar" }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("button, a"); if (!t) return;
    if (t.dataset.themePick) { setTheme(t.dataset.themePick); return; }
    if (t.dataset.status) { ui.status = t.dataset.status; saveUi(); renderFilters(); renderAll(); return; }
    if (t.dataset.jump) { var c = el("r-" + t.dataset.jump); if (c) { c.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" }); c.classList.add("flash"); setTimeout(function () { c.classList.remove("flash"); }, 1600); } return; }
    if (t.dataset.ics) { var r = reads.find(function (x) { return x.id === t.dataset.ics; }); if (r) saveIcs([r], slug(r.title) + ".ics"); return; }
    if (t.id === "ics-all") { saveIcs(filtered(), "slow-reads.ics"); return; }
  });
  document.addEventListener("change", function (ev) { if (ev.target.id === "f-langsel") { ui.lang = ev.target.value; saveUi(); renderAll(); }
    if (ev.target.id === "f-accesssel") { ui.access = ev.target.value; saveUi(); renderAll(); }
    if (ev.target.id === "f-pubsel") { ui.pub = ev.target.value; saveUi(); renderAll(); } });
  document.addEventListener("input", function (ev) { if (ev.target.id === "f-search") { ui.q = ev.target.value; saveUi(); renderAll(); } });

  /* ---------- theme ---------- */
  function currentTheme() { try { return localStorage.getItem("almanac-theme") || "auto"; } catch (e) { return "auto"; } }
  function setTheme(choice) {
    if (choice === "light" || choice === "dark") document.documentElement.setAttribute("data-theme", choice);
    else document.documentElement.removeAttribute("data-theme");
    try { if (choice === "auto") localStorage.removeItem("almanac-theme"); else localStorage.setItem("almanac-theme", choice); } catch (e) {}
    document.querySelectorAll("[data-theme-pick]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.themePick === choice)); });
  }

  /* ---------- boot ---------- */
  fetch("reads.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (data) {
    state = data || { reads: [] };
    reads = (state.reads || []).slice().sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
    if (ui.lang !== "all" && langs().indexOf(ui.lang) < 0) ui.lang = "all";
  if (ui.pub !== "all" && !pubs().some(function (p) { return p.name === ui.pub; })) ui.pub = "all";
    scaffold(); setTheme(currentTheme()); renderFilters(); renderAll(); renderSlip();
  }).catch(function () {
    el("app").innerHTML = '<p class="empty">The calendar could not be loaded. Refresh the page to try again.</p>';
  });
})();
