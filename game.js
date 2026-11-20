/* ============================================================
   Game — "Be the controller"
   You play choose_action. Pick one action per turn for the
   explorer. The rules the game enforces are the same rules the
   runtime enforces: moves need traversable unoccupied floor,
   COLLECT needs an artifact under you, ENGAGE needs an adjacent
   enemy, EXIT needs the exit tile under you.
   ============================================================ */
(function () {
  "use strict";

  var root = document.getElementById("gameRoot");
  if (!root) return;

  /* ---------- helpers ---------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function keyOf(r, c) { return r + "," + c; }

  /* ---------- levels (mirror the base cases) ---------- */
  var LEVELS = [
    {
      name: "1 · Straight path",
      sub: "move, then EXIT",
      rows: ["....."],
      start: [0, 0],
      exit: [0, 4],
      artifacts: [],
      enemies: [],
      par: -5,           // best net: 5 actions, no objects
      tip: "Reach the exit and return EXIT. Arriving isn't finishing."
    },
    {
      name: "2 · Grab the artifact",
      sub: "COLLECT under you",
      rows: ["....."],
      start: [0, 0],
      exit: [0, 4],
      artifacts: [{ pos: [0, 2], value: 20 }],
      enemies: [],
      par: 14,           // 6 actions, +20 artifact
      tip: "Step onto the ◆ and return COLLECT once. Standing on it isn't enough."
    },
    {
      name: "3 · An enemy blocks the way",
      sub: "ENGAGE from beside it",
      rows: ["....."],
      start: [0, 0],
      exit: [0, 4],
      artifacts: [],
      enemies: [{ pos: [0, 2], penalty: 6 }],
      par: -12,          // 6 actions, +6 penalty
      tip: "Get next to the ⚔ and ENGAGE, then walk through its tile. You can't step onto it first."
    },
    {
      name: "4 · Bent path, artifact + enemy",
      sub: "combine everything",
      rows: ["....", "###."],
      start: [0, 0],
      exit: [1, 3],
      artifacts: [{ pos: [0, 1], value: 15 }],
      enemies: [{ pos: [0, 2], penalty: 4 }],
      par: 4,            // 7 actions, +4 penalty, +15 artifact
      tip: "Collect at (0,1), ENGAGE from beside it, then turn south at the corner."
    }
  ];

  var DIRS = {
    "MOVE_NORTH": [-1, 0],
    "MOVE_SOUTH": [1, 0],
    "MOVE_WEST": [0, -1],
    "MOVE_EAST": [0, 1]
  };

  var state = null;

  function initState(i) {
    var L = LEVELS[i];
    state = {
      idx: i,
      level: L,
      pos: L.start.slice(),
      collected: {},     // "r,c" -> value
      defeated: {},      // "r,c" -> penalty
      turn: 0,
      actions: 0,
      penalty: 0,
      artifact: 0,
      done: false,
      pop: true          // first render of a level pops tiles in
    };
  }
  initState(0);

  /* ---------- board geometry ---------- */
  function isWall(r, c) {
    var L = state.level;
    if (r < 0 || r >= L.rows.length || c < 0 || c >= L.rows[0].length) return true;
    return L.rows[r][c] === "#";
  }
  function enemyAt(r, c) {
    var k = keyOf(r, c);
    return state.defeated[k] !== undefined ? null : state.level.enemies.filter(function (e) {
      return e.pos[0] === r && e.pos[1] === c;
    })[0] || null;
  }
  function artifactAt(r, c) {
    var k = keyOf(r, c);
    if (state.collected[k] !== undefined) return null;
    return state.level.artifacts.filter(function (a) {
      return a.pos[0] === r && a.pos[1] === c;
    })[0] || null;
  }
  function isAdjacent(r1, c1, r2, c2) {
    return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
  }

  /* ---------- the game loop ---------- */
  function feedback(msg, ok) {
    var box = document.getElementById("gameFeedback");
    if (!box) return;
    box.textContent = msg;
    box.className = "game__feedback" + (ok ? " is-ok" : " is-bad");
  }

  function act(action) {
    if (state.done) return;

    var L = state.level;
    var r = state.pos[0], c = state.pos[1];
    var ok = false, msg = "";

    if (DIRS[action]) {
      var dr = DIRS[action][0], dc = DIRS[action][1];
      var nr = r + dr, nc = c + dc;
      if (isWall(nr, nc)) {
        msg = "Illegal move — " + action + " targets a wall or out-of-bounds tile. The runtime would end the run.";
      } else if (enemyAt(nr, nc)) {
        msg = "Illegal move — an undefeated enemy sits on that tile. You cannot walk onto it; ENGAGE from beside it.";
      } else {
        state.pos = [nr, nc];
        state.turn++; state.actions++;
        ok = true;
        msg = action + " → (" + nr + "," + nc + ") accepted." + (keyOf(nr, nc) === keyOf(L.exit[0], L.exit[1]) ? " You're on the exit — EXIT to finish." : "");
      }
    } else if (action === "COLLECT") {
      var art = artifactAt(r, c);
      if (!art) {
        msg = "COLLECT rejected — no uncollected artifact is on your tile. Move onto a ◆ first.";
      } else {
        state.collected[keyOf(r, c)] = art.value;
        state.artifact += art.value;
        state.turn++; state.actions++;
        ok = true;
        msg = "COLLECT accepted — artifact +" + art.value + ".";
      }
    } else if (action === "ENGAGE") {
      var found = null;
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) {
        if (found) return;
        var e = enemyAt(r + d[0], c + d[1]);
        if (e) found = e;
      });
      if (!found) {
        msg = "ENGAGE rejected — no undefeated enemy is adjacent to you. Get beside one first.";
      } else {
        state.defeated[keyOf(found.pos[0], found.pos[1])] = found.penalty;
        state.penalty += found.penalty;
        state.turn++; state.actions++;
        ok = true;
        msg = "ENGAGE accepted — enemy cleared, +" + found.penalty + " penalty.";
      }
    } else if (action === "WAIT") {
      state.turn++; state.actions++;
      ok = true;
      msg = "WAIT accepted — a turn passes with no movement.";
    } else if (action === "EXIT") {
      if (keyOf(r, c) !== keyOf(L.exit[0], L.exit[1])) {
        msg = "EXIT rejected — you are not on the exit tile. Stand on E first.";
      } else {
        state.turn++; state.actions++;
        state.done = true;
        ok = true;
        msg = "EXIT accepted — you made it home!";
      }
    }

    feedback(msg, ok);
    render();
  }

  /* ---------- rendering ---------- */
  function renderLevelTabs() {
    var tabs = document.getElementById("gameLevels");
    tabs.innerHTML = "";
    LEVELS.forEach(function (L, i) {
      var b = el("button", "game__level" + (i === state.idx ? " is-active" : ""), L.name);
      b.type = "button";
      b.addEventListener("click", function () { initState(i); feedback("Level selected: " + L.name, true); render(); });
      tabs.appendChild(b);
    });
  }

  function renderBoard() {
    var board = document.getElementById("gameBoard");
    board.innerHTML = "";
    board.classList.toggle("is-pop", state.pop);
    var L = state.level;
    board.style.gridTemplateColumns = "repeat(" + L.rows[0].length + ", 1fr)";

    var startK = keyOf(L.start[0], L.start[1]);
    var exitK = keyOf(L.exit[0], L.exit[1]);
    var posK = keyOf(state.pos[0], state.pos[1]);
    var tileIdx = 0;

    for (var r = 0; r < L.rows.length; r++) {
      for (var c = 0; c < L.rows[0].length; c++) {
        var tile = el("div", "tile");
        if (state.pop) {
          tile.style.animationDelay = (tileIdx * 22) + "ms";
        }
        tileIdx++;
        var k = keyOf(r, c);

        if (L.rows[r][c] === "#") tile.classList.add("tile--wall");
        else tile.classList.add("tile--floor");

        if (k === startK) { tile.classList.add("tile--start"); tile.setAttribute("data-label", "S"); }
        if (k === exitK) { tile.classList.add("tile--exit"); tile.setAttribute("data-label", "E"); }
        if (artifactAt(r, c)) { tile.classList.add("tile--artifact"); tile.textContent = "◆"; }
        if (enemyAt(r, c)) { tile.classList.add("tile--enemy"); tile.textContent = "⚔"; }
        if (k === posK && !state.done) tile.classList.add("is-player");

        board.appendChild(tile);
      }
    }
  }

  function renderMeta() {
    var net = state.artifact - (state.actions + state.penalty);
    var L = state.level;
    document.getElementById("gameTurn").textContent = state.turn;
    document.getElementById("gameActions").textContent = state.actions;
    document.getElementById("gamePenalty").textContent = state.penalty;
    document.getElementById("gameArtifact").textContent = state.artifact;
    document.getElementById("gameNet").textContent = net;
    var verdictEl = document.getElementById("gameVerdict");

    if (state.done) {
      if (net === L.par) verdictEl.textContent = "On par 🎯 — that's optimal.";
      else if (net > L.par) verdictEl.textContent = "Better than par ⭐";
      else verdictEl.textContent = "Under par — try a tighter route.";
    } else {
      verdictEl.textContent = "Par: " + L.par;
    }
    document.getElementById("gameTip").textContent = L.tip;
  }

  function renderActions() {
    var box = document.getElementById("gameActionsRow");
    box.innerHTML = "";
    var moves = [
      ["MOVE_NORTH", "⬆", "N"],
      ["MOVE_SOUTH", "⬇", "S"],
      ["MOVE_WEST", "⬅", "W"],
      ["MOVE_EAST", "➡", "E"]
    ];
    moves.forEach(function (m) {
      var b = el("button", "game__act game__act--move", m[1] + " <i>" + m[2] + "</i>");
      b.type = "button";
      b.disabled = state.done;
      b.title = m[0];
      b.addEventListener("click", function () { act(m[0]); });
      box.appendChild(b);
    });
    box.appendChild(el("span", "game__gutter"));
    [
      ["COLLECT", "◆"],
      ["ENGAGE", "⚔"],
      ["WAIT", "·"],
      ["EXIT", "E"]
    ].forEach(function (a) {
      var b = el("button", "game__act game__act--special", a[1] + " <i>" + a[0] + "</i>");
      b.type = "button";
      b.disabled = state.done;
      b.addEventListener("click", function () { act(a[0]); });
      box.appendChild(b);
    });

    var replay = el("button", "game__act game__act--replay", "↻ Replay");
    replay.type = "button";
    replay.addEventListener("click", function () { initState(state.idx); feedback("Back to the start.", true); render(); });
    box.appendChild(replay);
  }

  function render() {
    renderLevelTabs();
    renderBoard();
    renderMeta();
    renderActions();
    state.pop = false;
  }

  /* ---------- build the DOM once ---------- */
  root.innerHTML = "";
  var head = el("div", "game__head");
  head.appendChild(el("p", "kicker", "You are AgentController"));
  head.appendChild(el("h3", "", "Pick one action per turn"));
  root.appendChild(head);

  var tabs = el("div", "game__levels", "");
  tabs.id = "gameLevels";
  root.appendChild(tabs);

  var boardWrap = el("div", "game__boardwrap");
  var board = el("div", "game__board", "");
  board.id = "gameBoard";
  boardWrap.appendChild(board);
  root.appendChild(boardWrap);

  var meta = el("div", "game__meta");
  meta.innerHTML =
    "<div><span>Turn</span><strong id='gameTurn'>0</strong></div>" +
    "<div><span>Actions</span><strong id='gameActions'>0</strong></div>" +
    "<div><span>Penalty</span><strong id='gamePenalty'>0</strong></div>" +
    "<div><span>Artifacts</span><strong id='gameArtifact'>0</strong></div>" +
    "<div><span>Net</span><strong id='gameNet'>0</strong></div>" +
    "<div><span>Par</span><strong id='gameVerdict'>—</strong></div>";
  root.appendChild(meta);

  var actionsRow = el("div", "game__actions", "");
  actionsRow.id = "gameActionsRow";
  root.appendChild(actionsRow);

  var tip = el("p", "game__tip", "");
  tip.id = "gameTip";
  root.appendChild(tip);

  var fb = el("div", "game__feedback", "");
  fb.id = "gameFeedback";
  root.appendChild(fb);

  feedback("Level 1 · Move east to reach the exit — then EXIT. The rules are the runtime's rules.", true);
  render();

  /* ---------- keyboard shortcuts ---------- */
  document.addEventListener("keydown", function (e) {
    var map = {
      ArrowUp: "MOVE_NORTH", ArrowDown: "MOVE_SOUTH",
      ArrowLeft: "MOVE_WEST", ArrowRight: "MOVE_EAST",
      c: "COLLECT", g: "ENGAGE", x: "EXIT", w: "WAIT"
    };
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (map[key]) { act(map[key]); e.preventDefault(); }
  });
})();
