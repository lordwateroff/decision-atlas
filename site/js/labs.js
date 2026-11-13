(function () {
  "use strict";
  const A = window.Atlas;
  const NS = "http://www.w3.org/2000/svg";
  let uid = 0;

  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === "on") for (const ev in attrs.on) e.addEventListener(ev, attrs.on[ev]);
      else if (k === "html") e.innerHTML = attrs.html;
      else if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) e.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    }
    for (const c of kids.flat()) if (c !== null && c !== undefined) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  }

  function s(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function svg(viewBox, label) {
    return s("svg", { viewBox, role: "img", "aria-label": label });
  }

  const f = (x, d) => (x === null || x === undefined || !isFinite(x) ? "n/a" : Number(x).toFixed(d === undefined ? 3 : d));
  const pct = (x, d) => (x === null || !isFinite(x) ? "n/a" : (x * 100).toFixed(d === undefined ? 1 : d) + "%");

  function btn(text, onClick, primary) {
    return h("button", { type: "button", class: "btn btn--sm" + (primary ? " btn--primary" : ""), on: { click: onClick } }, text);
  }

  function slider(label, min, max, step, value, fmt, onInput) {
    const id = "s" + ++uid;
    const input = h("input", { type: "range", id, min, max, step, value });
    const out = h("output", { for: id }, fmt(+value));
    input.addEventListener("input", () => { out.textContent = fmt(+input.value); onInput(+input.value); });
    return {
      node: h("div", { class: "slider" }, h("label", { for: id }, label), out, input),
      get: () => +input.value,
      set(v) { input.value = v; out.textContent = fmt(+v); }
    };
  }

  function seg(label, options, value, onChange) {
    const id = "g" + ++uid;
    const buttons = options.map((o) => h("button", { type: "button", "aria-pressed": String(o.value === value), on: { click: () => { set(o.value); onChange(o.value); } } }, o.label));
    function set(v) { buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(options[i].value === v))); }
    return { node: h("div", {}, h("p", { class: "label", id }, label), h("div", { class: "seg", role: "group", "aria-labelledby": id }, buttons)), set };
  }

  function figure(svgNode, caption) {
    return h("figure", { class: "fig drawing" }, svgNode, caption ? h("figcaption", {}, caption) : null);
  }

  function readout() { return h("div", { class: "readout", "aria-live": "polite" }); }
  function setReadout(node, big, rest) { node.replaceChildren(h("span", { class: "big" }, big), ...(Array.isArray(rest) ? rest : [rest])); }

  function arrowMarker(root) {
    const id = "arr" + ++uid;
    const defs = s("defs");
    const m = s("marker", { id, viewBox: "0 0 10 10", refX: 10, refY: 5, markerWidth: 8, markerHeight: 8, orient: "auto-start-reverse" });
    m.append(s("path", { d: "M0 0 L10 5 L0 10", class: "ln" }));
    defs.append(m);
    root.append(defs);
    return "url(#" + id + ")";
  }

  const labs = {};

  labs.search = function (root) {
    const P = { S: [40, 140], A: [230, 45], B: [200, 235], C: [370, 235], G: [520, 140] };
    let mode = "A*", i = 0, run = A.search(mode);
    const g = svg("0 0 560 290", "Route graph with nodes S, A, B, C, G");
    const marker = arrowMarker(g);
    const edges = s("g"), nodes = s("g");
    g.append(edges, nodes);
    const out = readout();
    const tbody = h("tbody");
    const table = h("div", { class: "scroll-x" }, h("table", { class: "register" }, h("caption", {}, "Expansion register"), h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Step"), h("th", { scope: "col" }, "Expand"), h("th", { scope: "col" }, "g"), h("th", { scope: "col" }, "f = g + h"), h("th", { scope: "col" }, "Frontier after"))), tbody));
    const modes = seg("Search method", ["BFS", "DFS", "UCS", "A*"].map((m) => ({ label: m, value: m })), mode, (m) => { mode = m; run = A.search(m); i = 0; draw(); });
    const stepB = btn("Expand next node", () => { if (i < run.steps.length) i++; draw(); }, true);
    const runB = btn("Run to goal", () => { i = run.steps.length; draw(); });
    const resetB = btn("Reset", () => { mode = "A*"; modes.set(mode); run = A.search(mode); i = 0; draw(); });
    function draw() {
      const shown = run.steps.slice(0, i), last = shown[shown.length - 1], done = last && last.done;
      const expanded = new Set(shown.map((x) => x.state)), frontier = new Set(last ? last.frontier : ["S"]);
      const pe = new Set();
      if (done) for (let k = 1; k < last.path.length; k++) pe.add(last.path[k - 1] + last.path[k]);
      edges.replaceChildren(); nodes.replaceChildren();
      for (const a in A.graph) for (const [b, c] of A.graph[a]) {
        const [x1, y1] = P[a], [x2, y2] = P[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
        edges.append(s("line", { x1: x1 + ux * 26, y1: y1 + uy * 26, x2: x2 - ux * 26, y2: y2 - uy * 26, class: pe.has(a + b) ? "ln-heavy" : "ln", "marker-end": marker }));
        edges.append(s("text", { x: (x1 + x2) / 2 - uy * 18, y: (y1 + y2) / 2 + ux * 18 + 5, "text-anchor": "middle", class: "t-mono" }, c));
      }
      for (const st in P) {
        const [x, y] = P[st], isE = expanded.has(st), isF = !isE && frontier.has(st);
        nodes.append(s("rect", { x: x - 22, y: y - 22, width: 44, height: 44, class: isE ? "fill-ink" : "bld", style: "stroke-width:" + (isF ? 4 : 1.25) }));
        nodes.append(s("text", { x, y: y + 6, "text-anchor": "middle", class: isE ? "t-inv" : "", style: "font-family:var(--font-display);font-size:18px;font-weight:600" }, st));
        nodes.append(s("text", { x, y: y + 42, "text-anchor": "middle", class: "t-mono t-muted" }, "h " + A.heuristic[st]));
      }
      tbody.replaceChildren(...shown.map((r, k) => h("tr", { class: k === shown.length - 1 ? "now" : null }, h("td", { class: "num" }, k + 1), h("td", {}, r.state), h("td", { class: "num" }, r.g), h("td", { class: "num" }, mode === "A*" ? r.g + " + " + r.h + " = " + r.f : "not used"), h("td", {}, r.frontier.join(", ") || "empty"))));
      const rule = { BFS: "the oldest node in the queue", DFS: "the newest node on the stack", UCS: "the frontier node with the lowest g", "A*": "the frontier node with the lowest f" }[mode];
      if (done) setReadout(out, last.path.join(", "), ["Goal reached with total cost ", h("span", { class: "num" }, last.g), ". Nodes expanded: " + shown.length + "."]);
      else setReadout(out, i ? "Expanded " + last.state : "Ready at S", "Next: " + rule + ". Thick outline marks the frontier.");
      stepB.disabled = !!done; runB.disabled = !!done;
    }
    root.append(h("div", { class: "lab-grid" }, figure(g, "Edge numbers are travel costs. The small h under each node is its estimate to G."), h("div", { class: "controls" }, modes.node, h("div", { class: "row" }, stepB, runB, resetB), out, table)));
    draw();
  };

  function landscapeSvg(label) {
    const g = svg("0 0 540 250", label);
    return g;
  }

  function drawLandscape(g, opts) {
    g.replaceChildren();
    const L = A.landscape, bw = 52, gap = 8, base = 210, k = 20;
    L.forEach((v, i) => {
      const x = 20 + i * (bw + gap), y = base - v * k;
      const on = opts.visited && opts.visited.has(i);
      g.append(s("rect", { x, y, width: bw, height: v * k, class: i === opts.current ? "fill-ink" : on ? "fill-2" : "bld", style: "stroke:var(--color-ink);stroke-width:1.25" }));
      g.append(s("text", { x: x + bw / 2, y: y - 8, "text-anchor": "middle", class: "t-mono" }, v));
      g.append(s("text", { x: x + bw / 2, y: base + 22, "text-anchor": "middle", class: "t-mono t-muted" }, i));
    });
    g.append(s("line", { x1: 10, y1: base, x2: 530, y2: base, class: "ln" }));
    if (opts.current !== undefined) {
      const x = 20 + opts.current * (bw + gap) + bw / 2;
      g.append(s("text", { x, y: 24, "text-anchor": "middle", style: "font-family:var(--font-display);font-weight:600" }, "TALA"));
    }
  }

  labs.hill = function (root) {
    let start = 1, cur = 1, visited = new Set([1]), stuck = false;
    const g = landscapeSvg("Bar chart of the score landscape at positions 0 to 8");
    const out = readout();
    const starts = seg("Start position", A.landscape.map((_, i) => ({ label: String(i), value: i })), start, (v) => { start = v; restart(); });
    function restart() { cur = start; visited = new Set([start]); stuck = false; draw(); }
    function step() {
      const opts = [cur - 1, cur + 1].filter((x) => x >= 0 && x < A.landscape.length).sort((a, b) => A.landscape[b] - A.landscape[a]);
      if (!opts.length || A.landscape[opts[0]] <= A.landscape[cur]) stuck = true;
      else { cur = opts[0]; visited.add(cur); }
      draw();
    }
    const stepB = btn("Take one step", step, true);
    const climbB = btn("Climb until stuck", () => { while (!stuck) step(); });
    const resetB = btn("Reset", () => { start = 1; starts.set(1); restart(); });
    function draw() {
      drawLandscape(g, { current: cur, visited });
      const best = Math.max(...A.landscape);
      if (stuck) setReadout(out, "Stuck at " + cur, ["Score ", h("span", { class: "num" }, A.landscape[cur]), A.landscape[cur] === best ? ". This is the global maximum." : ". No neighbour is higher, but the global maximum is " + best + "."]);
      else setReadout(out, "At position " + cur, ["Score ", h("span", { class: "num" }, A.landscape[cur]), ". Neighbours: " + [cur - 1, cur + 1].filter((x) => x >= 0 && x < 9).map((x) => x + " scores " + A.landscape[x]).join(", ") + "."]);
      stepB.disabled = stuck; climbB.disabled = stuck;
    }
    root.append(h("div", { class: "lab-grid" }, figure(g, "Bar height is the score. The filled bar is TALA's position; shaded bars were visited."), h("div", { class: "controls" }, starts.node, h("div", { class: "row" }, stepB, climbB, resetB), out)));
    draw();
  };

  labs.anneal = function (root) {
    const out = readout();
    const calc = h("p", { class: "calc" });
    const T = slider("Temperature T", 0.1, 10, 0.1, 5, (v) => f(v, 1), draw);
    const dE = slider("How much worse, ΔE", 0, 6, 0.5, 2, (v) => f(v, 1), draw);
    const g = landscapeSvg("Score landscape showing the annealing run");
    const runOut = h("p", { class: "label", "aria-live": "polite" });
    const tbody = h("tbody");
    function runIt() {
      const r = A.anneal({ start: 1, T0: T.get(), cooling: 0.9, steps: 40, seed: 2 });
      const visited = new Set([1, ...r.trace.filter((t) => t.accepted).map((t) => t.to)]);
      drawLandscape(g, { current: r.best, visited });
      runOut.textContent = "Run from position 1, starting T = " + f(T.get(), 1) + ", T multiplied by 0.9 each step, 40 steps, fixed seed. Best position found: " + r.best + " with score " + r.bestScore + ".";
      tbody.replaceChildren(...r.trace.slice(0, 6).map((t) => h("tr", {}, h("td", { class: "num" }, t.step), h("td", { class: "num" }, t.from + " to " + t.to), h("td", { class: "num" }, f(t.T, 2)), h("td", { class: "num" }, f(t.deltaE, 0)), h("td", { class: "num" }, f(t.p, 3)), h("td", {}, t.accepted ? "accepted" : "rejected"))));
    }
    function draw() {
      const p = A.acceptProbability(dE.get(), T.get());
      setReadout(out, "P(accept) = " + f(p, 3), dE.get() <= 0 ? "An improving or equal move is always accepted." : "A move worse by " + f(dE.get(), 1) + " is accepted about " + Math.round(p * 100) + " times in 100.");
      calc.textContent = "exp(−" + f(dE.get(), 1) + " / " + f(T.get(), 1) + ") = exp(" + f(-dE.get() / T.get(), 3) + ") = " + f(p, 3);
    }
    const resetB = btn("Reset", () => { T.set(5); dE.set(2); draw(); runIt(); });
    root.append(h("div", { class: "lab-grid" },
      h("div", { class: "controls" }, T.node, dE.node, out, calc, h("div", { class: "row" }, btn("Run annealing on the landscape", runIt, true), resetB)),
      h("div", { class: "controls" }, figure(g, "Filled bar: best position found. Shaded bars: positions the run accepted."), runOut, h("div", { class: "scroll-x" }, h("table", { class: "register" }, h("caption", {}, "First six steps of the run"), h("thead", {}, h("tr", {}, ["Step", "Move", "T", "ΔE", "P", "Result"].map((x) => h("th", { scope: "col" }, x)))), tbody)))));
    draw(); runIt();
  };

  labs.gd = function (root) {
    const g = svg("0 0 540 300", "Loss curve L(w) = (w − 3) squared with the gradient descent steps");
    const out = readout();
    const tbody = h("tbody");
    const eta = slider("Learning rate η", 0.01, 1.2, 0.01, 0.1, (v) => f(v, 2), draw);
    const X = (w) => 30 + ((w + 3) / 12) * 480, Y = (L) => 270 - (L / 40) * 250;
    function draw() {
      const tr = A.gradientDescent(eta.get(), 0, 10);
      g.replaceChildren();
      let d = "";
      for (let w = -3; w <= 9.001; w += 0.1) d += (d ? " L" : "M") + X(w).toFixed(1) + " " + Y((w - 3) ** 2).toFixed(1);
      g.append(s("path", { d, class: "ln" }));
      g.append(s("line", { x1: 30, y1: 270, x2: 510, y2: 270, class: "ln-2" }));
      for (const w of [-3, 0, 3, 6, 9]) g.append(s("text", { x: X(w), y: 292, "text-anchor": "middle", class: "t-mono t-muted" }, "w " + w));
      const vis = tr.filter((p) => p.w >= -3 && p.w <= 9);
      for (let k = 1; k < tr.length; k++) {
        const a = tr[k - 1], b = tr[k];
        if (a.w < -3 || a.w > 9 || b.w < -3 || b.w > 9) break;
        g.append(s("line", { x1: X(a.w), y1: Y(a.loss), x2: X(b.w), y2: Y(b.loss), class: "dash" }));
      }
      vis.forEach((p, k) => g.append(s("rect", { x: X(p.w) - 5, y: Y(p.loss) - 5, width: 10, height: 10, class: k === 0 ? "bld" : "fill-ink" })));
      tbody.replaceChildren(...tr.slice(0, 6).map((p) => h("tr", {}, h("td", { class: "num" }, p.t), h("td", { class: "num" }, f(p.w, 3)), h("td", { class: "num" }, f(p.loss, 3)))));
      const e = eta.get(), factor = 1 - 2 * e;
      let verdict;
      if (Math.abs(factor) > 1) verdict = "Diverges: each step overshoots further. After 10 steps w = " + f(tr[10].w, 1) + ".";
      else if (Math.abs(Math.abs(factor) - 1) < 1e-9) verdict = factor < 0 ? "Bounces between 0 and 6 forever." : "Does not move.";
      else if (factor < 0) verdict = "Overshoots 3 on every step but the swings shrink, so it settles.";
      else verdict = "Moves steadily toward the minimum at w = 3.";
      setReadout(out, "w₁₀ = " + f(tr[10].w, 3), [verdict, " Each step multiplies the distance to 3 by 1 − 2η = " + f(factor, 2) + "."]);
    }
    const resetB = btn("Reset", () => { eta.set(0.1); draw(); });
    const presets = h("div", { class: "row" }, ...[0.1, 0.9, 1, 1.1].map((v) => btn("η = " + v, () => { eta.set(v); draw(); })), resetB);
    root.append(h("div", { class: "lab-grid" }, figure(g, "The hollow square is the start w = 0. Filled squares are the next steps; steps that leave the chart are not drawn."), h("div", { class: "controls" }, eta.node, presets, out, h("table", { class: "register" }, h("caption", {}, "First steps, w ← w − η × 2(w − 3)"), h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "t"), h("th", { scope: "col" }, "w"), h("th", { scope: "col" }, "L(w)"))), tbody))));
    draw();
  };

  labs.game = function (root) {
    let mode = "minimax";
    const def = [[3, 5], [2, 9]];
    const inputs = def.map((pair, i) => pair.map((v, j) => h("input", { type: "number", value: v, step: 1, "aria-label": "Leaf " + (j + 1) + " under " + (i ? "B" : "A"), on: { input: draw } })));
    const g = svg("0 0 540 300", "Game tree with a MAX root, two MIN nodes and four leaves");
    const out = readout();
    const modes = seg("Rule", [{ label: "Minimax", value: "minimax" }, { label: "Alpha-beta", value: "ab" }, { label: "Expectimax", value: "exp" }], mode, (m) => { mode = m; draw(); });
    function draw() {
      const L = inputs.map((p) => p.map((x) => (x.value === "" || isNaN(+x.value) ? 0 : +x.value)));
      const r = mode === "exp" ? A.expectimax(L) : mode === "ab" ? A.alphaBeta(L) : A.minimax(L);
      const pruned = mode === "ab" ? r.pruned.map((p) => p.join()) : [];
      g.replaceChildren();
      const root_ = [270, 40], mins = [[140, 140], [400, 140]], leaves = [[[80, 250], [200, 250]], [[340, 250], [460, 250]]];
      mins.forEach((m, i) => {
        g.append(s("line", { x1: root_[0], y1: root_[1] + 22, x2: m[0], y2: m[1] - 22, class: r.best === i ? "ln-heavy" : "ln" }));
        leaves[i].forEach((l, j) => {
          const pr = pruned.includes(i + "," + j);
          g.append(s("line", { x1: m[0], y1: m[1] + 22, x2: l[0], y2: l[1] - 20, class: pr ? "dash" : "ln" }));
          g.append(s("rect", { x: l[0] - 22, y: l[1] - 20, width: 44, height: 40, class: pr ? "fill-paper" : "bld", style: pr ? "stroke:var(--color-ink);stroke-dasharray:4 4" : "" }));
          g.append(s("text", { x: l[0], y: l[1] + 6, "text-anchor": "middle", class: "t-mono" }, L[i][j]));
          if (pr) g.append(s("text", { x: l[0], y: l[1] + 40, "text-anchor": "middle", class: "t-sm t-muted" }, "pruned"));
        });
        g.append(s("rect", { x: m[0] - 34, y: m[1] - 22, width: 68, height: 44, class: "bld" }));
        g.append(s("text", { x: m[0], y: m[1] - 2, "text-anchor": "middle", class: "t-sm" }, (i ? "B" : "A") + (mode === "exp" ? " chance" : " MIN")));
        g.append(s("text", { x: m[0], y: m[1] + 16, "text-anchor": "middle", class: "t-mono" }, f(r.values[i], mode === "exp" ? 1 : 0)));
      });
      g.append(s("rect", { x: root_[0] - 34, y: root_[1] - 22, width: 68, height: 44, class: "fill-ink" }));
      g.append(s("text", { x: root_[0], y: root_[1] - 2, "text-anchor": "middle", class: "t-sm t-inv" }, "MAX"));
      g.append(s("text", { x: root_[0], y: root_[1] + 16, "text-anchor": "middle", class: "t-mono t-inv" }, f(r.value, mode === "exp" ? 1 : 0)));
      const how = mode === "exp" ? "Each chance node averages its two leaves with probability 0.5." : mode === "ab" ? (r.pruned.length ? "After A, α = " + r.values[0] + ". B's first leaf gives β ≤ α, so its second leaf is never examined." : "No branch could be pruned with these values.") : "Each MIN node keeps its smaller leaf; MAX keeps the larger result.";
      setReadout(out, "Choose " + (r.best ? "B" : "A") + ", value " + f(r.value, mode === "exp" ? 1 : 0), how);
    }
    const resetB = btn("Reset", () => { inputs.forEach((p, i) => p.forEach((x, j) => (x.value = def[i][j]))); mode = "minimax"; modes.set(mode); draw(); });
    root.append(h("div", { class: "lab-grid" }, figure(g, "The thick line is the branch MAX chooses."), h("div", { class: "controls" }, modes.node, h("div", { class: "stepper" }, inputs.flatMap((p, i) => p.map((x, j) => h("label", {}, "Leaf " + (j + 1) + " under " + (i ? "B" : "A"), x)))), h("div", { class: "row" }, resetB), out)));
    draw();
  };

  labs.bellman = function (root) {
    const out = readout();
    const calc = h("div", { class: "calc" });
    const g = svg("0 0 540 150", "Bar comparison of the two action values");
    const gamma = slider("Discount factor γ", 0, 1, 0.01, 0.9, (v) => f(v, 2), draw);
    function draw() {
      const r = A.bellman(gamma.get());
      g.replaceChildren();
      const X = (v) => 140 + (v + 1) * 36;
      [["Shortcut", r.shortcut], ["Charge", r.charge]].forEach(([name, v], i) => {
        const y = 20 + i * 60;
        g.append(s("text", { x: 0, y: y + 26 }, name));
        g.append(s("rect", { x: Math.min(X(0), X(v)), y, width: Math.abs(X(v) - X(0)), height: 36, class: (i === 0 ? r.shortcut >= r.charge : r.charge > r.shortcut) ? "fill-ink" : "bld" }));
        g.append(s("text", { x: Math.max(X(v), X(0)) + 8, y: y + 25, class: "t-mono" }, f(v, 2)));
      });
      g.append(s("line", { x1: X(0), y1: 10, x2: X(0), y2: 140, class: "ln" }));
      calc.replaceChildren(h("p", {}, "Shortcut: 0.8 × 10 + 0.2 × (−5) = 7"), h("p", {}, "Charge: −1 + " + f(gamma.get(), 2) + " × 9 = " + f(r.charge, 2)));
      const win = Math.abs(r.charge - r.shortcut) < 1e-9 ? "Tie" : r.charge > r.shortcut ? "Charge wins" : "Shortcut wins";
      setReadout(out, win, "Difference: " + f(Math.abs(r.charge - r.shortcut), 2) + ". The two tie at γ = 8/9 ≈ 0.889.");
    }
    root.append(h("div", { class: "lab-grid" }, figure(g, "Filled bar: the action with the higher backed-up value."), h("div", { class: "controls" }, gamma.node, h("div", { class: "row" }, btn("Reset", () => { gamma.set(0.9); draw(); })), out, calc)));
    draw();
  };

  labs.qlearn = function (root) {
    const G = A.grid;
    let Q, random, episodes, last, sel;
    const arrows = { N: "↑", E: "→", S: "↓", W: "←" };
    const alpha = slider("Learning rate α", 0.05, 1, 0.05, 0.5, (v) => f(v, 2), () => {});
    const gamma = slider("Discount γ", 0, 0.99, 0.01, 0.9, (v) => f(v, 2), () => {});
    const eps = slider("Exploration ε", 0, 1, 0.05, 0.2, (v) => f(v, 2), () => {});
    const gridEl = h("div", { class: "qgrid", role: "grid", "aria-label": "Gridworld with greedy policy arrows" });
    const out = readout();
    const upd = h("div", { class: "calc", "aria-live": "polite" });
    const qtable = h("tbody");
    function reset() { Q = A.emptyQ(); random = A.rng(1); episodes = 0; last = null; sel = G.start.slice(); draw(); }
    function train(n) {
      const p = { alpha: alpha.get(), gamma: gamma.get(), epsilon: eps.get() };
      for (let k = 0; k < n; k++) { last = A.runEpisode(Q, p, random); episodes++; }
      draw();
    }
    const isT = (r, c) => (r === G.goal[0] && c === G.goal[1]) || (r === G.hazard[0] && c === G.hazard[1]);
    function draw() {
      gridEl.replaceChildren();
      for (let r = 0; r < G.rows; r++) {
        const row = h("div", { role: "row", style: "display:contents" });
        for (let c = 0; c < G.cols; c++) {
          const wall = r === G.wall[0] && c === G.wall[1];
          const Qs = Q[A.gridKey(r, c)];
          const mx = Math.max(Qs.N, Qs.E, Qs.S, Qs.W);
          const known = Qs.N || Qs.E || Qs.S || Qs.W;
          let tag = "", label;
          if (wall) { tag = "wall"; label = "Wall"; }
          else if (r === G.goal[0] && c === G.goal[1]) { tag = "+10"; label = "Delivery, reward plus 10"; }
          else if (r === G.hazard[0] && c === G.hazard[1]) { tag = "−5"; label = "Wet floor, reward minus 5"; }
          else { if (r === G.start[0] && c === G.start[1]) tag = "start"; label = "Row " + (r + 1) + ", column " + (c + 1) + (known ? ", best action " + A.greedy(Qs) + ", value " + f(mx, 2) : ", not visited"); }
          const cell = h("button", { type: "button", role: "gridcell", class: "qcell" + (wall ? " is-wall" : "") + (isT(r, c) ? " is-term" : "") + (sel && sel[0] === r && sel[1] === c ? " is-sel" : ""), "aria-label": label, disabled: wall || isT(r, c), on: { click: () => { sel = [r, c]; draw(); } } },
            tag ? h("span", { class: "tag" }, tag) : null,
            !wall && !isT(r, c) && known ? h("span", { class: "arrow", "aria-hidden": "true" }, arrows[A.greedy(Qs)]) : null,
            !wall && !isT(r, c) && known ? h("span", { class: "qv" }, f(mx, 1)) : null);
          row.append(cell);
        }
        gridEl.append(row);
      }
      const Qs = Q[A.gridKey(sel[0], sel[1])];
      qtable.replaceChildren(...G.actions.map((a) => h("tr", {}, h("td", {}, a + " " + arrows[a]), h("td", { class: "num" }, f(Qs[a], 3)))));
      const gp = A.greedyPath(Q);
      setReadout(out, "Episode " + episodes, gp.reached ? "Following the arrows from start reaches the delivery in " + (gp.path.length - 1) + " moves. The shortest route is 5." : "Following the arrows from start does not reach the delivery yet.");
      if (last && last.updates.length) {
        const u = last.updates[last.updates.length - 1];
        upd.replaceChildren(h("p", { class: "label" }, "Last update of the last episode: state row " + (u.state[0] + 1) + ", column " + (u.state[1] + 1) + ", action " + u.action + (u.explore ? " (random)" : " (greedy)")),
          h("p", {}, "target = r + γ max Q(s′) = " + f(u.reward, 0) + " + " + f(gamma.get(), 2) + " × " + f(u.maxNext, 3) + " = " + f(u.target, 3)),
          h("p", {}, "Q ← " + f(u.old, 3) + " + " + f(alpha.get(), 2) + " × (" + f(u.target, 3) + " − " + f(u.old, 3) + ") = " + f(u.q, 3)));
      } else upd.replaceChildren(h("p", {}, "Worked example from the text: Q = 2, α = 0.5, r = 1, γ = 0.9, best next Q = 4. Target 4.6, new Q = " + f(A.qUpdate(2, 0.5, 1, 0.9, 4).q, 1) + "."));
    }
    const resetB = btn("Reset", () => { alpha.set(0.5); gamma.set(0.9); eps.set(0.2); reset(); });
    root.append(h("div", { class: "lab-grid" },
      h("div", { class: "controls" }, gridEl, h("p", { class: "label" }, "Arrows show the greedy action; the small number is its Q-value. Select a cell to see all four Q-values."), h("table", { class: "register" }, h("caption", {}, "Q-values of the selected cell"), h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Action"), h("th", { scope: "col" }, "Q"))), qtable)),
      h("div", { class: "controls" }, alpha.node, gamma.node, eps.node, h("div", { class: "row" }, btn("Run 1 episode", () => train(1), true), btn("Run 10", () => train(10)), btn("Run 100", () => train(100)), resetB), out, upd)));
    reset();
  };

  labs.bayes = function (root) {
    const out = readout();
    const calc = h("p", { class: "calc" });
    const dots = h("div", { class: "dots", role: "img" });
    const prior = slider("Fault rate, P(Fault)", 0.005, 0.2, 0.005, 0.02, (v) => pct(v), draw);
    const sens = slider("Alarm on a faulty motor, P(Alarm | Fault)", 0.5, 1, 0.01, 0.9, (v) => pct(v, 0), draw);
    const fp = slider("Alarm on a healthy motor, P(Alarm | Healthy)", 0.01, 0.3, 0.01, 0.1, (v) => pct(v, 0), draw);
    function draw() {
      const r = A.bayes(prior.get(), sens.get(), fp.get());
      const tp = Math.round(r.trueAlarms), fa = Math.round(r.falseAlarms);
      dots.replaceChildren(...Array.from({ length: 1000 }, (_, i) => h("i", { class: i < tp ? "tp" : i < tp + fa ? "fp" : null })));
      dots.setAttribute("aria-label", "1000 motors: " + tp + " true alarms, " + fa + " false alarms, the rest silent");
      setReadout(out, "P(Fault | Alarm) = " + pct(r.posterior), "About " + tp + " of " + (tp + fa) + " alarms come from a faulty motor.");
      calc.textContent = f(prior.get(), 3) + " × " + f(sens.get(), 2) + " / (" + f(prior.get(), 3) + " × " + f(sens.get(), 2) + " + " + f(1 - prior.get(), 3) + " × " + f(fp.get(), 2) + ") = " + f(r.posterior, 4);
    }
    const resetB = btn("Reset", () => { prior.set(0.02); sens.set(0.9); fp.set(0.1); draw(); });
    root.append(h("div", { class: "lab-grid" },
      h("div", { class: "controls" }, dots, h("div", { class: "legend" }, h("span", {}, h("i", { style: "background:var(--color-ink)" }), "faulty and alarmed"), h("span", {}, h("i", { style: "outline:1px solid var(--color-ink);outline-offset:-1px" }), "healthy but alarmed"), h("span", {}, h("i", { style: "background:var(--color-rule-2)" }), "no alarm"))),
      h("div", { class: "controls" }, prior.node, sens.node, fp.node, h("div", { class: "row" }, resetB), out, calc)));
    draw();
  };

  function seqControl(initial, max, onChange) {
    let seq = initial.slice();
    const chips = h("div", { class: "seq", "aria-live": "polite" });
    const add = (o) => btn("Add " + o, () => { if (seq.length < max) { seq.push(o); onChange(seq); render(); } });
    const addH = add("High"), addL = add("Low");
    const rm = btn("Remove last", () => { if (seq.length > 1) { seq.pop(); onChange(seq); render(); } });
    function render() { chips.replaceChildren(h("span", { class: "label" }, "Readings:"), ...seq.map((o, i) => h("span", { class: "chip" }, "t" + (i + 1) + " " + o))); addH.disabled = addL.disabled = seq.length >= max; rm.disabled = seq.length <= 1; }
    render();
    return { node: h("div", { class: "controls" }, chips, h("div", { class: "row" }, addH, addL, rm)), get: () => seq, set(v) { seq = v.slice(); render(); } };
  }

  labs.hmm = function (root) {
    const out = readout();
    const tbody = h("tbody");
    const g = svg("0 0 540 200", "Bar chart of the faulty belief at each time");
    const sq = seqControl(["High", "High"], 8, draw);
    function draw() {
      const seq = sq.get(), r = A.hmmFilter(seq);
      tbody.replaceChildren(...r.rows.map((row, i) => h("tr", {}, h("td", { class: "num" }, i + 1), h("td", {}, row.obs), h("td", { class: "num" }, pct(row.prior[1])), h("td", { class: "num" }, f(row.weights[0], 4) + ", " + f(row.weights[1], 4)), h("td", { class: "num" }, pct(row.belief[1])))));
      g.replaceChildren();
      const n = r.rows.length, bw = Math.min(60, 480 / n - 8);
      r.rows.forEach((row, i) => {
        const x = 30 + i * (bw + 8), hgt = row.belief[1] * 150;
        g.append(s("rect", { x, y: 170 - hgt, width: bw, height: hgt, class: "fill-ink" }));
        g.append(s("rect", { x, y: 20, width: bw, height: 150, class: "ln" }));
        g.append(s("text", { x: x + bw / 2, y: 192, "text-anchor": "middle", class: "t-mono t-sm" }, "t" + (i + 1)));
      });
      const sm = seq.length >= 2 ? A.hmmSmooth(seq, 0) : null;
      setReadout(out, "P(Faulty now) = " + pct(r.belief[1]), ["Predicted for the next step without a reading: " + pct(r.next[1]) + ".", sm ? " Smoothed belief that the motor was faulty at t1, using all readings: " + pct(sm[1]) + "." : ""]);
    }
    const resetB = btn("Reset", () => { sq.set(["High", "High"]); draw(); });
    root.append(h("div", { class: "lab-grid" },
      h("div", { class: "controls" }, figure(g, "Filled height is the filtered probability of Faulty at each time."), h("div", { class: "scroll-x" }, h("table", { class: "register" }, h("caption", {}, "Predict, weight, normalize"), h("thead", {}, h("tr", {}, ["t", "Reading", "Predicted P(F)", "Weights H, F", "Filtered P(F)"].map((x) => h("th", { scope: "col" }, x)))), tbody))),
      h("div", { class: "controls" }, sq.node, h("div", { class: "row" }, resetB), out)));
    draw();
  };

  labs.viterbi = function (root) {
    const out = readout();
    const g = svg("0 0 540 260", "Viterbi trellis with backpointers");
    const marker = arrowMarker(g);
    const layer = s("g");
    g.append(layer);
    const sq = seqControl(["High", "High"], 6, draw);
    function draw() {
      const seq = sq.get(), v = A.viterbi(seq);
      layer.replaceChildren();
      const n = seq.length, dx = n > 1 ? 440 / (n - 1) : 0, X = (t) => 60 + t * dx, Y = [70, 190];
      const best = v.path.map((p) => (p === "F" ? 1 : 0));
      for (let t = 1; t < n; t++) for (let j = 0; j < 2; j++) {
        const i = v.back[t][j], onPath = best[t] === j && best[t - 1] === i;
        layer.append(s("line", { x1: X(t) - 40, y1: Y[j], x2: X(t - 1) + 40, y2: Y[i], class: onPath ? "ln-heavy" : "dash", "marker-end": marker }));
      }
      for (let t = 0; t < n; t++) {
        layer.append(s("text", { x: X(t), y: 20, "text-anchor": "middle", class: "t-sm t-muted" }, "t" + (t + 1) + " " + seq[t]));
        for (let j = 0; j < 2; j++) {
          const on = best[t] === j;
          layer.append(s("rect", { x: X(t) - 40, y: Y[j] - 24, width: 80, height: 48, class: on ? "fill-ink" : "bld" }));
          layer.append(s("text", { x: X(t), y: Y[j] - 4, "text-anchor": "middle", class: "t-sm" + (on ? " t-inv" : "") }, j ? "Faulty" : "Healthy"));
          layer.append(s("text", { x: X(t), y: Y[j] + 15, "text-anchor": "middle", class: "t-mono t-sm" + (on ? " t-inv" : "") }, v.delta[t][j] < 0.001 ? v.delta[t][j].toExponential(2) : f(v.delta[t][j], 4)));
        }
      }
      setReadout(out, "Best path " + v.path.join(", "), "Score " + f(v.score, 4) + ". Arrows point back to each state's best predecessor; the thick arrows are the backtracked path.");
    }
    const resetB = btn("Reset", () => { sq.set(["High", "High"]); draw(); });
    root.append(h("div", { class: "lab-grid" }, figure(g, "Each box shows δ, the score of the best path ending there. Filled boxes are on the best path."), h("div", { class: "controls" }, sq.node, h("div", { class: "row" }, resetB), out)));
    draw();
  };

  labs.utility = function (root) {
    let review = true;
    const out = readout();
    const tbody = h("tbody");
    const g = svg("0 0 540 280", "Expected loss of each action as the spam probability changes");
    const p = slider("Spam probability p", 0, 1, 0.01, 0.8, (v) => f(v, 2), draw);
    const modes = seg("Actions available", [{ label: "Deliver, review, delete", value: true }, { label: "Deliver or delete", value: false }], review, (v) => { review = v; draw(); });
    const X = (x) => 40 + x * 480, Y = (L) => 250 - Math.min(L, 25) * 9.2;
    function draw() {
      const r = A.expectedLoss(p.get(), review);
      g.replaceChildren();
      g.append(s("line", { x1: 40, y1: 250, x2: 520, y2: 250, class: "ln" }));
      g.append(s("line", { x1: 40, y1: 20, x2: 40, y2: 250, class: "ln" }));
      for (const t of [0, 0.4, 0.8, 1]) g.append(s("text", { x: X(t), y: 272, "text-anchor": "middle", class: "t-mono t-sm t-muted" }, "p " + t));
      const lines = { Deliver: [[0, 0], [1, 5]], Delete: [[0.75, 25], [1, 0]] };
      if (review) lines.Review = [[0, 2], [1, 2]];
      for (const k in lines) {
        const [[x1, y1], [x2, y2]] = lines[k];
        g.append(s("line", { x1: X(x1), y1: Y(y1), x2: X(x2), y2: Y(y2), class: r.best.includes(k) ? "ln-heavy" : "ln" }));
      }
      g.append(s("text", { x: X(0.5), y: Y(2) - 10, class: "t-sm" }, review ? "review" : ""));
      g.append(s("text", { x: X(0.12), y: Y(0.6) - 10, class: "t-sm" }, "deliver"));
      g.append(s("text", { x: X(0.78), y: Y(22), class: "t-sm" }, "delete"));
      g.append(s("line", { x1: X(p.get()), y1: 20, x2: X(p.get()), y2: 250, class: "dash" }));
      tbody.replaceChildren(...Object.entries(r.losses).map(([k, v]) => h("tr", { class: r.best.includes(k) ? "now" : null }, h("td", {}, k), h("td", { class: "calc" }, k === "Deliver" ? "5 × " + f(p.get(), 2) : k === "Delete" ? "100 × " + f(1 - p.get(), 2) : "2"), h("td", { class: "num" }, f(v, 2)))));
      setReadout(out, "Best: " + r.best.join(" or "), "Expected loss " + f(r.min, 2) + ". " + (review ? "Thresholds: deliver below 0.4, review from 0.4 to 0.98, delete above." : "Delete only above 100/105 ≈ 0.952."));
    }
    const resetB = btn("Reset", () => { review = true; modes.set(true); p.set(0.8); draw(); });
    root.append(h("div", { class: "lab-grid" }, figure(g, "Thick lines mark the cheapest action at the current p; the dashed line is p."), h("div", { class: "controls" }, p.node, modes.node, h("div", { class: "row" }, resetB), out, h("table", { class: "register" }, h("caption", {}, "Expected loss"), h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Action"), h("th", { scope: "col" }, "Formula"), h("th", { scope: "col" }, "Loss"))), tbody))));
    draw();
  };

  labs.metrics = function (root) {
    const def = { tp: 8, fp: 12, fn: 2, tn: 978 };
    const names = { tp: "True positives, TP", fp: "False positives, FP", fn: "False negatives, FN", tn: "True negatives, TN" };
    const inputs = {};
    for (const k in def) inputs[k] = h("input", { type: "number", min: 0, step: 1, value: def[k], on: { input: draw } });
    const out = readout();
    const tbody = h("tbody");
    function set(v) { for (const k in v) inputs[k].value = v[k]; draw(); }
    function draw() {
      const v = {};
      for (const k in inputs) v[k] = Math.max(0, Math.floor(+inputs[k].value || 0));
      const m = A.metrics(v.tp, v.fp, v.fn, v.tn);
      tbody.replaceChildren(
        h("tr", {}, h("td", {}, "Accuracy"), h("td", { class: "calc" }, "(TP + TN) / N"), h("td", { class: "num" }, pct(m.accuracy))),
        h("tr", {}, h("td", {}, "Precision"), h("td", { class: "calc" }, "TP / (TP + FP)"), h("td", { class: "num" }, pct(m.precision))),
        h("tr", {}, h("td", {}, "Recall"), h("td", { class: "calc" }, "TP / (TP + FN)"), h("td", { class: "num" }, pct(m.recall))),
        h("tr", {}, h("td", {}, "F1"), h("td", { class: "calc" }, "2PR / (P + R)"), h("td", { class: "num" }, pct(m.f1))));
      setReadout(out, "Accuracy " + pct(m.accuracy), m.recall === 0 ? "It catches no spam at all, yet accuracy looks excellent." : "Of " + (v.tp + v.fp) + " messages flagged as spam, " + v.fp + " are legitimate.");
    }
    root.append(h("div", { class: "lab-grid" },
      h("div", { class: "controls" }, h("div", { class: "stepper" }, Object.keys(def).map((k) => h("label", {}, names[k], inputs[k]))), h("div", { class: "row" }, btn("Always legitimate baseline", () => set({ tp: 0, fp: 0, fn: 10, tn: 990 }), true), btn("Reset", () => set(def)))),
      h("div", { class: "controls" }, out, h("table", { class: "register" }, h("caption", {}, "Four views of the same 1,000 messages"), h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Metric"), h("th", { scope: "col" }, "Formula"), h("th", { scope: "col" }, "Value"))), tbody))));
    draw();
  };

  labs.kmeans = function (root) {
    let pts, cents, assign, phase;
    const out = readout();
    const g = svg("0 0 400 400", "Scatter plot of points and two centroids; click to add a point");
    const S = (x) => 30 + x * 42, Sy = (y) => 370 - y * 42;
    function reset() { pts = A.kmeansPoints.map((p) => p.slice()); cents = A.kmeansStart.map((p) => p.slice()); assign = null; phase = "assign"; draw(); }
    function doAssign() { assign = A.kmeansAssign(pts, cents); phase = "update"; draw(); }
    function doUpdate() { if (!assign) assign = A.kmeansAssign(pts, cents); cents = A.kmeansUpdate(pts, assign, cents); phase = "assign"; draw(); }
    function runAll() { const r = A.kmeansRun(pts, cents); cents = r.centroids; assign = r.assign; phase = "assign"; draw(); }
    g.addEventListener("click", (e) => {
      const pt = g.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(g.getScreenCTM().inverse());
      const x = Math.round(((p.x - 30) / 42) * 10) / 10, y = Math.round(((370 - p.y) / 42) * 10) / 10;
      if (x < 0 || x > 8 || y < 0 || y > 8) return;
      pts.push([x, y]); assign = null; phase = "assign"; draw();
    });
    function draw() {
      g.replaceChildren();
      for (let k = 0; k <= 8; k++) {
        g.append(s("line", { x1: S(k), y1: Sy(0), x2: S(k), y2: Sy(8), class: "ln-2" }));
        g.append(s("line", { x1: S(0), y1: Sy(k), x2: S(8), y2: Sy(k), class: "ln-2" }));
      }
      pts.forEach((p, i) => {
        const c = assign ? assign[i] : -1;
        if (c >= 0) g.append(s("line", { x1: S(p[0]), y1: Sy(p[1]), x2: S(cents[c][0]), y2: Sy(cents[c][1]), class: "ln-2" }));
        g.append(s("circle", { cx: S(p[0]), cy: Sy(p[1]), r: 7, class: c === 0 ? "fill-ink" : c === 1 ? "fill-paper" : "fill-2", style: "stroke:var(--color-ink);stroke-width:1.5" }));
      });
      cents.forEach((c, i) => {
        g.append(s("rect", { x: S(c[0]) - 11, y: Sy(c[1]) - 11, width: 22, height: 22, class: i ? "fill-paper" : "fill-ink", style: "stroke:var(--color-ink);stroke-width:2.5" }));
        g.append(s("text", { x: S(c[0]) + 16, y: Sy(c[1]) - 12, class: "t-mono t-sm" }, "C" + (i + 1) + " (" + f(c[0], 2) + ", " + f(c[1], 2) + ")"));
      });
      const inertia = assign ? A.kmeansInertia(pts, assign, cents) : null;
      setReadout(out, phase === "assign" ? "Next: assign points" : "Next: move centroids", [pts.length + " points. ", inertia !== null ? "Within-cluster squared distance: " + f(inertia, 3) + "." : "Points are not assigned yet."]);
    }
    root.append(h("div", { class: "lab-grid" }, figure(g, "Filled marks belong to C1, hollow marks to C2. Squares are centroids. Click the plane to add a point."), h("div", { class: "controls" },
      h("div", { class: "row" }, btn("Assign points", doAssign, true), btn("Move centroids", doUpdate), btn("Run to convergence", runAll)),
      h("div", { class: "row" }, btn("Add an outlier at (8, 0)", () => { pts.push([8, 0]); assign = null; phase = "assign"; draw(); }), btn("Reset", reset)), out)));
    reset();
  };

  function unitPlot(label) {
    return svg("-40 -20 400 400", label);
  }
  const U = (x) => x * 300, V = (y) => 300 - y * 300;

  function lineInBox(w, b, lo, hi) {
    const pts = [];
    const add = (x, y) => { if (x >= lo - 1e-9 && x <= hi + 1e-9 && y >= lo - 1e-9 && y <= hi + 1e-9) pts.push([x, y]); };
    if (Math.abs(w[1]) > 1e-9) { add(lo, -(w[0] * lo + b) / w[1]); add(hi, -(w[0] * hi + b) / w[1]); }
    if (Math.abs(w[0]) > 1e-9) { add(-(w[1] * lo + b) / w[0], lo); add(-(w[1] * hi + b) / w[0], hi); }
    return pts.length >= 2 ? [pts[0], pts.find((p) => Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]) > 1e-6) || pts[1]] : null;
  }

  function drawAxes(g) {
    g.append(s("rect", { x: 0, y: 0, width: 300, height: 300, class: "ln" }));
    for (const t of [0, 0.5, 1]) {
      g.append(s("text", { x: U(t), y: 335, "text-anchor": "middle", class: "t-mono t-sm t-muted" }, t));
      g.append(s("text", { x: -24, y: V(t) + 4, "text-anchor": "end", class: "t-mono t-sm t-muted" }, t));
    }
  }

  function draggable(g, node, onMove) {
    node.style.cursor = "grab";
    node.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      node.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const pt = g.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        const p = pt.matrixTransform(g.getScreenCTM().inverse());
        onMove(Math.min(1.1, Math.max(-0.1, p.x / 300)), Math.min(1.1, Math.max(-0.1, (300 - p.y) / 300)));
      };
      const up = () => { node.removeEventListener("pointermove", move); node.removeEventListener("pointerup", up); };
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerup", up);
    });
  }

  labs.perceptron = function (root) {
    const out = readout();
    const calc = h("p", { class: "calc" });
    const g = unitPlot("Contact on the horizontal axis, slip on the vertical axis, with the decision boundary");
    const w1 = slider("Weight w₁ (contact)", -4, 4, 0.01, 2, (v) => f(v, 2), draw);
    const w2 = slider("Weight w₂ (slip)", -4, 4, 0.01, -3, (v) => f(v, 2), draw);
    const b = slider("Bias b", -3, 3, 0.01, -0.5, (v) => f(v, 2), draw);
    const x1 = slider("Contact x₁", 0, 1, 0.01, 0.8, (v) => f(v, 2), draw);
    const x2 = slider("Slip x₂", 0, 1, 0.01, 0.2, (v) => f(v, 2), draw);
    function draw() {
      const w = [w1.get(), w2.get()], x = [x1.get(), x2.get()], z = A.perceptronScore(w, b.get(), x), y = A.perceptronPredict(w, b.get(), x);
      g.replaceChildren();
      drawAxes(g);
      const seg_ = lineInBox(w, b.get(), 0, 1);
      if (seg_) g.append(s("line", { x1: U(seg_[0][0]), y1: V(seg_[0][1]), x2: U(seg_[1][0]), y2: V(seg_[1][1]), class: "ln-heavy" }));
      g.append(s("text", { x: 150, y: 355, "text-anchor": "middle", class: "t-sm" }, "contact x₁"));
      const pt = s("rect", { x: U(x[0]) - 12, y: V(x[1]) - 12, width: 24, height: 24, class: y ? "fill-ink" : "fill-paper", style: "stroke:var(--color-ink);stroke-width:2.5" });
      g.append(pt);
      draggable(g, pt, (a, c) => { x1.set(Math.min(1, Math.max(0, a)).toFixed(2)); x2.set(Math.min(1, Math.max(0, c)).toFixed(2)); draw(); });
      calc.textContent = "z = " + f(w[0], 2) + " × " + f(x[0], 2) + " + (" + f(w[1], 2) + ") × " + f(x[1], 2) + " + (" + f(b.get(), 2) + ") = " + f(z, 2);
      setReadout(out, y ? "Secure" : "Insecure", "z = " + f(z, 2) + (y ? " is at least 0." : " is below 0.") + " Drag the square or use the sliders.");
    }
    function train() {
      const u = A.perceptronUpdate([w1.get(), w2.get()], b.get(), [0.8, 0.8], 1, 0.1);
      w1.set(u.w[0].toFixed(2)); w2.set(u.w[1].toFixed(2)); b.set(u.b.toFixed(2)); x1.set(0.8); x2.set(0.8); draw();
    }
    const resetB = btn("Reset", () => { w1.set(2); w2.set(-3); b.set(-0.5); x1.set(0.8); x2.set(0.2); draw(); });
    root.append(h("div", { class: "lab-grid" }, figure(g, "Filled square: predicted secure. Hollow square: predicted insecure. The thick line is z = 0."), h("div", { class: "controls" }, w1.node, w2.node, b.node, x1.node, x2.node, h("div", { class: "row" }, btn("Update on (0.8, 0.8), label secure", train, true), resetB), out, calc)));
    draw();
  };

  labs.xor = function (root) {
    let P1, P2, epochs, net, netEpochs, losses;
    const out = readout();
    const netOut = readout();
    const g = unitPlot("The four XOR points with a draggable straight line");
    const lossG = svg("0 0 400 140", "Training loss of the two-layer network");
    const truth = h("tbody");
    function wb() { const n = [P2[1] - P1[1], -(P2[0] - P1[0])]; return { w: n, b: -(n[0] * P1[0] + n[1] * P1[1]) }; }
    function fromWB(w, b) { const sgm = lineInBox(w, b, -0.1, 1.1); if (sgm) { P1 = sgm[0]; P2 = sgm[1]; const c = wb(); if (c.w[0] * w[0] + c.w[1] * w[1] < 0) { const t = P1; P1 = P2; P2 = t; } } }
    function reset() { P1 = [-0.1, 0.6]; P2 = [1.1, 0.4]; epochs = 0; net = A.initXorNet(1); netEpochs = 0; losses = [A.xorLoss(net)]; draw(); }
    function draw() {
      const { w, b } = wb();
      g.replaceChildren();
      drawAxes(g);
      g.append(s("line", { x1: U(P1[0]), y1: V(P1[1]), x2: U(P2[0]), y2: V(P2[1]), class: "ln-heavy" }));
      let errors = 0;
      A.xorData.forEach(([x, t]) => {
        const y = A.perceptronPredict(w, b, x), wrong = y !== t;
        if (wrong) errors++;
        g.append(s(t ? "rect" : "circle", t ? { x: U(x[0]) - 11, y: V(x[1]) - 11, width: 22, height: 22, class: "fill-ink" } : { cx: U(x[0]), cy: V(x[1]), r: 11, class: "fill-paper", style: "stroke:var(--color-ink);stroke-width:2" }));
        if (wrong) g.append(s("circle", { cx: U(x[0]), cy: V(x[1]), r: 20, class: "dash" }));
      });
      [P1, P2].forEach((p, i) => {
        const hd = s("rect", { x: U(p[0]) - 9, y: V(p[1]) - 9, width: 18, height: 18, class: "bld", style: "stroke-width:2", tabindex: 0, role: "slider", "aria-label": "Line handle " + (i + 1), "aria-valuetext": f(p[0], 2) + ", " + f(p[1], 2) });
        g.append(hd);
        draggable(g, hd, (x, y) => { (i ? P2 : P1).splice(0, 2, x, y); draw(); });
        hd.addEventListener("keydown", (e) => { const d = { ArrowUp: [0, 0.05], ArrowDown: [0, -0.05], ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0] }[e.key]; if (d) { e.preventDefault(); const p_ = i ? P2 : P1; p_[0] += d[0]; p_[1] += d[1]; draw(); g.querySelectorAll('[role="slider"]')[i].focus(); } });
      });
      setReadout(out, errors + " of 4 wrong", "Epochs of perceptron training: " + epochs + ". Square points are class 1, round points class 0; dashed rings mark mistakes. No line gets all four right.");
      truth.replaceChildren(...A.xorData.map(([x, t], k) => { const hn = A.xorHandNet(x); return h("tr", {}, h("td", { class: "num" }, x.join(", ")), h("td", { class: "num" }, hn.h1), h("td", { class: "num" }, hn.h2), h("td", { class: "num" }, hn.y), h("td", { class: "num" }, f(A.xorForward(net, x).y, 2))); }));
      lossG.replaceChildren();
      const mx = losses[0], n = Math.max(losses.length - 1, 1);
      let d = "";
      losses.forEach((L, i) => { d += (i ? " L" : "M") + (20 + (i / n) * 360).toFixed(1) + " " + (120 - (L / mx) * 100).toFixed(1); });
      lossG.append(s("line", { x1: 20, y1: 120, x2: 380, y2: 120, class: "ln" }), s("path", { d, class: "ln-heavy" }));
      setReadout(netOut, "Loss " + f(losses[losses.length - 1], 4), "Trained epochs: " + netEpochs + ". Learning rate 1, cross-entropy loss, fixed seed. Outputs above 0.5 count as 1.");
    }
    function trainPerc() { const { w, b } = wb(); const r = A.perceptronEpoch(w, b, A.xorData, 0.1); epochs++; fromWB(r.w, r.b); draw(); }
    function trainNet(k) { for (let e = 0; e < k; e++) { net = A.xorTrainEpoch(net, 1); losses.push(A.xorLoss(net)); } netEpochs += k; draw(); }
    root.append(
      h("div", { class: "lab-grid" }, figure(g, "Drag the two small squares, or focus one and use the arrow keys, to move the line."), h("div", { class: "controls" }, h("p", { class: "label" }, "One perceptron"), h("div", { class: "row" }, btn("Train one epoch", trainPerc, true), btn("Train ten epochs", () => { for (let k = 0; k < 10; k++) trainPerc(); }), btn("Reset", reset)), out)),
      h("div", { class: "lab-grid", style: "margin-top:var(--space-xl)" },
        h("div", { class: "controls" }, h("p", { class: "label" }, "Two layers"), h("div", { class: "scroll-x" }, h("table", { class: "register" }, h("caption", {}, "Hand-set net: h₁ = OR, h₂ = AND, y = h₁ and not h₂; last column is the trained net"), h("thead", {}, h("tr", {}, ["x₁, x₂", "h₁", "h₂", "y", "trained"].map((x) => h("th", { scope: "col" }, x)))), truth))),
        h("div", { class: "controls" }, lossG, h("div", { class: "row" }, btn("Train 500 epochs", () => trainNet(500), true), btn("Train 3000", () => trainNet(3000))), netOut)));
    reset();
  };

  document.querySelectorAll(".lab[data-lab]").forEach((el) => {
    const make = labs[el.dataset.lab];
    if (make) make(el);
  });
})();
