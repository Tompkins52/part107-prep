#!/usr/bin/env node
/* Pulls shared content from the website (one directory up) into the app:
   - the question bank and practice chart
   - study modules, the certification steps, the regulations cheat sheet,
     the safety page and the resources page, as HTML fragments with links
     rewritten to app routes
   - Capacitor runtime and plugin bundles, and the bundled fonts
   Run with: npm run build */
"use strict";
const fs = require("fs");
const path = require("path");
const { parse } = require("node-html-parser");

const APP = path.resolve(__dirname, "..");
const SITE = path.resolve(APP, "..");
const WWW = path.join(APP, "www");

function read(name) { return fs.readFileSync(path.join(SITE, name), "utf8"); }
function write(rel, text) {
  const p = path.join(WWW, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
  console.log("wrote", rel, Math.round(Buffer.byteLength(text) / 1024) + " KB");
}
function copy(src, rel) {
  const p = path.join(WWW, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.copyFileSync(src, p);
  console.log("copied", rel);
}

/* Map site links to app routes */
const PAGE_ROUTES = {
  "index.html": "#/home",
  "process.html": "#/path",
  "study.html": "#/study",
  "study-regulations.html": "#/study/regulations",
  "study-airspace.html": "#/study/airspace",
  "study-weather.html": "#/study/weather",
  "study-performance.html": "#/study/performance",
  "study-operations.html": "#/study/operations",
  "regulations.html": "#/ref/regs",
  "safety.html": "#/ref/safety",
  "resources.html": "#/ref/resources",
  "exam.html": "#/exam",
  "privacy.html": "#/privacy"
};

function rewriteLinks(root, selfRoute) {
  root.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (/^https?:/i.test(href) || /^mailto:/i.test(href)) {
      a.setAttribute("class", ((a.getAttribute("class") || "") + " ext").trim());
      return;
    }
    const [pathPart, hash] = href.split("#");
    const [file, query] = pathPart.split("?");
    if (file === "" && hash) {
      a.setAttribute("href", selfRoute + "/" + hash);
      return;
    }
    let route = PAGE_ROUTES[file];
    if (!route) return;
    if (query) {
      const q = new URLSearchParams(query);
      if (q.get("topic")) route = "#/exam/topic/" + q.get("topic");
      else if (q.get("mode") === "full") route = "#/exam/full";
    }
    if (hash) route += "/" + hash;
    a.setAttribute("href", route);
  });
  root.querySelectorAll("img[src]").forEach((img) => {
    img.setAttribute("src", img.getAttribute("src").replace(/^assets\/img\//, "img/"));
    img.setAttribute("loading", "lazy");
  });
}

function stripCtas(root) {
  /* Remove the "Quiz this module / Next" button paragraphs; the app renders its own */
  root.querySelectorAll("p").forEach((p) => {
    if (p.querySelector("a.btn") && p.querySelectorAll("a").length === p.querySelectorAll("a.btn").length) p.remove();
  });
}

function textOf(el) { return el ? el.text.replace(/\s+/g, " ").trim() : ""; }

/* ---------- Study modules ---------- */
const MODULES = [
  { id: "regulations", file: "study-regulations.html", cat: "regulations", title: "Regulations", weight: "15 to 25%", minutes: 25 },
  { id: "airspace", file: "study-airspace.html", cat: "airspace", title: "Airspace and chart reading", weight: "15 to 25%", minutes: 35 },
  { id: "weather", file: "study-weather.html", cat: "weather", title: "Weather", weight: "11 to 16%", minutes: 30 },
  { id: "performance", file: "study-performance.html", cat: "loading", title: "Loading and performance", weight: "7 to 11%", minutes: 15 },
  { id: "operations", file: "study-operations.html", cat: "operations", title: "Operations", weight: "35 to 45%", minutes: 35 }
];

function extractArticle(file, selfRoute) {
  const root = parse(read(file));
  const head = root.querySelector(".section-head");
  const intro = textOf(head.querySelectorAll("p").find((p) => !p.classList.contains("kicker")));
  const prose = root.querySelector(".prose");
  stripCtas(prose);
  rewriteLinks(prose, selfRoute);
  const sections = root.querySelectorAll(".toc a").map((a) => ({ id: a.getAttribute("href").slice(1), title: textOf(a) }));
  return { intro, sections, html: prose.innerHTML.trim() };
}

const modules = MODULES.map((m, i) => {
  const art = extractArticle(m.file, "#/study/" + m.id);
  return Object.assign({ num: i + 1 }, m, art);
});

/* ---------- Reference pages ---------- */
const references = [];
{
  const root = parse(read("regulations.html"));
  const wrap = root.querySelector("main .wrap");
  const intro = textOf(wrap.querySelector(".section-head p:not(.kicker)"));
  wrap.querySelector(".section-head").remove();
  stripCtas(wrap);
  rewriteLinks(wrap, "#/ref/regs");
  wrap.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
  references.push({ id: "regs", title: "Part 107 cheat sheet", short: "Regulations", intro, html: wrap.innerHTML.trim(),
    sections: wrap.querySelectorAll("h2").map((h, i) => { const id = "sec" + i; h.setAttribute("id", id); return { id, title: textOf(h) }; }) });
  references[references.length - 1].html = wrap.innerHTML.trim();
}
{
  const art = extractArticle("safety.html", "#/ref/safety");
  references.push(Object.assign({ id: "safety", title: "Safety", short: "Safety" }, art));
}
{
  const root = parse(read("resources.html"));
  const wrap = root.querySelector("main .wrap");
  const intro = textOf(wrap.querySelector(".section-head p:not(.kicker)"));
  wrap.querySelector(".section-head").remove();
  rewriteLinks(wrap, "#/ref/resources");
  wrap.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
  wrap.querySelectorAll(".url").forEach((el) => el.remove());
  references.push({ id: "resources", title: "Resources and links", short: "Resources", intro, html: wrap.innerHTML.trim(), sections: [] });
}

/* ---------- Certification steps ---------- */
const steps = [];
let checklist = [];
let faq = "";
{
  const root = parse(read("process.html"));
  rewriteLinks(root, "#/path");
  const STEP_IDS = ["eligibility", "ftn", "study", "schedule", "test", "iacra", "tsa", "card", "register", "recurrent"];
  root.querySelectorAll("ol.steps > li").forEach((li, i) => {
    const body = li.querySelectorAll(":scope > div").find((d) => !d.classList.contains("num"));
    const h3 = body.querySelector("h3");
    const title = textOf(h3);
    h3.remove();
    const metaEl = body.querySelector("p.meta");
    const meta = textOf(metaEl);
    if (metaEl) metaEl.remove();
    steps.push({ id: STEP_IDS[i] || "step" + (i + 1), num: i + 1, title, meta, html: body.innerHTML.trim() });
  });
  const panels = root.querySelectorAll(".panel");
  checklist = panels[0].querySelectorAll("ul.checklist li").map((li) => textOf(li));
  const faqPanel = panels[1];
  faqPanel.querySelector("h3").remove();
  faq = faqPanel.innerHTML.trim();
}

/* ---------- Write content.js ---------- */
const content = { generated: new Date().toISOString().slice(0, 10), modules, references, steps, checklist, faq };
write("js/content.js", "/* Generated by scripts/sync-content.js from the website. Do not edit by hand. */\nwindow.P107_CONTENT = " + JSON.stringify(content) + ";\n");

/* ---------- Question bank and chart ---------- */
const bank = read("assets/js/bank.js").replace(/assets\/img\//g, "img/");
write("js/bank.js", bank);
copy(path.join(SITE, "assets/img/practice-chart.svg"), "img/practice-chart.svg");

/* ---------- Capacitor runtime and plugins ---------- */
const NM = path.join(APP, "node_modules", "@capacitor");
copy(path.join(NM, "core/dist/capacitor.js"), "js/cap/core.js");
["preferences", "browser", "clipboard", "share", "status-bar", "app", "splash-screen", "haptics"].forEach((p) => {
  copy(path.join(NM, p, "dist/plugin.js"), "js/cap/" + p + ".js");
});

/* ---------- Fonts ---------- */
const FS = path.join(APP, "node_modules", "@fontsource");
[["barlow", "barlow-latin-400-normal.woff2"], ["barlow", "barlow-latin-500-normal.woff2"], ["barlow", "barlow-latin-600-normal.woff2"], ["barlow", "barlow-latin-700-normal.woff2"],
 ["barlow-condensed", "barlow-condensed-latin-600-normal.woff2"], ["barlow-condensed", "barlow-condensed-latin-700-normal.woff2"]].forEach(([pkg, f]) => {
  copy(path.join(FS, pkg, "files", f), "fonts/" + f);
});
copy(path.join(FS, "barlow", "LICENSE"), "fonts/LICENSE-Barlow.txt");

console.log("done:", modules.length, "modules,", references.length, "references,", steps.length, "steps");
