/* ============================================================
   Code Walkthrough — data + renderer
   Teaches the six src/student/ files line-by-line.
   ============================================================ */
(function () {
  "use strict";

  /* A tiny Python highlighter returning HTML spans.
     Order matters: comments & strings first, then keywords. */
  var KEYWORDS = new Set([
    "def", "class", "return", "if", "elif", "else", "for", "while", "in",
    "not", "and", "or", "None", "True", "False", "self", "import", "from",
    "lambda", "with", "as", "try", "except", "finally", "raise", "pass",
    "break", "continue", "yield", "global", "del"
  ]);

  function highlight(src) {
    var out = "";
    var i = 0;
    var n = src.length;
    function esc(s) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    while (i < n) {
      var ch = src[i];

      // Line comment
      if (ch === "#") {
        var j = src.indexOf("\n", i);
        if (j === -1) j = n;
        out += '<span class="c">' + esc(src.slice(i, j)) + "</span>";
        i = j;
        continue;
      }

      // Triple-quoted string
      if (src.startsWith('"""', i) || src.startsWith("'''", i)) {
        var q = src.slice(i, i + 3);
        var k = src.indexOf(q, i + 3);
        if (k === -1) k = n; else k += 3;
        out += '<span class="s">' + esc(src.slice(i, k)) + "</span>";
        i = k;
        continue;
      }

      // Single/double-quoted string (no escaping of backslashes for brevity)
      if (ch === '"' || ch === "'") {
        var q2 = ch;
        var m = i + 1;
        while (m < n && src[m] !== q2 && src[m] !== "\n") m++;
        m = Math.min(m + 1, n);
        out += '<span class="s">' + esc(src.slice(i, m)) + "</span>";
        i = m;
        continue;
      }

      // Identifier / keyword
      if (/[A-Za-z_]/.test(ch)) {
        var start = i;
        while (i < n && /[A-Za-z0-9_]/.test(src[i])) i++;
        var word = src.slice(start, i);
        var before = out.replace(/<[^>]*>/g, "").trimEnd();
        if (word === "self") {
          out += '<span class="slf">' + word + "</span>";
        } else if (KEYWORDS.has(word)) {
          out += '<span class="k">' + word + "</span>";
        } else if (before.endsWith("def")) {
          out += '<span class="fn">' + word + "</span>";
        } else if (before.endsWith("class")) {
          out += '<span class="cl">' + word + "</span>";
        } else {
          out += word;
        }
        continue;
      }

      // Number
      if (/[0-9]/.test(ch)) {
        var dstart = i;
        while (i < n && /[0-9]/.test(src[i])) i++;
        out += '<span class="num">' + esc(src.slice(dstart, i)) + "</span>";
        continue;
      }

      out += esc(ch);
      i++;
    }
    return out;
  }

  /* ---------- Walkthrough content (backtick literals) ---------- */
  var W = {
    character: {
      name: "character.py",
      blurb: "The explorer's identity. The simplest of the six files — and the perfect place to learn the project's core pattern: <strong>validate through the canonical definition</strong>, then expose read-only properties.",
      steps: [
        {
          title: "Imports — the only thing we need",
          code: `"""TODO: implement your character's immutable, canonical public identity."""
from src.api import CharacterDefinition`,
          note: "The whole file needs exactly one import: <code>CharacterDefinition</code>. That class lives in <code>src.api</code> and acts as both a validator and a source of truth. We never invent our own id rules — we let the API's definition decide what's valid."
        },
        {
          title: "Constructor — build & validate first",
          code: `class Character:
    def __init__(self, agent_id: str) -> None:
        # Build the canonical definition up front so bad ids fail immediately.
        self._definition = CharacterDefinition(agent_id)
        self._agent_id = self._definition.agent_id`,
          note: "<strong>Validate first, store the result.</strong> We hand <code>agent_id</code> to <code>CharacterDefinition</code>, which checks it (non-empty, trimmed). If it's invalid, that call raises right here — before we ever store anything. Then we keep the <em>validated</em> id. This is the 'fail fast' pattern you'll see in every file."
        },
        {
          title: "Read-only property",
          code: `    @property
    def agent_id(self) -> str:
        return self._agent_id`,
          note: "A <code>@property</code> with no setter means callers can <em>read</em> <code>character.agent_id</code> but never mutate it. Identity is sealed at construction time — exactly what the workbench expects."
        }
      ]
    },

    artifact: {
      name: "artifact.py",
      blurb: "A reward sitting on a tile. Same validation-first pattern as <code>character.py</code>, but now with three fields to check.",
      steps: [
        {
          title: "Imports",
          code: `"""TODO: implement initial artifact data; introductory gameplay has no artifacts."""
from src.api import ArtifactDefinition, Position`,
          note: "We need <code>ArtifactDefinition</code> for validation and <code>Position</code> for the type hint on the position argument."
        },
        {
          title: "Constructor — validate all three fields",
          code: `class Artifact:
    def __init__(self, artifact_id: str, position: Position, value: int) -> None:
        # Build the canonical definition up front so bad ids/positions and
        # negative values fail immediately instead of being silently clamped.
        definition = ArtifactDefinition(artifact_id, position, value)
        self._artifact_id = definition.artifact_id
        self._position = definition.position
        self._value = definition.value`,
          note: "One call to <code>ArtifactDefinition</code> validates <em>everything</em>: a trimmed non-empty id, a canonical <code>Position</code>, and a non-negative value. Notice it says 'fail immediately instead of being silently clamped' — the API refuses bad data rather than quietly fixing it."
        },
        {
          title: "Three read-only properties",
          code: `    @property
    def artifact_id(self) -> str:
        return self._artifact_id

    @property
    def position(self) -> Position:
        return self._position

    @property
    def value(self) -> int:
        return self._value`,
          note: "Three immutable getters. Nothing here moves the explorer or awards points — <code>Artifact</code> is pure data. Collecting is the runtime's job."
        }
      ]
    },

    enemy: {
      name: "enemy.py",
      blurb: "A static blocker on a tile. The exact same shape as <code>artifact.py</code> — this is the pattern becoming muscle memory.",
      steps: [
        {
          title: "Imports",
          code: `"""TODO: implement initial enemy data; introductory gameplay has no enemies."""
from src.api import EnemyDefinition, Position`,
          note: "<code>EnemyDefinition</code> is the validator; <code>Position</code> is the position type."
        },
        {
          title: "Constructor",
          code: `class Enemy:
    def __init__(self, enemy_id: str, position: Position, encounter_penalty: int) -> None:
        # Mirror Character/Artifact: validate through the canonical definition so
        # bad ids/positions and negative penalties fail immediately.
        definition = EnemyDefinition(enemy_id, position, encounter_penalty)
        self._enemy_id = definition.enemy_id
        self._position = definition.position
        self._encounter_penalty = definition.encounter_penalty`,
          note: "Identical strategy to <code>Artifact</code>. The comment 'Mirror Character/Artifact' is a deliberate tell — the project wants you to build the three data classes the same way, so the pattern is consistent and hard to misuse."
        },
        {
          title: "Read-only properties",
          code: `    @property
    def enemy_id(self) -> str:
        return self._enemy_id

    @property
    def position(self) -> Position:
        return self._position

    @property
    def encounter_penalty(self) -> int:
        return self._encounter_penalty`,
          note: "Three immutable getters. Note: <code>Enemy</code> has no health, no attack, no randomness. It's just a cost on a tile — engagement logic lives in the controller and runtime."
        }
      ]
    },

    controller: {
      name: "controller.py",
      blurb: "The brain. This is the big one: it decides what the explorer does each turn. The key idea — <strong>treat every accepted action as advancing a clock</strong>, and search over <code>(position, turn, defeated)</code> states to find the cheapest plan.",
      steps: [
        {
          title: "Imports & class state",
          code: `"""TODO: select one public action from each immutable world observation."""
import heapq

from src.api import Position, WorldAction, WorldActionType, WorldSnapshot


class AgentController:
    """A new controller is constructed for each run; arrival still needs EXIT."""

    def __init__(self) -> None:
        self.turn_count = 0`,
          note: "<code>heapq</code> gives us a priority queue for the path search. The class docstring reminds us a <em>fresh</em> controller is built for every run, so any private state (like <code>turn_count</code>) starts clean each time."
        },
        {
          title: "Patrol schedule — a pure formula",
          code: `    @staticmethod
    def _patrol_position(patrol, turn):
        # The patrol moves once per accepted action, so its phase at 'turn' is
        # purely a function of the schedule and the number of accepted actions.
        phase = (patrol.initial_phase + turn) % len(patrol.positions)
        return patrol.positions[phase]`,
          note: "Patrols don't wander randomly — they walk a fixed loop. Their position on a given turn is pure math: <code>(initial_phase + turn) mod len(positions)</code>. This is the single most important idea for patrol worlds: you can predict exactly where a patrol <em>will</em> be, so you can plan around it."
        },
        {
          title: "Where patrols are, right now",
          code: `    def _patrol_cells(self, state, turn):
        return [self._patrol_position(patrol, turn) for patrol in state.level.patrols]`,
          note: "A tiny helper: asks the formula above for every patrol at a given turn and returns the list of cells they occupy. We'll call this with different turn values to look into the future."
        },
        {
          title: "Who can be engaged?",
          code: `    def _static_enemies(self, state):
        # Enemies that own a patrol are dynamic and cannot be engaged; only the
        # remaining static, undefeated enemies are clearable blockers.
        patrol_ids = {patrol.enemy_id for patrol in state.level.patrols}
        return [
            enemy for enemy in state.level.enemies
            if enemy.enemy_id not in state.defeated_enemy_ids
            and enemy.enemy_id not in patrol_ids
        ]`,
          note: "Static enemies are the only ones you can <code>ENGAGE</code>. This filters them down to: enemies that exist, haven't been defeated, and don't own a patrol. Patrols are untouchable — you only time around them."
        },
        {
          title: "The plan — an A*-style search (setup)",
          code: `    def _plan(self, state):
        """Lowest-cost path over (position, turn, defeated) states."""
        limit = state.deadline_turn if state.deadline_turn is not None else state.max_turns
        start_defeated = frozenset(state.defeated_enemy_ids)
        static_enemies = self._static_enemies(state)
        start = (state.agent_position, state.turn, start_defeated)
        dist = {start: 0}
        previous = {start: None}
        pending = [(0, start)]
        goal = None`,
          note: "The search state isn't just a position — it's a tuple of <code>(position, turn, defeated_set)</code>. Why? Because the world changes as you act (turn advances, enemies get defeated), so the 'same' tile at different times is a different situation. We track best-known cost (<code>dist</code>), how we got there (<code>previous</code>), and a priority queue (<code>pending</code>)."
        },
        {
          title: "Exploring moves — look ahead at patrol occupancy",
          code: `        moves = ((0, 1, WorldActionType.MOVE_EAST), (0, -1, WorldActionType.MOVE_WEST),
                 (1, 0, WorldActionType.MOVE_SOUTH), (-1, 0, WorldActionType.MOVE_NORTH))
        while pending:
            cost, current = heapq.heappop(pending)
            if current not in dist or cost > dist[current]:
                continue
            position, turn, defeated = current
            if position == state.level.exit:
                goal = current
                break
            if turn + 1 >= limit:
                continue
            patrol_now = self._patrol_cells(state, turn)
            patrol_next = self._patrol_cells(state, turn + 1)`,
          note: "For each state we pop the cheapest one. If it's the exit, we're done. If our next action would pass the turn limit, skip. Crucially, we look up patrol positions <em>now</em> and <em>one turn ahead</em> — because a patrol that's here next turn will collide with us."
        },
        {
          title: "Legal moves — must be safe now and next turn",
          code: `            for step_row, step_column, action_type in moves:
                step = Position(position.row + step_row, position.column + step_column)
                if not state.level.terrain.is_traversable(step):
                    continue
                # The next tile must be clear now and clear right after the move
                # advances the patrol clock (otherwise the agent collides).
                if step in patrol_now or step in patrol_next:
                    continue
                # A static enemy cell is entered only after ENGAGEing it, so it
                # is not a plain-move destination.
                if any(enemy.enemy_id not in defeated and enemy.position == step
                       for enemy in static_enemies):
                    continue
                node = (step, turn + 1, defeated)
                if cost + 1 < dist.get(node, float("inf")):
                    dist[node] = cost + 1
                    previous[node] = (current, action_type, None)
                    heapq.heappush(pending, (cost + 1, node))`,
          note: "A move is allowed only if the destination is traversable, isn't occupied by a patrol now or next turn, and isn't a static enemy cell (you must ENGAGE first). Each legal move costs 1 action, so we relax the new state with cost+1."
        },
        {
          title: "Staying put — ENGAGE and WAIT",
          code: `            # Staying put for one accepted action (ENGAGE / WAIT) is only safe if
            # no patrol is here now and none arrives afterwards.
            if position not in patrol_now and position not in patrol_next:
                for enemy in static_enemies:
                    if (enemy.enemy_id not in defeated
                            and abs(enemy.position.row - position.row)
                            + abs(enemy.position.column - position.column) == 1):
                        node = (position, turn + 1, defeated | {enemy.enemy_id})
                        step_cost = cost + 1 + enemy.encounter_penalty
                        if step_cost < dist.get(node, float("inf")):
                            dist[node] = step_cost
                            previous[node] = (current, WorldActionType.ENGAGE, enemy.enemy_id)
                            heapq.heappush(pending, (step_cost, node))
                if WorldActionType.WAIT in state.allowed_actions:
                    node = (position, turn + 1, defeated)
                    if cost + 1 < dist.get(node, float("inf")):
                        dist[node] = cost + 1
                        previous[node] = (current, WorldActionType.WAIT, None)
                        heapq.heappush(pending, (cost + 1, node))`,
          note: "You can also not-move. <code>ENGAGE</code> a neighboring static enemy: it costs 1 action <em>plus</em> the enemy's penalty, and adds the enemy to the <code>defeated</code> set. <code>WAIT</code> costs 1 action and changes nothing else. Both are skipped if a patrol is here now or arriving next."
        },
        {
          title: "Reconstruct the cheapest path",
          code: `        if goal is None:
            return None
        steps = []
        current = goal
        while current != start:
            current, action_type, target = previous[current]
            steps.append((action_type, target))
        steps.reverse()
        return steps`,
          note: "Once we reach the exit, we walk backwards through <code>previous</code> to rebuild the list of actions from start to goal, then reverse it. The result is a concrete plan: a list of <code>(action_type, target_id)</code> steps. If the exit is unreachable, we return <code>None</code>."
        },
        {
          title: "choose_action — putting it together",
          code: `    def choose_action(self, state, agent_id) -> WorldAction:
        self.turn_count += 1
        position = state.agent_position
        # If we are standing on the exit tile, leave.
        if position == state.level.exit:
            return WorldAction(action_type=WorldActionType.EXIT)
        # Collect an uncollected artifact on this tile, as long as no patrol is
        # about to arrive on this cell after the collection advances the clock.
        for artifact in state.level.artifacts:
            if (artifact.artifact_id not in state.collected_artifact_ids
                    and artifact.position == position
                    and position not in self._patrol_cells(state, state.turn + 1)):
                return WorldAction(action_type=WorldActionType.COLLECT, target_id=artifact.artifact_id)
        plan = self._plan(state)
        if plan:
            action_type, target_id = plan[0]
            return WorldAction(action_type=action_type, target_id=target_id)
        return WorldAction.wait()`,
          note: "The public entry point, in priority order: <strong>1)</strong> if we're on the exit, return EXIT. <strong>2)</strong> if an uncollected artifact is on our tile (and no patrol is arriving next turn), COLLECT it. <strong>3)</strong> otherwise run the plan and take its first step. <strong>4)</strong> if no plan exists, WAIT instead of crashing."
        }
      ]
    },

    terrain: {
      name: "terrain_generator.py",
      blurb: "Builds the floor geometry (the <code>.</code> and <code>#</code> grid). The headline requirement: <strong>deterministic</strong> — the same spec + seed must always give the same map.",
      steps: [
        {
          title: "Imports & generator state",
          code: `"""TODO: generate canonical terrain deterministically from specification and seed."""
import random

from src.api import Terrain, TerrainGenerationSpec, TerrainTopology


class TerrainGenerator:
    """Keep state local; identical inputs must also agree across fresh instances."""

    def __init__(self) -> None:
        self._last_seed = None
        self._last_spec = None
        self._generated = 0`,
          note: "<code>random</code> is the standard library RNG — but note we never use the global <code>random</code> module. We create a <em>local, seeded</em> <code>random.Random(seed)</code> inside <code>generate_terrain</code>, which is what makes output reproducible."
        },
        {
          title: "Neighbors helper",
          code: `    @staticmethod
    def _neighbors(row, column):
        return ((row - 1, column), (row + 1, column),
                (row, column - 1), (row, column + 1))`,
          note: "The four orthogonal neighbors of a cell, as a tuple. Used everywhere a generator needs to know what touches a cell."
        },
        {
          title: "Straight path — one line of floor",
          code: `    def _straight_path(self, rng, rows, columns, target):
        # A single line of floor on one axis. Prefer horizontal when it fits.
        if columns >= target:
            row = rng.randrange(rows)
            start_column = rng.randrange(0, columns - target + 1)
            return {(row, column) for column in range(start_column, start_column + target)}
        column = rng.randrange(columns)
        start_row = rng.randrange(0, rows - target + 1)
        return {(row, column) for row in range(start_row, start_row + target)}`,
          note: "Draw a single row (or column) of <code>target</code> floor cells at a random offset. If the width fits, put it horizontally; otherwise vertically. Returns a <em>set</em> of <code>(row, column)</code> cells — the floor."
        },
        {
          title: "Bent path — one L-shape",
          code: `    def _bent_path(self, rng, rows, columns, target):
        # One L-shape spanning both axes: a horizontal arm plus a vertical arm
        # sharing the corner, with total open cells == target.
        for _ in range(200):
            row = rng.randrange(rows)
            column = rng.randrange(columns)
            v_min, v_max = 2, rows - row
            h_min, h_max = 2, columns - column
            low = max(h_min, target + 1 - v_max)
            high = min(h_max, target + 1 - v_min)
            if low <= high:
                h = rng.randint(low, high)
                v = target + 1 - h
                cells = {(row, c) for c in range(column, column + h)}
                cells |= {(r, column) for r in range(row + 1, row + v)}
                return cells
        # Degenerate fallback; real BENT specs always fit.
        return self._straight_path(rng, rows, columns, target)`,
          note: "An L-shape: a horizontal arm and a vertical arm sharing a corner, totalling exactly <code>target</code> open cells. We try a few random corners and arm lengths until one satisfies the geometry; the math guarantees <code>h + v - 1 == target</code>. If none fits (shouldn't happen with real specs), fall back to a straight path."
        },
        {
          title: "Grow a connected region (tree / general)",
          code: `    def _grow_tree(self, rng, rows, columns, target, acyclic=False):
        # Grow a connected region by expanding a random frontier. For a tree,
        # a new cell may touch exactly one open neighbor, which prevents cycles.
        start = (rng.randrange(rows), rng.randrange(columns))
        opened = {start}
        frontier = [neighbor for neighbor in self._neighbors(*start)
                    if 0 <= neighbor[0] < rows and 0 <= neighbor[1] < columns]
        while len(opened) < target and frontier:
            index = rng.randrange(len(frontier))
            cell = frontier.pop(index)
            connections = [neighbor for neighbor in self._neighbors(*cell)
                           if neighbor in opened]
            if acyclic and len(connections) != 1:
                continue
            if not connections:
                continue
            opened.add(cell)
            for neighbor in self._neighbors(*cell):
                if (0 <= neighbor[0] < rows and 0 <= neighbor[1] < columns
                        and neighbor not in opened and neighbor not in frontier):
                    frontier.append(neighbor)
        return opened`,
          note: "A classic 'random frontier' flood fill. Start at a random cell and expand outward, always adding a new cell next to one we already opened. If <code>acyclic</code> is true, a new cell may touch <em>exactly one</em> open cell — which guarantees a tree (no loops), perfect for the BRANCHING_TREE topology."
        },
        {
          title: "Does the region branch?",
          code: `    @staticmethod
    def _has_branch(opened):
        for row, column in opened:
            degree = sum((neighbor in opened) for neighbor in ((row - 1, column), (row + 1, column), (row, column - 1), (row, column + 1)))
            if degree >= 3:
                return True
        return False`,
          note: "A 'branch' is a cell with at least 3 open neighbors (a junction). The branching-tree topology requires at least one of these — otherwise it's just a corridor."
        },
        {
          title: "generate_terrain — the public entry point",
          code: `    def generate_terrain(self, specification: TerrainGenerationSpec, seed: int) -> Terrain:
        self._last_seed = seed
        self._last_spec = specification
        self._generated += 1
        rng = random.Random(seed)
        rows, columns = specification.rows, specification.columns
        low, high = specification.min_open_tiles, specification.max_open_tiles
        max_cells = rows * columns
        target = min(high, max_cells) if low <= high else min(low, max_cells)
        if low != high:
            target = rng.randint(low, min(high, max_cells))
        topology = specification.topology
        if topology is TerrainTopology.STRAIGHT_PATH:
            opened = self._straight_path(rng, rows, columns, target)
        elif topology is TerrainTopology.BENT_PATH:
            opened = self._bent_path(rng, rows, columns, target)
        elif topology is TerrainTopology.BRANCHING_TREE:
            attempts = max(specification.max_attempts * 4, 8)
            opened = self._grow_tree(rng, rows, columns, target, acyclic=True)
            for _ in range(attempts):
                if len(opened) == target and self._has_branch(opened):
                    break
                opened = self._grow_tree(rng, rows, columns, target, acyclic=True)
        else:
            opened = self._grow_tree(rng, rows, columns, target)
        grid = [['#'] * columns for _ in range(rows)]
        for row, column in opened:
            grid[row][column] = '.'
        return Terrain(terrain_rows=tuple(''.join(entry) for entry in grid))`,
          note: "Seeds a local <code>random.Random(seed)</code> (the determinism key), picks how many tiles to open (from the spec's min/max), dispatches on topology to pick a generator, then writes the result into a grid of <code>#</code>, filling open cells with <code>.</code>, and wraps it in a <code>Terrain</code>. No start/exit/entities here — geometry only."
        }
      ]
    },

    level: {
      name: "level_generator.py",
      blurb: "Assembles the full world: asks an injected terrain generator for floor, picks start/exit, places the character and entities, and returns an immutable LevelDefinition.",
      steps: [
        {
          title: "Imports & injected dependency",
          code: `"""TODO: build a canonical level using the injected terrain generator."""
import random

from src.api import (
    ArtifactDefinition, CharacterDefinition, EnemyDefinition, LevelDefinition,
    LevelSpecification, Position, TerrainGeneratorContract, TerrainTopology,
)


class LevelGenerator:
    """Use the supplied TerrainGeneratorContract; do not instantiate a replacement."""

    def __init__(self, terrain_generator: TerrainGeneratorContract) -> None:
        self._generator = terrain_generator`,
          note: "The constructor receives a <code>terrain_generator</code> — we store and <em>use</em> it, never create our own. This is dependency injection: the level builder stays decoupled from any one terrain algorithm."
        },
        {
          title: "List open tiles",
          code: `    def _open_tiles(self, terrain):
        return [
            (row, column)
            for row in range(terrain.rows)
            for column in range(terrain.columns)
            if terrain.is_traversable(Position(row, column))
        ]`,
          note: "Collect every traversable (floor) cell in the terrain as a flat list of <code>(row, column)</code> pairs."
        },
        {
          title: "Dead ends — degree-one cells",
          code: `    def _degree_one(self, terrain, open_tiles):
        result = []
        for row, column in open_tiles:
            degree = sum(
                (row + dr, column + dc) in open_tiles
                for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0))
            )
            if degree == 1:
                result.append((row, column))
        return result`,
          note: "A cell with exactly one open neighbor is a dead end. For straight and bent paths, the two endpoints <em>are</em> the dead ends — so finding these gives us natural start/exit candidates."
        },
        {
          title: "Pick start & exit",
          code: `    def _pick_endpoints(self, rng, specification, terrain, open_tiles):
        topology = specification.terrain_spec.topology
        if topology in (TerrainTopology.STRAIGHT_PATH, TerrainTopology.BENT_PATH):
            ends = self._degree_one(terrain, open_tiles)
            if len(ends) >= 2:
                return Position(*ends[0]), Position(*ends[1])
        # General / tree: start at the top-left open tile, then choose an exit
        # whose route distance fits the requested bounds.
        start = Position(*open_tiles[0])
        low, high = specification.min_route_moves, specification.max_route_moves
        for row, column in open_tiles[1:]:
            candidate = Position(row, column)
            if low <= candidate.manhattan_distance(start) <= high:
                return start, candidate
        return start, Position(*open_tiles[-1])`,
          note: "For straight/bent paths, use the two dead ends as start and exit. Otherwise start at the top-left open tile and scan for a candidate whose Manhattan distance from the start fits the spec's route-move bounds. This keeps endpoints sensible and spec-compliant."
        },
        {
          title: "Place artifacts & enemies",
          code: `    def _place_entities(self, rng, specification, open_tiles, start, exit_pos):
        start_pair = (start.row, start.column)
        exit_pair = (exit_pos.row, exit_pos.column)
        artifact_blocked = set()
        enemy_blocked = {start_pair}  # enemies never occupy the start
        if not specification.allow_entities_on_endpoints:
            artifact_blocked |= {start_pair, exit_pair}
            enemy_blocked.add(exit_pair)
        artifact_pool = [tile for tile in open_tiles if tile not in artifact_blocked]
        enemy_pool = [tile for tile in open_tiles if tile not in enemy_blocked]
        rng.shuffle(artifact_pool)
        rng.shuffle(enemy_pool)
        used = set()
        artifacts = []
        for index in range(specification.artifact_count):
            if not artifact_pool:
                break
            tile = artifact_pool.pop()
            if not specification.allow_entity_overlap:
                while tile in used and artifact_pool:
                    tile = artifact_pool.pop()
                if tile in used:
                    break
            used.add(tile)
            value = rng.randint(specification.artifact_value_min, specification.artifact_value_max)
            artifacts.append(ArtifactDefinition(f"ART-{index + 1}", Position(*tile), value))
        enemies = []
        for index in range(specification.enemy_count):
            if not enemy_pool:
                break
            tile = enemy_pool.pop()
            if not specification.allow_entity_overlap:
                while tile in used and enemy_pool:
                    tile = enemy_pool.pop()
                if tile in used:
                    break
            used.add(tile)
            penalty = rng.randint(specification.enemy_penalty_min, specification.enemy_penalty_max)
            enemies.append(EnemyDefinition(f"ENM-{index + 1}", Position(*tile), penalty))
        return tuple(artifacts), tuple(enemies)`,
          note: "Shuffle the pool of valid tiles, then draw one per artifact/enemy. We respect the spec's placement rules: enemies never sit on the start, and unless <code>allow_entities_on_endpoints</code>, neither type goes on start/exit. Unless overlap is allowed, we avoid reusing a tile. Values/penalties are random within the spec's min/max bounds. Everything is built through the canonical definitions, so invalid placements raise immediately."
        },
        {
          title: "generate_level — assemble it all",
          code: `    def generate_level(self, specification: LevelSpecification, seed: int) -> LevelDefinition:
        rng = random.Random(seed)
        terrain = self._generator.generate_terrain(specification.terrain_spec, seed)
        open_tiles = self._open_tiles(terrain)
        start, exit_pos = self._pick_endpoints(rng, specification, terrain, open_tiles)
        artifacts, enemies = self._place_entities(rng, specification, open_tiles, start, exit_pos)
        return LevelDefinition(
            level_id=specification.level_id,
            profile_id=specification.profile_id,
            seed=seed,
            terrain=terrain,
            start=start,
            exit=exit_pos,
            character=CharacterDefinition(specification.agent_id),
            artifacts=artifacts,
            enemies=enemies,
        )`,
          note: "The public flow: seed the RNG, ask the <em>injected</em> terrain generator for the floor, find open tiles, pick endpoints, place entities, then wrap it all in an immutable <code>LevelDefinition</code>. Note the level is the <em>initial</em> world — never a solved route or a score."
        }
      ]
    }
  };

  /* ---------- Renderer ---------- */
  var stage = document.getElementById("wtStage");
  var fileTabs = document.querySelectorAll(".wt__file");

  function renderFile(key) {
    var data = W[key];
    if (!data || !stage) return;
    stage.innerHTML = "";

    var intro = document.createElement("div");
    intro.className = "wt__intro";
    intro.innerHTML = data.blurb;
    stage.appendChild(intro);

    data.steps.forEach(function (step, idx) {
      var card = document.createElement("div");
      card.className = "wt__step";

      var head = document.createElement("div");
      head.className = "wt__stephead";
      var num = document.createElement("span");
      num.className = "wt__stepno";
      num.textContent = (idx + 1).toString().padStart(2, "0");
      var title = document.createElement("h3");
      title.className = "wt__steptitle";
      title.textContent = step.title;
      head.appendChild(num);
      head.appendChild(title);
      card.appendChild(head);

      var code = document.createElement("pre");
      code.className = "wt__code";
      var codeEl = document.createElement("code");
      codeEl.innerHTML = highlight(step.code);
      code.appendChild(codeEl);
      card.appendChild(code);

      var note = document.createElement("div");
      note.className = "wt__note";
      note.innerHTML = step.note;
      card.appendChild(note);

      stage.appendChild(card);
    });
  }

  fileTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      activateFileTab(tab);
    });
  });

  function activateFileTab(tab) {
    fileTabs.forEach(function (t) {
      t.classList.remove("is-active");
      t.setAttribute("aria-selected", "false");
      t.tabIndex = -1;
    });
    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");
    tab.tabIndex = 0;
    renderFile(tab.getAttribute("data-file"));
  }

  function onFileTabsKeydown(e) {
    var idx = fileTabs.indexOf(document.activeElement);
    if (idx < 0) return;
    var next = null;
    if (e.key === "ArrowRight") next = (idx + 1) % fileTabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + fileTabs.length) % fileTabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = fileTabs.length - 1;
    if (next != null) {
      e.preventDefault();
      activateFileTab(fileTabs[next]);
      fileTabs[next].focus();
    }
  }
  fileTabs.forEach(function (tab, i) {
    tab.tabIndex = i === 0 ? 0 : -1;
    tab.addEventListener("keydown", onFileTabsKeydown);
  });

  if (stage) renderFile("character");

  // expose for smoke tests
  if (typeof window !== "undefined") window.WALKTHROUGH = W;
  if (typeof window !== "undefined") window.__highlight = highlight;
})();
