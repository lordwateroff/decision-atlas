(function () {
  "use strict";
  const views = Array.from(document.querySelectorAll(".view"));
  const pager = document.getElementById("pager");
  const sheetno = document.getElementById("sheetno");
  const printAll = document.documentElement.classList.contains("print-all");
  const store = {
    get() { try { return JSON.parse(localStorage.getItem("atlas-read") || "[]"); } catch (e) { return []; } },
    add(id) { try { const v = new Set(this.get()); v.add(id); localStorage.setItem("atlas-read", JSON.stringify([...v])); } catch (e) {} }
  };
  const order = ["top", "intro", "ch-01", "ch-02", "ch-03", "ch-04", "ch-05", "ch-06", "ch-07", "ch-08", "ch-09", "ch-10", "ch-11", "glossary", "sources", "disclosure"];
  const titles = { top: "Cover", intro: "Introduction", glossary: "Glossary", sources: "Sources", disclosure: "AI-use disclosure" };
  const titleOf = (id) => titles[id] || "Chapter " + Number(id.slice(3)) + ", " + document.getElementById(id).querySelector("h2").textContent;

  function markMap() {
    const read = new Set(store.get());
    document.querySelectorAll("#map a").forEach((a) => {
      const id = a.getAttribute("href").slice(1);
      a.querySelector(".stop").classList.toggle("is-read", read.has(id));
    });
    let n = 0;
    for (let k = 1; k <= 11; k++) if (read.has("ch-" + String(k).padStart(2, "0"))) n = k; else break;
    const route = document.querySelector("#map .dash");
    const done = document.getElementById("route-done");
    if (route && done) {
      const pts = route.getAttribute("points").split(" ");
      done.setAttribute("points", pts.slice(0, Math.max(n, 1)).join(" "));
      done.style.display = n >= 2 ? "" : "none";
    }
  }

  function show(hash, focus) {
    if (printAll) return;
    let target = hash ? document.getElementById(hash) : null;
    let view = target ? target.closest(".view") : null;
    if (!view) { view = views[0]; target = null; }
    views.forEach((v) => v.classList.toggle("is-active", v === view));
    sheetno.textContent = view.dataset.sheet || "";
    if (view.id.startsWith("ch-")) store.add(view.id);
    markMap();
    const i = order.indexOf(view.id);
    pager.replaceChildren();
    if (i > 0) pager.append(link(order[i - 1], "Previous: " + titleOf(order[i - 1])));
    if (i < order.length - 1) pager.append(link(order[i + 1], "Next: " + titleOf(order[i + 1]), true));
    if (target && target !== view) target.scrollIntoView();
    else window.scrollTo(0, 0);
    if (focus) {
      const head = view.querySelector("h1, h2");
      if (head && !(target && target !== view)) { head.setAttribute("tabindex", "-1"); head.focus({ preventScroll: true }); }
    }
  }

  function link(id, text, primary) {
    const a = document.createElement("a");
    a.href = "#" + id;
    a.className = "btn" + (primary ? " btn--primary" : "");
    a.textContent = text;
    return a;
  }

  window.addEventListener("hashchange", () => show(location.hash.slice(1), true));
  show(location.hash.slice(1), false);

  document.querySelectorAll(".quizset").forEach((set) => {
    const quizzes = Array.from(set.querySelectorAll(".quiz"));
    const score = set.querySelector(".score");
    const reset = set.querySelector(".quiz-reset");
    const total = quizzes.length;
    function tally() {
      const done = quizzes.filter((q) => q.dataset.picked !== undefined);
      const right = done.filter((q) => q.dataset.picked === q.dataset.answer).length;
      score.textContent = done.length ? right + " of " + done.length + " correct" + (done.length < total ? ", " + (total - done.length) + " to go" : "") : total + " questions";
      reset.hidden = !done.length;
    }
    quizzes.forEach((q) => {
      const opts = Array.from(q.querySelectorAll(".opt"));
      const why = q.querySelector(".why");
      const answer = Number(q.dataset.answer);
      why.id = "why-" + Math.random().toString(36).slice(2, 8);
      why.setAttribute("aria-live", "polite");
      const verdict = document.createElement("span");
      verdict.className = "verdict";
      why.prepend(verdict);
      opts.forEach((b, i) => {
        b.setAttribute("aria-describedby", why.id);
        b.addEventListener("click", () => {
          if (q.dataset.picked !== undefined) return;
          q.dataset.picked = String(i);
          opts.forEach((o, k) => {
            o.classList.toggle("is-right", k === answer);
            o.classList.toggle("is-wrong", k === i && i !== answer);
            o.classList.toggle("is-dim", k !== answer && k !== i);
            o.setAttribute("aria-disabled", "true");
          });
          verdict.textContent = i === answer ? "Correct" : "Not quite";
          why.classList.add("is-open");
          tally();
        });
      });
    });
    reset.addEventListener("click", () => {
      quizzes.forEach((q) => {
        delete q.dataset.picked;
        q.querySelectorAll(".opt").forEach((o) => { o.classList.remove("is-right", "is-wrong", "is-dim"); o.removeAttribute("aria-disabled"); });
        q.querySelector(".why").classList.remove("is-open");
      });
      tally();
      quizzes[0].querySelector(".opt").focus();
    });
  });

  const filter = document.getElementById("gloss-filter");
  if (filter) {
    const items = Array.from(document.querySelectorAll("#gloss-list > div"));
    const empty = document.getElementById("gloss-empty");
    filter.addEventListener("input", () => {
      const q = filter.value.trim().toLowerCase();
      let shown = 0;
      items.forEach((d) => { const on = !q || d.textContent.toLowerCase().includes(q); d.hidden = !on; if (on) shown++; });
      empty.hidden = shown > 0;
    });
  }
})();
