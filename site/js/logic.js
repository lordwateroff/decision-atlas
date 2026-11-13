(function (root) {
  "use strict";

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const graph = { S: [["A", 2], ["B", 1]], A: [["G", 7]], B: [["C", 2]], C: [["G", 2]], G: [] };
  const heuristic = { S: 4, A: 6, B: 3, C: 1, G: 0 };

  function search(mode, h) {
    h = h || heuristic;
    const prio = (n) => (mode === "A*" ? n.g + h[n.s] : n.g);
    let frontier = [{ s: "S", g: 0, path: ["S"] }];
    const best = { S: 0 };
    const closed = new Set();
    const steps = [];
    while (frontier.length) {
      let n;
      if (mode === "BFS") n = frontier.shift();
      else if (mode === "DFS") n = frontier.pop();
      else {
        frontier.sort((a, b) => prio(a) - prio(b));
        n = frontier.shift();
      }
      if (closed.has(n.s)) continue;
      if ((mode === "UCS" || mode === "A*") && n.g > best[n.s]) continue;
      closed.add(n.s);
      const done = n.s === "G";
      if (!done) {
        for (const [s, c] of graph[n.s]) {
          const g = n.g + c;
          if (closed.has(s)) continue;
          if (mode === "BFS" || mode === "DFS") {
            if (best[s] !== undefined) continue;
            best[s] = g;
            frontier.push({ s, g, path: n.path.concat(s) });
          } else if (best[s] === undefined || g < best[s]) {
            best[s] = g;
            frontier.push({ s, g, path: n.path.concat(s) });
          }
        }
      }
      steps.push({ state: n.s, g: n.g, h: h[n.s], f: n.g + h[n.s], path: n.path, frontier: frontier.map((x) => x.s), done });
      if (done) return { path: n.path, cost: n.g, steps };
    }
    return { path: null, cost: Infinity, steps };
  }

  function isConsistent(h) {
    if (h.G !== 0) return false;
    for (const a in graph) for (const [b, c] of graph[a]) if (h[a] > c + h[b]) return false;
    return true;
  }

  const landscape = [1, 3, 6, 5, 4, 7, 9, 8, 6];

  function climb(start) {
    let i = start;
    const path = [i];
    for (;;) {
      const options = [i - 1, i + 1].filter((x) => x >= 0 && x < landscape.length).sort((a, b) => landscape[b] - landscape[a]);
      if (!options.length || landscape[options[0]] <= landscape[i]) break;
      i = options[0];
      path.push(i);
    }
    return { position: i, score: landscape[i], path };
  }

  function acceptProbability(deltaE, T) {
    if (deltaE <= 0) return 1;
    if (T <= 0) return 0;
    return Math.exp(-deltaE / T);
  }

  function anneal(opts) {
    const o = Object.assign({ start: 1, T0: 5, cooling: 0.9, steps: 40, seed: 7 }, opts);
    const r = rng(o.seed);
    let i = o.start;
    let T = o.T0;
    let best = i;
    const trace = [];
    for (let k = 0; k < o.steps; k++) {
      const moves = [i - 1, i + 1].filter((x) => x >= 0 && x < landscape.length);
      const j = moves[Math.floor(r() * moves.length)];
      const deltaE = landscape[i] - landscape[j];
      const p = acceptProbability(deltaE, T);
      const accepted = r() < p;
      trace.push({ step: k + 1, from: i, to: j, T, deltaE, p, accepted });
      if (accepted) i = j;
      if (landscape[i] > landscape[best]) best = i;
      T *= o.cooling;
    }
    return { position: i, score: landscape[i], best, bestScore: landscape[best], trace };
  }

  function gradientDescent(eta, w0, steps) {
    const loss = (w) => (w - 3) * (w - 3);
    const grad = (w) => 2 * (w - 3);
    let w = w0 === undefined ? 0 : w0;
    const trace = [{ t: 0, w, loss: loss(w) }];
    for (let t = 1; t <= (steps === undefined ? 10 : steps); t++) {
      w = w - eta * grad(w);
      trace.push({ t, w, loss: loss(w) });
    }
    return trace;
  }

  function minimax(leaves) {
    const values = leaves.map((pair) => Math.min(...pair));
    const best = values[0] >= values[1] ? 0 : 1;
    return { values, best, value: values[best] };
  }

  function alphaBeta(leaves) {
    let alpha = -Infinity;
    const visited = [];
    const pruned = [];
    const values = [];
    leaves.forEach((pair, i) => {
      let beta = Infinity;
      let cut = false;
      pair.forEach((v, j) => {
        if (cut) { pruned.push([i, j]); return; }
        visited.push([i, j]);
        beta = Math.min(beta, v);
        if (beta <= alpha) cut = true;
      });
      values.push(beta);
      alpha = Math.max(alpha, beta);
    });
    const best = values[0] >= values[1] ? 0 : 1;
    return { values, best, value: alpha, visited, pruned };
  }

  function expectimax(leaves, p) {
    const q = p === undefined ? 0.5 : p;
    const values = leaves.map((pair) => q * pair[0] + (1 - q) * pair[1]);
    const best = values[0] >= values[1] ? 0 : 1;
    return { values, best, value: values[best] };
  }

  function bellman(gamma) {
    return { shortcut: 0.8 * 10 + 0.2 * -5, charge: -1 + gamma * 9 };
  }

  function qUpdate(q, alpha, r, gamma, maxNext, terminal) {
    const target = r + (terminal ? 0 : gamma * maxNext);
    const tdError = target - q;
    return { target, tdError, q: q + alpha * tdError };
  }

  const grid = {
    rows: 3,
    cols: 4,
    start: [2, 0],
    goal: [0, 3],
    hazard: [1, 3],
    wall: [1, 1],
    actions: ["N", "E", "S", "W"],
    goalReward: 10,
    hazardReward: -5,
    stepReward: -1
  };

  function gridKey(r, c) { return r + "," + c; }

  function gridMove(state, action) {
    const d = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] }[action];
    const r = state[0] + d[0];
    const c = state[1] + d[1];
    const blocked = r < 0 || c < 0 || r >= grid.rows || c >= grid.cols || (r === grid.wall[0] && c === grid.wall[1]);
    const next = blocked ? state.slice() : [r, c];
    if (next[0] === grid.goal[0] && next[1] === grid.goal[1]) return { next, reward: grid.goalReward, terminal: true };
    if (next[0] === grid.hazard[0] && next[1] === grid.hazard[1]) return { next, reward: grid.hazardReward, terminal: true };
    return { next, reward: grid.stepReward, terminal: false };
  }

  function emptyQ() {
    const Q = {};
    for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) Q[gridKey(r, c)] = { N: 0, E: 0, S: 0, W: 0 };
    return Q;
  }

  function greedy(Qs) {
    let best = grid.actions[0];
    for (const a of grid.actions) if (Qs[a] > Qs[best]) best = a;
    return best;
  }

  function runEpisode(Q, params, random) {
    const p = Object.assign({ alpha: 0.5, gamma: 0.9, epsilon: 0.2, maxSteps: 50 }, params);
    let s = grid.start.slice();
    const updates = [];
    for (let k = 0; k < p.maxSteps; k++) {
      const Qs = Q[gridKey(s[0], s[1])];
      const explore = random() < p.epsilon;
      const a = explore ? grid.actions[Math.floor(random() * 4)] : greedy(Qs);
      const m = gridMove(s, a);
      const nextQ = Q[gridKey(m.next[0], m.next[1])];
      const maxNext = Math.max(nextQ.N, nextQ.E, nextQ.S, nextQ.W);
      const u = qUpdate(Qs[a], p.alpha, m.reward, p.gamma, maxNext, m.terminal);
      updates.push({ state: s.slice(), action: a, explore, reward: m.reward, old: Qs[a], maxNext: m.terminal ? 0 : maxNext, target: u.target, q: u.q, terminal: m.terminal });
      Qs[a] = u.q;
      s = m.next;
      if (m.terminal) break;
    }
    return { Q, updates, end: s };
  }

  function trainGrid(episodes, params, seed) {
    const random = rng(seed === undefined ? 1 : seed);
    const Q = emptyQ();
    let last = null;
    for (let e = 0; e < episodes; e++) last = runEpisode(Q, params, random);
    return { Q, last };
  }

  function greedyPath(Q, limit) {
    let s = grid.start.slice();
    const path = [s.slice()];
    for (let k = 0; k < (limit || 20); k++) {
      const m = gridMove(s, greedy(Q[gridKey(s[0], s[1])]));
      s = m.next;
      path.push(s.slice());
      if (m.terminal) return { path, reached: s[0] === grid.goal[0] && s[1] === grid.goal[1] };
    }
    return { path, reached: false };
  }

  function bayes(prior, sensitivity, falsePositive) {
    const hit = prior * sensitivity;
    const fp = (1 - prior) * falsePositive;
    const total = hit + fp;
    return { posterior: total ? hit / total : null, trueAlarms: hit * 1000, falseAlarms: fp * 1000, totalAlarms: total * 1000 };
  }

  function rainGivenWet() {
    const pR = 0.2;
    const pS = { R: 0.01, notR: 0.4 };
    const pW = { RS: 0.99, RnotS: 0.8, notRS: 0.9, notRnotS: 0 };
    const rainWet = pR * (pS.R * pW.RS + (1 - pS.R) * pW.RnotS);
    const dryWet = (1 - pR) * (pS.notR * pW.notRS + (1 - pS.notR) * pW.notRnotS);
    return { rainWet, dryWet, posterior: rainWet / (rainWet + dryWet) };
  }

  const hmmModel = {
    states: ["Healthy", "Faulty"],
    initial: [0.8, 0.2],
    T: [[0.9, 0.1], [0.2, 0.8]],
    emit: { High: [0.2, 0.7], Low: [0.8, 0.3] }
  };

  function hmmPredict(b) {
    const T = hmmModel.T;
    return [b[0] * T[0][0] + b[1] * T[1][0], b[0] * T[0][1] + b[1] * T[1][1]];
  }

  function hmmFilter(seq) {
    let belief = hmmModel.initial.slice();
    const rows = [];
    seq.forEach((obs, i) => {
      const prior = i === 0 ? belief : hmmPredict(belief);
      const like = hmmModel.emit[obs];
      const weights = [prior[0] * like[0], prior[1] * like[1]];
      const total = weights[0] + weights[1];
      belief = [weights[0] / total, weights[1] / total];
      rows.push({ obs, prior, weights, belief: belief.slice() });
    });
    return { belief, rows, next: hmmPredict(belief) };
  }

  function hmmSmooth(seq, t) {
    const f = hmmFilter(seq.slice(0, t + 1)).belief;
    let b = [1, 1];
    for (let k = seq.length - 1; k > t; k--) {
      const e = hmmModel.emit[seq[k]];
      const T = hmmModel.T;
      b = [
        T[0][0] * e[0] * b[0] + T[0][1] * e[1] * b[1],
        T[1][0] * e[0] * b[0] + T[1][1] * e[1] * b[1]
      ];
    }
    const w = [f[0] * b[0], f[1] * b[1]];
    const total = w[0] + w[1];
    return [w[0] / total, w[1] / total];
  }

  function viterbi(seq) {
    const T = hmmModel.T;
    const delta = [];
    const back = [];
    seq.forEach((obs, t) => {
      const e = hmmModel.emit[obs];
      if (t === 0) {
        delta.push([hmmModel.initial[0] * e[0], hmmModel.initial[1] * e[1]]);
        back.push([null, null]);
        return;
      }
      const prev = delta[t - 1];
      const row = [];
      const bp = [];
      for (let j = 0; j < 2; j++) {
        const c0 = prev[0] * T[0][j];
        const c1 = prev[1] * T[1][j];
        bp.push(c0 >= c1 ? 0 : 1);
        row.push(Math.max(c0, c1) * e[j]);
      }
      delta.push(row);
      back.push(bp);
    });
    const last = delta[delta.length - 1];
    let s = last[0] >= last[1] ? 0 : 1;
    const score = last[s];
    const path = [s];
    for (let t = seq.length - 1; t > 0; t--) {
      s = back[t][s];
      path.unshift(s);
    }
    return { delta, back, path: path.map((i) => (i ? "F" : "H")), score };
  }

  function pathScores(seq) {
    const out = {};
    const T = hmmModel.T;
    const n = seq.length;
    for (let m = 0; m < 1 << n; m++) {
      const states = [];
      for (let t = 0; t < n; t++) states.push((m >> (n - 1 - t)) & 1);
      let p = hmmModel.initial[states[0]] * hmmModel.emit[seq[0]][states[0]];
      for (let t = 1; t < n; t++) p *= T[states[t - 1]][states[t]] * hmmModel.emit[seq[t]][states[t]];
      out[states.map((i) => (i ? "F" : "H")).join(",")] = p;
    }
    return out;
  }

  function expectedLoss(p, includeReview) {
    const losses = { Deliver: 5 * p, Delete: 100 * (1 - p) };
    if (includeReview !== false) losses.Review = 2;
    const min = Math.min(...Object.values(losses));
    return { losses, min, best: Object.keys(losses).filter((k) => Math.abs(losses[k] - min) < 1e-9) };
  }

  function valueWithForecast() {
    return 0.6 * 90 + 0.4 * 50;
  }

  function metrics(tp, fp, fn, tn) {
    const n = tp + fp + fn + tn;
    return {
      accuracy: n ? (tp + tn) / n : null,
      precision: tp + fp ? tp / (tp + fp) : null,
      recall: tp + fn ? tp / (tp + fn) : null,
      f1: 2 * tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : null
    };
  }

  function coinEstimates() {
    return { mle: 3 / 4, map: (5 - 1) / (5 + 3 - 2), mean: 5 / 8 };
  }

  function naiveBayesSpam() {
    const spam = 0.4 * 0.75 * 0.75;
    const ham = 0.6 * (1 / 6) * (2 / 6);
    return { spam, ham, posterior: spam / (spam + ham) };
  }

  const regressionPoints = [[1, 8], [2, 11], [3, 15], [4, 18]];

  function mse(points, w, b) {
    return points.reduce((s, [x, y]) => s + (y - (w * x + b)) ** 2, 0) / points.length;
  }

  function leastSquares(points) {
    const n = points.length;
    const mx = points.reduce((s, p) => s + p[0], 0) / n;
    const my = points.reduce((s, p) => s + p[1], 0) / n;
    let sxy = 0;
    let sxx = 0;
    for (const [x, y] of points) {
      sxy += (x - mx) * (y - my);
      sxx += (x - mx) ** 2;
    }
    const w = sxy / sxx;
    return { w, b: my - w * mx };
  }

  const kmeansPoints = [[1, 1], [1.5, 2], [3, 4], [5, 7], [3.5, 5], [4.5, 5], [3.5, 4.5]];
  const kmeansStart = [[1, 1], [5, 7]];

  function dist2(a, b) { return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; }

  function kmeansAssign(points, centroids) {
    return points.map((p) => {
      let best = 0;
      centroids.forEach((c, i) => { if (dist2(p, c) < dist2(p, centroids[best])) best = i; });
      return best;
    });
  }

  function kmeansUpdate(points, assign, centroids) {
    return centroids.map((c, i) => {
      const mine = points.filter((_, j) => assign[j] === i);
      if (!mine.length) return c.slice();
      return [mine.reduce((s, p) => s + p[0], 0) / mine.length, mine.reduce((s, p) => s + p[1], 0) / mine.length];
    });
  }

  function kmeansInertia(points, assign, centroids) {
    return points.reduce((s, p, j) => s + dist2(p, centroids[assign[j]]), 0);
  }

  function kmeansRun(points, centroids, maxIter) {
    let c = centroids.map((x) => x.slice());
    const history = [];
    for (let k = 0; k < (maxIter || 20); k++) {
      const assign = kmeansAssign(points, c);
      const next = kmeansUpdate(points, assign, c);
      history.push({ assign, centroids: next, inertia: kmeansInertia(points, assign, next) });
      const moved = next.some((p, i) => dist2(p, c[i]) > 1e-12);
      c = next;
      if (!moved) break;
    }
    return { centroids: c, assign: history[history.length - 1].assign, history };
  }

  function perceptronScore(w, b, x) { return w[0] * x[0] + w[1] * x[1] + b; }
  function perceptronPredict(w, b, x) { return perceptronScore(w, b, x) >= 0 ? 1 : 0; }

  function perceptronUpdate(w, b, x, y, eta) {
    const err = y - perceptronPredict(w, b, x);
    return { w: [w[0] + eta * err * x[0], w[1] + eta * err * x[1]], b: b + eta * err, err };
  }

  const xorData = [[[0, 0], 0], [[0, 1], 1], [[1, 0], 1], [[1, 1], 0]];

  function perceptronEpoch(w, b, data, eta) {
    let mistakes = 0;
    for (const [x, y] of data) {
      const u = perceptronUpdate(w, b, x, y, eta);
      if (u.err) mistakes++;
      w = u.w;
      b = u.b;
    }
    const errors = data.filter(([x, y]) => perceptronPredict(w, b, x) !== y).length;
    return { w, b, mistakes, errors };
  }

  function step01(z) { return z >= 0 ? 1 : 0; }

  function xorHandNet(x) {
    const h1 = step01(x[0] + x[1] - 0.5);
    const h2 = step01(x[0] + x[1] - 1.5);
    return { h1, h2, y: step01(h1 - h2 - 0.5) };
  }

  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  function initXorNet(seed) {
    const r = rng(seed);
    const u = () => r() * 2 - 1;
    return { W1: [[u(), u()], [u(), u()]], b1: [u(), u()], W2: [u(), u()], b2: u() };
  }

  function xorForward(net, x) {
    const h = net.W1.map((row, i) => sigmoid(row[0] * x[0] + row[1] * x[1] + net.b1[i]));
    const y = sigmoid(net.W2[0] * h[0] + net.W2[1] * h[1] + net.b2);
    return { h, y };
  }

  function xorLoss(net) {
    return xorData.reduce((s, [x, t]) => {
      const y = xorForward(net, x).y;
      return s - (t * Math.log(y) + (1 - t) * Math.log(1 - y));
    }, 0) / xorData.length;
  }

  function xorTrainEpoch(net, lr) {
    const g = { W1: [[0, 0], [0, 0]], b1: [0, 0], W2: [0, 0], b2: 0 };
    for (const [x, t] of xorData) {
      const { h, y } = xorForward(net, x);
      const dz2 = y - t;
      g.W2[0] += dz2 * h[0];
      g.W2[1] += dz2 * h[1];
      g.b2 += dz2;
      for (let i = 0; i < 2; i++) {
        const dz1 = dz2 * net.W2[i] * h[i] * (1 - h[i]);
        g.W1[i][0] += dz1 * x[0];
        g.W1[i][1] += dz1 * x[1];
        g.b1[i] += dz1;
      }
    }
    const n = xorData.length;
    return {
      W1: net.W1.map((row, i) => row.map((v, j) => v - (lr * g.W1[i][j]) / n)),
      b1: net.b1.map((v, i) => v - (lr * g.b1[i]) / n),
      W2: net.W2.map((v, i) => v - (lr * g.W2[i]) / n),
      b2: net.b2 - (lr * g.b2) / n
    };
  }

  function trainXor(seed, epochs, lr) {
    let net = initXorNet(seed);
    const losses = [xorLoss(net)];
    for (let e = 0; e < epochs; e++) {
      net = xorTrainEpoch(net, lr);
      losses.push(xorLoss(net));
    }
    return { net, losses, outputs: xorData.map(([x]) => xorForward(net, x).y) };
  }

  const api = {
    rng, graph, heuristic, search, isConsistent, landscape, climb, acceptProbability, anneal, gradientDescent,
    minimax, alphaBeta, expectimax, bellman, qUpdate, grid, gridKey, gridMove, emptyQ, greedy, runEpisode,
    trainGrid, greedyPath, bayes, rainGivenWet, hmmModel, hmmPredict, hmmFilter, hmmSmooth, viterbi, pathScores,
    expectedLoss, valueWithForecast, metrics, coinEstimates, naiveBayesSpam, regressionPoints, mse, leastSquares,
    kmeansPoints, kmeansStart, kmeansAssign, kmeansUpdate, kmeansInertia, kmeansRun, perceptronScore,
    perceptronPredict, perceptronUpdate, xorData, perceptronEpoch, xorHandNet, sigmoid, initXorNet, xorForward,
    xorLoss, xorTrainEpoch, trainXor
  };

  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Atlas = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
