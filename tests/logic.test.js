const test = require("node:test");
const assert = require("node:assert/strict");
const A = require("../site/js/logic.js");

const near = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} is not close to ${b}`);

test("search: BFS cost 9, UCS and A* path S-B-C-G cost 5", () => {
  assert.deepEqual(A.search("BFS").path, ["S", "A", "G"]);
  assert.equal(A.search("BFS").cost, 9);
  assert.deepEqual(A.search("UCS").path, ["S", "B", "C", "G"]);
  assert.equal(A.search("UCS").cost, 5);
  const a = A.search("A*");
  assert.deepEqual(a.path, ["S", "B", "C", "G"]);
  assert.equal(a.cost, 5);
  assert.deepEqual(a.steps.map((s) => s.f), [4, 4, 4, 5]);
  assert.equal(A.search("DFS").cost, 5);
  assert.ok(A.isConsistent(A.heuristic));
});

test("hill climbing from position 1 stops at score 6", () => {
  const r = A.climb(1);
  assert.equal(r.position, 2);
  assert.equal(r.score, 6);
});

test("annealing acceptance 0.670 at T=5 and 0.018 at T=0.5", () => {
  near(A.acceptProbability(2, 5), 0.670);
  near(A.acceptProbability(2, 0.5), 0.018);
  assert.equal(A.acceptProbability(-1, 1), 1);
  assert.equal(A.anneal({ seed: 2 }).bestScore, 9);
});

test("gradient descent on (w-3)^2", () => {
  const t = A.gradientDescent(0.1, 0, 3).map((x) => x.w);
  near(t[1], 0.6); near(t[2], 1.08); near(t[3], 1.464);
  near(A.gradientDescent(0.9, 0, 1)[1].w, 5.4);
  const one = A.gradientDescent(1, 0, 2).map((x) => x.w);
  near(one[1], 6); near(one[2], 0);
  assert.ok(Math.abs(A.gradientDescent(1.1, 0, 30)[30].w - 3) > 100);
});

test("minimax 3, alpha-beta prunes B's second leaf, expectimax picks B at 5.5", () => {
  const L = [[3, 5], [2, 9]];
  assert.equal(A.minimax(L).value, 3);
  assert.equal(A.minimax(L).best, 0);
  assert.deepEqual(A.alphaBeta(L).pruned, [[1, 1]]);
  assert.equal(A.alphaBeta(L).value, 3);
  assert.deepEqual(A.expectimax(L).values, [4, 5.5]);
  assert.equal(A.expectimax(L).best, 1);
});

test("Bellman: shortcut 7, charge 7.1 at gamma 0.9", () => {
  near(A.bellman(0.9).shortcut, 7);
  near(A.bellman(0.9).charge, 7.1);
});

test("Q-learning update gives 3.3 and target 4.6", () => {
  const u = A.qUpdate(2, 0.5, 1, 0.9, 4, false);
  near(u.target, 4.6);
  near(u.q, 3.3);
  near(A.qUpdate(2, 0.5, 10, 0.9, 99, true).q, 6);
});

test("gridworld: learned greedy policy reaches the goal in 5 moves", () => {
  const t = A.trainGrid(300, { alpha: 0.5, gamma: 0.9, epsilon: 0.2 }, 1);
  const p = A.greedyPath(t.Q);
  assert.ok(p.reached);
  assert.equal(p.path.length - 1, 5);
});

test("Bayes alarm 15.5% (18 of 116)", () => {
  const r = A.bayes(0.02, 0.9, 0.1);
  near(r.posterior, 0.1552);
  near(r.trueAlarms, 18); near(r.totalAlarms, 116);
});

test("Bayesian network rain given wet 35.8%", () => {
  const r = A.rainGivenWet();
  near(r.rainWet, 0.16038, 1e-6); near(r.dryWet, 0.288, 1e-9); near(r.posterior, 0.358);
});

test("HMM filtering, prediction, smoothing", () => {
  const one = A.hmmFilter(["High"]);
  near(one.belief[0], 0.5333);
  const r = A.hmmFilter(["High", "High"]);
  near(r.rows[1].prior[0], 0.5733);
  near(r.belief[1], 0.7226);
  near(r.next[1], 0.606);
  near(A.hmmSmooth(["High", "High"], 0)[1], 0.677);
});

test("Viterbi selects F,F with score 0.0784, posterior 63.2%", () => {
  const v = A.viterbi(["High", "High"]);
  assert.deepEqual(v.path, ["F", "F"]);
  near(v.score, 0.0784, 1e-9);
  const s = A.pathScores(["High", "High"]);
  near(s["H,H"], 0.0288, 1e-9); near(s["H,F"], 0.0112, 1e-9); near(s["F,H"], 0.0056, 1e-9);
  const total = Object.values(s).reduce((a, b) => a + b, 0);
  near(total, 0.124, 1e-9);
  near(v.score / total, 0.632);
});

test("expected loss thresholds and value of information", () => {
  const two = A.expectedLoss(0.8, false);
  near(two.losses.Deliver, 4); near(two.losses.Delete, 20);
  assert.deepEqual(two.best, ["Deliver"]);
  near(100 / 105, 0.9524);
  assert.deepEqual(A.expectedLoss(0.8).best, ["Review"]);
  assert.deepEqual(A.expectedLoss(0.3).best, ["Deliver"]);
  assert.deepEqual(A.expectedLoss(0.99).best, ["Delete"]);
  assert.equal(A.expectedLoss(0.4).best.length, 2);
  near(A.valueWithForecast(), 74);
});

test("metrics: accuracy 98.6%, precision 40%, recall 80%, F1 53.3%", () => {
  const m = A.metrics(8, 12, 2, 978);
  near(m.accuracy, 0.986); near(m.precision, 0.4); near(m.recall, 0.8); near(m.f1, 0.5333);
  const base = A.metrics(0, 0, 10, 990);
  near(base.accuracy, 0.99); assert.equal(base.recall, 0);
});

test("MLE 3/4, MAP 2/3, mean 5/8, Naive Bayes 87.1%", () => {
  const c = A.coinEstimates();
  near(c.mle, 0.75); near(c.map, 2 / 3); near(c.mean, 0.625);
  near(A.naiveBayesSpam().posterior, 0.871);
});

test("regression: 3x+5 MSE 0.5, least squares 3.4x+4.5 MSE 0.05", () => {
  near(A.mse(A.regressionPoints, 3, 5), 0.5);
  const l = A.leastSquares(A.regressionPoints);
  near(l.w, 3.4); near(l.b, 4.5);
  near(A.mse(A.regressionPoints, l.w, l.b), 0.05);
});

test("k-means worked example converges in two updates", () => {
  const r = A.kmeansRun(A.kmeansPoints, A.kmeansStart);
  near(r.history[0].centroids[0][0], 1.833); near(r.history[0].centroids[0][1], 2.333);
  near(r.history[0].centroids[1][0], 4.125); near(r.history[0].centroids[1][1], 5.375);
  near(r.centroids[0][0], 1.25); near(r.centroids[0][1], 1.5);
  near(r.centroids[1][0], 3.9); near(r.centroids[1][1], 5.1);
  assert.deepEqual(r.assign, [0, 0, 1, 1, 1, 1, 1]);
  near(r.history.at(-1).inertia, 8.525);
});

test("perceptron score 0.5, -1.3 and update", () => {
  near(A.perceptronScore([2, -3], -0.5, [0.8, 0.2]), 0.5);
  near(A.perceptronScore([2, -3], -0.5, [0.8, 0.8]), -1.3);
  const u = A.perceptronUpdate([2, -3], -0.5, [0.8, 0.8], 1, 0.1);
  near(u.w[0], 2.08); near(u.w[1], -2.92); near(u.b, -0.4);
});

test("XOR: perceptron never reaches zero errors, two-layer nets do", () => {
  let w = [0, 0], b = 0;
  for (let e = 0; e < 200; e++) {
    const r = A.perceptronEpoch(w, b, A.xorData, 0.1);
    w = r.w; b = r.b;
    assert.ok(r.errors >= 1);
  }
  assert.deepEqual(A.xorData.map(([x]) => A.xorHandNet(x).y), [0, 1, 1, 0]);
  const t = A.trainXor(1, 3000, 1);
  assert.ok(t.losses.at(-1) < t.losses[0] / 10);
  assert.deepEqual(t.outputs.map((y) => Math.round(y)), [0, 1, 1, 0]);
});
