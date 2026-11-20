/* ============================================================
   Visualizers — little animated demos that make the code click.
   Three demos: the turn cycle, the patrol clock, and a live
   pathfinding wavefront (mirroring controller._plan).
   ============================================================ */
(function () {
  "use strict";

  var root = document.getElementById("viz");
  if (!root) return;

  /* ---------- tiny helpers ---------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function button(label, fn, active) {
    var b = el("button", "vizbtn", label);
    b.type = "button";
    b.addEventListener("click", fn);
    if (active) b.classList.add("is-active");
    return b;
  }
  function statusLine(text) {
    var s = el("div", "viz__status", text);
    return s;
  }

  /* ---------- section header ---------- */
  var head = el("div", "section__head");
  head.appendChild(el("p", "kicker", "Watch it work"));
  var h2 = el("h2");
  h2.innerHTML = "Interactive <em>visualizers</em>";
  head.appendChild(h2);
  head.appendChild(el("p", "section__lead",
    "Three mini-demos that animate the ideas behind the code. Press play — no reading required."));
  root.appendChild(head);

  var grid = el("div", "viz__grid");
  root.appendChild(grid);

  function card(title, sub) {
    var c = el("div", "viz__card");
    var hd = el("div", "viz__cardhead");
    hd.appendChild(el("h3", "", title));
    hd.appendChild(el("span", "viz__sub", sub));
    c.appendChild(hd);
    return c;
  }

  /* ============================================================
     DEMO 1 — The turn cycle
     ============================================================ */
  (function () {
    var stages = [
      { icon: "📊", t: "Snapshot arrives", d: "runtime → choose_action" },
      { icon: "🧠", t: "You decide", d: "returns one WorldAction" },
      { icon: "⚖️", t: "Runtime validates", d: "legal? right target?" },
      { icon: "🔁", t: "Next snapshot", d: "fresh state, turn + 1" }
    ];

    var c = card("The turn cycle", "what happens every single turn");
    var row = el("div", "cycle");
    var chips = [];
    stages.forEach(function (s) {
      var chip = el("div", "cycle__chip");
      chip.appendChild(el("div", "cycle__icon", s.icon));
      chip.appendChild(el("div", "cycle__t", s.t));
      chip.appendChild(el("div", "cycle__d", s.d));
      row.appendChild(chip);
      chips.push(chip);
      row.appendChild(el("span", "cycle__arrow", "→"));
    });
    row.removeChild(row.lastChild); // trailing arrow
    c.appendChild(row);

    var controls = el("div", "viz__controls");
    var timer = null, cur = 0, running = false;

    function paint() {
      chips.forEach(function (ch, i) {
        ch.classList.toggle("is-active", i === cur);
      });
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } running = false; playBtn.textContent = "Play"; }
    function tick() { cur = (cur + 1) % stages.length; paint(); }

    var playBtn = button("Play", function () {
      if (running) { stop(); return; }
      running = true;
      playBtn.textContent = "Pause";
      timer = setInterval(tick, 950);
    }, true);
    // seed first active
    paint();
    controls.appendChild(playBtn);
    c.appendChild(controls);
    grid.appendChild(c);
  })();

  /* ============================================================
     DEMO 2 — Patrol clock
     ============================================================ */
  (function () {
    var ROWS = 3, COLS = 4;
    // a closed 8-cell loop around a 3x4 board
    var loop = [
      [0, 0], [0, 1], [0, 2], [1, 2],
      [2, 2], [2, 1], [2, 0], [1, 0]
    ];
    var INITIAL = 0;

    var c = card("The patrol clock", "patrol position is pure math");
    var mapWrap = el("div", "patrol");
    var board = el("div", "patrol__board");
    board.style.gridTemplateColumns = "repeat(" + COLS + ", 1fr)";
    var cells = [];

    // build board: floor with a subtle ring marking the loop route
    for (var r = 0; r < ROWS; r++) {
      for (var col = 0; col < COLS; col++) {
        var cell = el("div", "tile tile--floor patrol__cell");
        var onLoop = loop.some(function (p) { return p[0] === r && p[1] === col; });
        if (onLoop) cell.classList.add("is-route");
        board.appendChild(cell);
        cells.push(cell);
      }
    }
    mapWrap.appendChild(board);

    // legend
    var legend = el("div", "patrol__legend");
    legend.appendChild(el("span", "", "<i class='lg lg--route'></i> patrol route"));
    legend.appendChild(el("span", "", "<i class='lg lg--patrol'></i> patrol now"));
    mapWrap.appendChild(legend);
    c.appendChild(mapWrap);

    // readout: turn, phase, formula, resolved position
    var formula = el("div", "patrol__formula");
    var turnRead = el("code", "patrol__turn", "turn = 0");
    var phaseRead = el("code", "patrol__phase", "phase = 0");
    var posRead = el("code", "patrol__pos", "→ (0,0)");
    formula.appendChild(turnRead);
    formula.appendChild(el("span", "patrol__eq", "phase = (initial + turn) % len"));
    formula.appendChild(phaseRead);
    formula.appendChild(posRead);
    c.appendChild(formula);

    function resolve(turn) {
      var phase = (INITIAL + turn) % loop.length;
      var pos = loop[phase];
      return { phase: phase, pos: pos };
    }

    function paint(turn) {
      var res = resolve(turn);
      cells.forEach(function (cell, idx) {
        var r0 = Math.floor(idx / COLS), c0 = idx % COLS;
        var isPatrol = res.pos[0] === r0 && res.pos[1] === c0;
        cell.classList.toggle("is-patrol", isPatrol);
      });
      turnRead.textContent = "turn = " + turn;
      phaseRead.textContent = "phase = " + res.phase;
      posRead.textContent = "→ (" + res.pos[0] + "," + res.pos[1] + ")";
    }

    var controls = el("div", "viz__controls");
    var timer = null, turn = 0, running = false;
    function stop() { if (timer) { clearInterval(timer); timer = null; } running = false; playBtn.textContent = "Play"; }
    var playBtn = button("Play", function () {
      if (running) { stop(); return; }
      running = true;
      playBtn.textContent = "Pause";
      timer = setInterval(function () { turn = (turn + 1) % 8; paint(turn); }, 750);
    }, true);

    controls.appendChild(button("◀", function () { turn = (turn + 7) % 8; paint(turn); }));
    controls.appendChild(playBtn);
    controls.appendChild(button("▶", function () { turn = (turn + 1) % 8; paint(turn); }));
    c.appendChild(controls);

    paint(0);
    grid.appendChild(c);
  })();

  /* ============================================================
     DEMO 3 — Pathfinding wavefront
     '#' wall, 'S' start, 'E' exit, '.' floor.
     The red enemy tile is treated as blocked (must ENGAGE first).
     ============================================================ */
  (function () {
    var MAZE = [
      "S....",
      ".##..",
      ".#.E",
      ".....",
      "#.#.."
    ];
    var ENEMY = [1, 3];
    var ROWS = MAZE.length, COLS = MAZE[0].length;

    var c = card("How the search works", "the same idea as controller._plan");
    var board = el("div", "vizboard");
    board.style.gridTemplateColumns = "repeat(" + COLS + ", 1fr)";
    var cells = [];
    var startI = null, exitI = null;

    for (var r = 0; r < ROWS; r++) {
      for (var col = 0; col < COLS; col++) {
        var ch = MAZE[r][col];
        var cell = el("div", "tile");
        var key = r * COLS + col;
        if (ch === "#") {
          cell.classList.add("tile--wall");
        } else if (ch === "S") {
          cell.classList.add("tile--start");
          cell.setAttribute("data-label", "S");
          startI = key;
        } else if (ch === "E") {
          cell.classList.add("tile--exit");
          cell.setAttribute("data-label", "E");
          exitI = key;
        } else {
          cell.classList.add("tile--floor");
        }
        if (r === ENEMY[0] && col === ENEMY[1]) {
          cell.classList.add("tile--enemy");
          cell.textContent = "⚔";
        }
        board.appendChild(cell);
        cells.push(cell);
      }
    }

    var legend = el("div", "viz__legend");
    legend.appendChild(el("span", "", "<i class='lg lg--start'></i> start"));
    legend.appendChild(el("span", "", "<i class='lg lg--exit'></i> exit"));
    legend.appendChild(el("span", "", "<i class='lg lg--enemy'></i> enemy (blocked)"));
    legend.appendChild(el("span", "", "<i class='lg lg--explored'></i> explored"));
    legend.appendChild(el("span", "", "<i class='lg lg--path'></i> chosen path"));
    board.appendChild(legend);

    // BFS (uniform cost) over floor
    var dist = {}, parent = {}, order = [];
    var M = {};

    function idx(rr, cc) { return rr * COLS + cc; }
    dist[startI] = 0;
    var queue = [startI];
    (function bfs() {
      while (queue.length) {
        var cur = queue.shift();
        order.push(cur);
        if (cur === exitI) break;
        var rr = Math.floor(cur / COLS), cc = cur % COLS;
        var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (var d = 0; d < dirs.length; d++) {
          var nr = rr + dirs[d][0], nc = cc + dirs[d][1];
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
          var nk = idx(nr, nc);
          var ch = MAZE[nr][nc];
          if (ch === "#" || ch === "") continue;
          if (nr === ENEMY[0] && nc === ENEMY[1]) continue;
          if (dist[nk] != null) continue;
          dist[nk] = dist[cur] + 1;
          parent[nk] = cur;
          queue.push(nk);
        }
      }
    })();

    // reconstruct path
    var path = [];
    if (dist[exitI] != null) {
      var step = exitI;
      while (step != null) { path.unshift(step); step = parent[step]; }
    }

    var wrap = el("div", "vizboardwrap");
    wrap.appendChild(board);
    c.appendChild(wrap);

    var statusBox = statusLine("Ready. Press Play to watch the search fan out.");
    c.appendChild(statusBox);

    // animate
    var controls = el("div", "viz__controls");
    var stopExpl = null;

    function reset() {
      cells.forEach(function (cell, i) {
        cell.classList.remove("is-explored", "is-frontier", "is-path", "is-token");
        cell.style.background = "";
        if (cell.classList.contains("tile--start")) cell.style.background = "";
        if (cell.classList.contains("tile--exit")) cell.style.background = "";
      });
      statusBox.textContent = "Ready. Press Play to watch the search fan out.";
    }

    function run() {
      if (stopExpl) { stopExpl(); stopExpl = null; }
      reset();
      if (dist[exitI] == null) {
        statusBox.textContent = "No path (shouldn't happen on this map).";
        return;
      }
      statusBox.textContent = "Exploring… " + order.length + " cells in reachable area.";
      var maxDist = 0;
      Object.keys(dist).forEach(function (k) { if (dist[k] > maxDist) maxDist = dist[k]; });

      var i = 0;
      var t = setInterval(function () {
        if (i >= order.length) {
          clearInterval(t);
          finish();
          return;
        }
        var cur = order[i];
        var cell = cells[cur];
        var d = dist[cur];
        // heat color by distance
        var f = d / (maxDist || 1);
        var hue = 205 - 70 * f;
        cell.style.background = "hsl(" + hue + ", 82%, " + (16 + 22 * f) + "%)";
        cell.classList.add("is-explored");
        // briefly mark frontier
        if (d === dist[order[order.length - 1]]) cell.classList.add("is-frontier");
        i++;
      }, 55);

      var token = null;
      function finish() {
        // draw path
        path.forEach(function (p) {
          cells[p].classList.add("is-path");
        });
        statusBox.textContent = "Path found: " + path.length + " steps. The enemy tile is avoided (ENGAGE first, or go around).";
        // token walks the path
        var ti = 0;
        token = setInterval(function () {
          if (ti >= path.length) { clearInterval(token); token = null; return; }
          cells.forEach(function (cl) { cl.classList.remove("is-token"); });
          cells[path[ti]].classList.add("is-token");
          ti++;
        }, 400);
      }
      // keep handle to cancel if reset pressed mid-run
      stopExpl = function () {
        clearInterval(t);
        if (token) { clearInterval(token); token = null; }
      };
    }

    var playBtn = button("Play", function () { run(); }, true);
    var resetBtn = button("Reset", function () { if (stopExpl) { stopExpl(); stopExpl = null; } reset(); });
    controls.appendChild(playBtn);
    controls.appendChild(resetBtn);
    c.appendChild(controls);

    grid.appendChild(c);
    reset();
  })();
})();
