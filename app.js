/* ============================================================
   Adventure Explorer — interactivity
   ============================================================ */
(function () {
  "use strict";

  /* ---------- The seven base cases ---------- */
  var CASES = [
    {
      id: 1,
      name: "Straight path",
      scenario: "A five-cell hallway. You start on the left, the exit is on the right, and there's nothing in the way.",
      rows: ["....."],
      start: [0, 0],
      exit: [0, 4],
      artifacts: [],
      enemies: [],
      path: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
      collectAt: [],
      lesson: "Compare your position with the exit, take one legal step toward it each turn, and return EXIT once you're standing on the exit tile.",
      meta: [
        { k: "Actions", v: "4 moves + EXIT" },
        { k: "Entities", v: "None" }
      ]
    },
    {
      id: 2,
      name: "Bent path",
      scenario: "The path turns once. If you just keep moving east, you'll walk into a wall.",
      rows: ["....", "###."],
      start: [0, 0],
      exit: [1, 3],
      artifacts: [],
      enemies: [],
      path: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
      collectAt: [],
      lesson: "Don't assume one direction works everywhere. Look at the traversable neighboring cells and change direction at the corner.",
      meta: [
        { k: "Actions", v: "4 moves + EXIT" },
        { k: "Turn", v: "At (0,3), head south" }
      ]
    },
    {
      id: 3,
      name: "Path with artifacts",
      scenario: "A straight path with a reward on the way. Walking onto it does NOT collect it.",
      rows: ["....."],
      start: [0, 0],
      exit: [0, 4],
      artifacts: [{ pos: [0, 2], value: 20 }],
      enemies: [],
      path: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
      collectAt: [[0, 2]],
      lesson: "Return COLLECT with the artifact's id while standing on its tile, then keep moving and EXIT. A 20-point reward costing one extra action nets +15 at a rate of 5 per excess cost.",
      meta: [
        { k: "Actions", v: "6 (collect adds one)" },
        { k: "Reward", v: "20 points at (0,2)" }
      ]
    },
    {
      id: 4,
      name: "Bent path with artifacts",
      scenario: "The turning path now has a reward on it. Collect it without losing your place in the route.",
      rows: ["....", "###."],
      start: [0, 0],
      exit: [1, 3],
      artifacts: [{ pos: [0, 1], value: 20 }],
      enemies: [],
      path: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
      collectAt: [[0, 1]],
      lesson: "Combine navigation and object handling: reach the reward, collect it, then continue the route. Inspect the snapshot after collecting, not just a fixed move plan.",
      meta: [
        { k: "Actions", v: "7 (collect + turn)" },
        { k: "Lesson", v: "Coordinate collect + path" }
      ]
    },
    {
      id: 5,
      name: "Cyclic path",
      scenario: "The floor is a loop with two routes to the exit. Pick one and follow it.",
      rows: ["....", "...."],
      start: [0, 0],
      exit: [0, 3],
      artifacts: [],
      enemies: [],
      path: [[0, 0], [0, 1], [0, 2], [0, 3]],
      collectAt: [],
      lesson: "Plan a route through the floor graph (or track visited cells) and follow it. Revisiting a tile is legal; endlessly circling is not.",
      meta: [
        { k: "Routes", v: "Top (shown) or bottom" },
        { k: "Action", v: "Plan then follow" }
      ]
    },
    {
      id: 6,
      name: "Path with an enemy",
      scenario: "A static blocker sits on the path. You cannot move into its tile until it's cleared.",
      rows: ["....."],
      start: [0, 0],
      exit: [0, 4],
      artifacts: [],
      enemies: [{ pos: [0, 2], penalty: 6 }],
      path: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
      collectAt: [],
      engageAt: [0, 2],
      lesson: "Step onto a tile adjacent to the enemy, return ENGAGE with its id, then move into the freed tile. The penalty (6) is added once and is separate from your actions.",
      meta: [
        { k: "Actions", v: "5 moves + ENGAGE + EXIT" },
        { k: "Penalty", v: "+6 total cost" }
      ]
    },
    {
      id: 7,
      name: "Short route with enemy or longer route without",
      scenario: "The exit is close, but the direct route passes a blocker. Going around is longer but costs no penalty.",
      rows: [".....", "####.", "....."],
      start: [0, 0],
      exit: [0, 4],
      artifacts: [],
      enemies: [{ pos: [0, 1], penalty: 6 }],
      path: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
      collectAt: [],
      engageAt: [0, 1],
      lesson: "Compare total cost. Direct: ENGAGE + 3 moves + EXIT = 5 actions + 6 penalty = 11. Outer route: 8 moves + EXIT = 9. Sometimes the longer walk is the better deal.",
      meta: [
        { k: "Direct", v: "≈ 11 total" },
        { k: "Outer", v: "9 total (cheaper)" }
      ]
    }
  ];

  /* ---------- Board rendering ---------- */
  function renderBoard(container, data) {
    var grid = document.createElement("div");
    grid.className = "board";
    var cols = data.rows[0].length;
    grid.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";

    var pathSet = {};
    data.path.forEach(function (p) { pathSet[p[0] + "," + p[1]] = true; });
    var collectSet = {};
    (data.collectAt || []).forEach(function (p) { collectSet[p[0] + "," + p[1]] = true; });

    var artifactMap = {};
    data.artifacts.forEach(function (a) {
      artifactMap[a.pos[0] + "," + a.pos[1]] = a.value;
    });
    var enemyMap = {};
    data.enemies.forEach(function (e) {
      enemyMap[e.pos[0] + "," + e.pos[1]] = e.penalty;
    });

    var startKey = data.start[0] + "," + data.start[1];
    var exitKey = data.exit[0] + "," + data.exit[1];

    var tileIdx = 0;
    for (var r = 0; r < data.rows.length; r++) {
      for (var c = 0; c < cols; c++) {
        var tile = document.createElement("div");
        tile.style.animationDelay = (tileIdx * 18) + "ms";
        tileIdx++;
        var ch = data.rows[r][c];
        var key = r + "," + c;

        var cls = "tile";
        if (ch === "#") cls += " tile--wall";
        else cls += " tile--floor";

        if (key === startKey) { cls += " tile--start"; tile.setAttribute("data-label", "S"); }
        else if (key === exitKey) { cls += " tile--exit"; tile.setAttribute("data-label", "E"); }

        if (pathSet[key]) cls += " tile--path";
        if (collectSet[key]) { cls += " tile--artifact"; tile.textContent = "◆"; }
        if (artifactMap[key] !== undefined) { cls += " tile--artifact"; tile.textContent = "◆"; }
        if (enemyMap[key] !== undefined) { cls += " tile--enemy"; tile.textContent = "⚔"; }
        if (data.engageAt && key === data.engageAt[0] + "," + data.engageAt[1]) {
          cls += " tile--enemy";
        }

        tile.className = cls;
        grid.appendChild(tile);
      }
    }
    container.appendChild(grid);

    var caption = document.createElement("div");
    caption.className = "case__map-caption";
    caption.textContent = "S = start · E = exit · ◆ artifact · ⚔ enemy · path highlighted";
    container.appendChild(caption);
  }

  /* ---------- Case tabs ---------- */
  var tabs = document.querySelectorAll(".cases__tab");
  var panel = document.getElementById("casePanel");

  function renderCase(index) {
    var data = CASES[index];
    panel.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "case";

    var info = document.createElement("div");
    info.className = "case__info";

    var h3 = document.createElement("h3");
    h3.textContent = "Case " + data.id + " — " + data.name;
    info.appendChild(h3);

    var scenario = document.createElement("p");
    scenario.className = "case__scenario";
    scenario.textContent = data.scenario;
    info.appendChild(scenario);

    var lesson = document.createElement("div");
    lesson.className = "case__lesson";
    lesson.innerHTML = "<strong>Lesson:</strong> " + data.lesson;
    info.appendChild(lesson);

    var metaWrap = document.createElement("div");
    metaWrap.className = "case__meta";
    data.meta.forEach(function (m) {
      var item = document.createElement("div");
      item.className = "case__meta-item";
      var k = document.createElement("span");
      k.textContent = m.k;
      var v = document.createElement("strong");
      v.textContent = m.v;
      item.appendChild(k);
      item.appendChild(v);
      metaWrap.appendChild(item);
    });
    info.appendChild(metaWrap);

    var map = document.createElement("div");
    map.className = "case__map";
    renderBoard(map, data);

    wrap.appendChild(info);
    wrap.appendChild(map);
    panel.appendChild(wrap);
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      renderCase(parseInt(tab.getAttribute("data-case"), 10));
    });
  });

  if (panel) renderCase(0);

  /* ---------- Nav: scrollspy + progress + toggle ---------- */
  var nav = document.getElementById("nav");
  var progressBar = document.getElementById("progressBar");
  var sectionLinks = document.querySelectorAll(".nav__links a");
  var sections = [];
  sectionLinks.forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    var el = document.getElementById(id);
    if (el) sections.push({ id: id, el: el, link: a });
  });

  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 10);

    var docH = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docH > 0 ? (y / docH) * 100 : 0;
    progressBar.style.width = pct + "%";

    var current = sections[0] ? sections[0].id : "";
    sections.forEach(function (s) {
      var top = s.el.getBoundingClientRect().top + window.scrollY - 120;
      if (y >= top) current = s.id;
    });
    sectionLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("href") === "#" + current);
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Ambient parallax (stars follow scroll; aurora drifts on its own) ---------- */
  var starsEl = document.querySelector(".stars");
  if (starsEl) {
    var pTick = false;
    var onParallax = function () {
      if (!pTick) {
        pTick = true;
        requestAnimationFrame(function () {
          starsEl.style.transform = "translateY(" + (window.scrollY * 0.14) + "px)";
          pTick = false;
        });
      }
    };
    window.addEventListener("scroll", onParallax, { passive: true });
    onParallax();
  }

  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");
  navToggle.addEventListener("click", function () {
    var open = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navLinks.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }
})();
