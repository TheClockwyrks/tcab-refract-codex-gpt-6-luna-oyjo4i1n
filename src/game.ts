import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import {
  ACTIONS,
  BACK_LABEL,
  BINDINGS,
  BOARD_CX,
  BOARD_CY,
  CAMPAIGN_LENGTH,
  CHANNELS,
  CELL_PITCH,
  CLEAR_LABEL,
  CUES,
  GRID_MAX_COLS,
  GRID_MAX_ROWS,
  HUD_SOLVED_LABEL,
  HUD_TIER_LABEL,
  MAX_TIER,
  NODE_HIT_R,
  NODE_R,
  REFRACT_DEBUG_VERSION,
  SET_LABELS,
  SOLVED_ITEMS,
  SOLVED_TITLE_TEXT,
  STAGE_CX,
  STAGE_H,
  STAGE_W,
  TAGLINE_TEXT,
  TARGET_MIN_H,
  TARGET_MIN_W,
  TIER_ADVANCE,
  TIERS,
  TITLE_ITEMS,
  TITLE_TEXT,
} from "./constants";
import { CAMPAIGN_BOARDS } from "./campaignBoards";

export type Screen =
  "title" | "howto" | "select" | "playing" | "solved" | "complete";
export type Mode = "campaign" | "cascade";
export type Channel = "triangle" | "square" | "diamond";
export type NodeKind = "emitter" | "lens" | "crystal";
export interface Cell {
  readonly col: number;
  readonly row: number;
}
export interface NodeState {
  readonly col: number;
  readonly row: number;
  readonly kind: NodeKind;
  readonly channel: Channel | null;
  readonly charges: number | null;
}
export interface BoardState {
  readonly cols: number;
  readonly rows: number;
  readonly nodes: readonly NodeState[];
}
export interface BeamState {
  readonly channel: Channel;
  readonly cells: readonly Cell[];
}
export interface TraceState {
  readonly channel: Channel;
}
export type PointerDevice = "mouse" | "pen" | "touch";
export interface PointerState {
  readonly x: number;
  readonly y: number;
  readonly down: boolean;
  readonly device: PointerDevice;
}
export interface RefractState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly board: BoardState;
  readonly beams: readonly BeamState[];
  readonly tracing: TraceState | null;
  readonly boardIndex: number;
  readonly solvedBoards: readonly number[];
  readonly unlockedCount: number;
  readonly selectIndex: number;
  readonly solvedCount: number;
  readonly tier: number;
  readonly pointer: PointerState;
  readonly armedTarget: string | null;
  readonly simTime: number;
  readonly muted: boolean;
}
export interface Target {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export interface RefractSnapshot {
  version: number;
  screen: Screen;
  mode: Mode;
  menuIndex: number;
  boardIndex: number;
  solvedBoards: number[];
  unlockedCount: number;
  selectIndex: number;
  solvedCount: number;
  tier: number;
  board: {
    cols: number;
    rows: number;
    nodes: (NodeState & { x: number; y: number; spent: number | null })[];
  };
  beams: Partial<Record<Channel, { cells: Cell[]; complete: boolean }>>;
  solved: boolean;
  tracing: { channel: string; live: Cell } | null;
  pointer: PointerState;
  targets: Target[];
  muted: boolean;
  simTime: number;
}
export interface RefractDebugApi {
  readonly version: number;
  reset(s: DeepReadonly<RefractState>): RefractState;
  snapshot(s: DeepReadonly<RefractState>): RefractSnapshot;
  reconcile(s: DeepReadonly<RefractState>): RefractState;
  setMode(s: DeepReadonly<RefractState>, mode: Mode): RefractState;
  setScreen(s: DeepReadonly<RefractState>, screen: Screen): RefractState;
  setMenuIndex(s: DeepReadonly<RefractState>, index: number): RefractState;
  setSolvedCount(s: DeepReadonly<RefractState>, count: number): RefractState;
  setTier(s: DeepReadonly<RefractState>, tier: number): RefractState;
  generateBoard(s: DeepReadonly<RefractState>, tier: number): RefractState;
  loadBoard(
    s: DeepReadonly<RefractState>,
    board: readonly string[],
  ): RefractState;
  pointerDown(
    s: DeepReadonly<RefractState>,
    x: number,
    y: number,
    device?: PointerDevice,
  ): RefractState;
  pointerMove(
    s: DeepReadonly<RefractState>,
    x: number,
    y: number,
    device?: PointerDevice,
  ): RefractState;
  pointerUp(
    s: DeepReadonly<RefractState>,
    device?: PointerDevice,
  ): RefractState;
  clear(s: DeepReadonly<RefractState>): RefractState;
}

export const BACKGROUND = "#071018";
const COLORS: Record<Channel, string> = {
  triangle: "#63e6be",
  square: "#ffbe5c",
  diamond: "#b9a2ff",
};
const EMPTY: BoardState = { cols: 0, rows: 0, nodes: [] };
const clone = <T>(s: DeepReadonly<T>): T => structuredClone(s) as T;
const center = (col: number, row: number, cols: number, rows: number) => ({
  x: BOARD_CX - ((cols - 1) * CELL_PITCH) / 2 + col * CELL_PITCH,
  y: BOARD_CY - ((rows - 1) * CELL_PITCH) / 2 + row * CELL_PITCH,
});
const same = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row;
const nodeAt = (b: BoardState, c: Cell) =>
  b.nodes.find((n) => n.col === c.col && n.row === c.row);
const spentAt = (s: DeepReadonly<RefractState>, c: Cell) =>
  s.beams.reduce(
    (n, beam) => n + beam.cells.filter((v) => same(v, c)).length,
    0,
  );
function channelComplete(
  s: DeepReadonly<RefractState>,
  channel: Channel,
): boolean {
  const beam = s.beams.find((b) => b.channel === channel);
  if (!beam || beam.cells.length < 2) return false;
  const nodes = s.board.nodes.filter((n) => n.channel === channel);
  const emitters = nodes.filter((n) => n.kind === "emitter");
  if (
    emitters.length !== 2 ||
    nodeAt(s.board, beam.cells[0]!)?.kind !== "emitter" ||
    nodeAt(s.board, beam.cells[0]!)?.channel !== channel ||
    nodeAt(s.board, beam.cells[beam.cells.length - 1]!)?.kind !== "emitter" ||
    nodeAt(s.board, beam.cells[beam.cells.length - 1]!)?.channel !== channel ||
    !emitters.every(
      (e) =>
        beam.cells.filter((c) => c.col === e.col && c.row === e.row).length ===
        1,
    )
  )
    return false;
  return (
    nodes
      .filter((n) => n.kind === "lens")
      .every((l) => {
        const visits = beam.cells
          .map((cell, i) => (same(cell, l) ? i : -1))
          .filter((i) => i >= 0);
        return (
          visits.length === 1 &&
          visits[0]! > 0 &&
          visits[0]! < beam.cells.length - 1
        );
      }) &&
    beam.cells.every((c) => {
      const n = nodeAt(s.board, c);
      return !!n && (n.channel === channel || n.kind === "crystal");
    })
  );
}
function isSolved(s: DeepReadonly<RefractState>) {
  return (
    s.beams.length > 0 &&
    s.beams.every((b) => channelComplete(s, b.channel)) &&
    s.board.nodes
      .filter((n) => n.kind === "crystal")
      .every(
        (n) =>
          spentAt(s, n) === n.charges &&
          s.beams.every((beam) =>
            beam.cells.every(
              (cell, i) =>
                !same(cell, n) || (i > 0 && i < beam.cells.length - 1),
            ),
          ),
      )
  );
}
function targets(s: DeepReadonly<RefractState>): Target[] {
  const rect = (
    id: string,
    x: number,
    y: number,
    w = TARGET_MIN_W,
    h = TARGET_MIN_H,
  ): Target => ({ id, x, y, w, h });
  if (s.screen === "title")
    return TITLE_ITEMS.map((_, i) => rect(`menu-${i}`, 470, 376 + i * 76, 340));
  if (s.screen === "howto") return [rect("back", 72, 620)];
  if (s.screen === "select")
    return [
      ...Array.from({ length: CAMPAIGN_LENGTH }, (_, i) =>
        rect(
          `board-${i + 1}`,
          294 + (i % 6) * 116,
          230 + Math.floor(i / 6) * 82,
          96,
          72,
        ),
      ),
      rect("back", 72, 620),
    ];
  if (s.screen === "playing")
    return [rect("clear", 1050, 56, 150), rect("back", 72, 56, 150)];
  if (s.screen === "solved")
    return (
      s.mode === "cascade"
        ? SOLVED_ITEMS
        : s.boardIndex < CAMPAIGN_LENGTH - 1
          ? ["NEXT", "REPLAY", "SELECT"]
          : ["REPLAY", "SELECT"]
    ).map((_, i) => rect(`menu-${i}`, 460, 369 + i * 72, 360));
  if (s.screen === "complete")
    return [rect("menu-0", 460, 369, 360), rect("menu-1", 460, 441, 360)];
  return [];
}
function parseBoard(lines: readonly string[]): BoardState {
  if (
    !lines.length ||
    lines.length > GRID_MAX_ROWS ||
    lines[0]!.length < 1 ||
    lines[0]!.length > GRID_MAX_COLS ||
    lines.some((r) => r.length !== lines[0]!.length)
  )
    throw new Error("Invalid board dimensions");
  const nodes: NodeState[] = [];
  for (let row = 0; row < lines.length; row++)
    for (let col = 0; col < lines[row]!.length; col++) {
      const ch = lines[row]![col]!;
      if (ch === ".") continue;
      const ci = {
        T: "triangle",
        t: "triangle",
        S: "square",
        s: "square",
        D: "diamond",
        d: "diamond",
      } as const;
      if (ch in ci)
        nodes.push({
          col,
          row,
          kind: ch === ch.toUpperCase() ? "emitter" : "lens",
          channel: ci[ch as keyof typeof ci],
          charges: null,
        });
      else if (/^[123]$/.test(ch))
        nodes.push({
          col,
          row,
          kind: "crystal",
          channel: null,
          charges: Number(ch),
        });
      else throw new Error(`Unknown board notation: ${ch}`);
    }
  const channels = CHANNELS.filter((c) => nodes.some((n) => n.channel === c));
  for (const c of channels)
    if (
      nodes.filter((n) => n.channel === c && n.kind === "emitter").length !== 2
    )
      throw new Error(`Channel ${c} needs exactly two emitters`);
  if (!channels.length) throw new Error("Board needs at least one channel");
  return { cols: lines[0]!.length, rows: lines.length, nodes };
}
function variant(lines: readonly string[]): BoardState {
  const flipRows = Math.random() < 0.5;
  const flipColumns = Math.random() < 0.5;
  const oriented = flipRows ? [...lines].reverse() : [...lines];
  return parseBoard(
    oriented.map((line) => (flipColumns ? [...line].reverse().join("") : line)),
  );
}
const beamsFor = (board: BoardState): BeamState[] =>
  CHANNELS.filter((c) => board.nodes.some((n) => n.channel === c)).map(
    (channel) => ({ channel, cells: [] }),
  );
function putBoard(
  s: DeepReadonly<RefractState>,
  board: BoardState,
  extras: Partial<RefractState> = {},
): RefractState {
  return {
    ...s,
    ...extras,
    board,
    beams: beamsFor(board),
    tracing: null,
    screen: "playing",
    menuIndex: 0,
    armedTarget: null,
  };
}
function genBoard(tier: number): BoardState {
  if (!Number.isInteger(tier) || tier < 1 || tier > MAX_TIER)
    throw new Error(`tier must be between 1 and ${MAX_TIER}`);
  const spec = TIERS[tier - 1]!;
  const cols = Math.max(
    spec.minCols,
    Math.min(spec.maxCols, tier === 1 ? 3 : spec.minCols),
  );
  const rows = Math.max(
    spec.minRows,
    Math.min(spec.maxRows, tier === 1 ? 3 : spec.minRows),
  );
  const channels = CHANNELS.slice(0, spec.channels);
  const lines = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => "."),
  );
  if (tier === 1) {
    return variant(["Ttt", "ttt", "ttT"]);
  }
  if (tier === 2) {
    return variant(["Tttt", "ttTt", "Ssss", "ssSs"]);
  }
  if (tier === 3) {
    return variant(["T...T", "ttttt", "..22.", "sssss", "S...S"]);
  }
  if (tier === 4) {
    return variant(["T...T.", "t1tttD", "..22.d", "sssssd", "S...SD"]);
  }
  // Separate rows keep later channel routes independent and let the first
  // channel spend a continuous run of single-charge crystals.
  channels.forEach((ch, ci) => {
    const r = ci;
    const e = ch === "triangle" ? "T" : ch === "square" ? "S" : "D";
    lines[r]![0] = e;
    lines[r]![cols - 1] = e;
    for (let x = 1; x < cols - 1; x++) {
      lines[r]![x] =
        ci === 0 && spec.minCrystals > 0
          ? "1"
          : ch === "triangle"
            ? "t"
            : ch === "square"
              ? "s"
              : "d";
    }
  });
  return variant(lines.map((row) => row.join("")));
}

function applyPointer(
  s: DeepReadonly<RefractState>,
  kind: "down" | "move" | "up",
  x: number,
  y: number,
  device: PointerDevice = "mouse",
): RefractState {
  let n: RefractState = {
    ...s,
    pointer: {
      x,
      y,
      down: kind === "down" ? true : kind === "up" ? false : s.pointer.down,
      device,
    },
  };
  const hit = targets(n).find(
    (t) => x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h,
  );
  if (n.screen !== "playing") {
    if (kind === "move" && !n.pointer.down && hit)
      n = {
        ...n,
        menuIndex: hit.id.startsWith("menu-")
          ? Number(hit.id.slice(5))
          : hit.id.startsWith("board-")
            ? Number(hit.id.slice(6)) - 1
            : n.menuIndex,
        selectIndex: hit.id.startsWith("board-")
          ? Number(hit.id.slice(6)) - 1
          : n.selectIndex,
      };
    if (kind === "down")
      n = {
        ...n,
        armedTarget: hit?.id ?? null,
        menuIndex: hit?.id.startsWith("menu-")
          ? Number(hit.id.slice(5))
          : n.menuIndex,
        selectIndex: hit?.id.startsWith("board-")
          ? Number(hit.id.slice(6)) - 1
          : n.selectIndex,
      };
    if (kind === "up") {
      const armed = n.armedTarget;
      n = { ...n, armedTarget: null };
      if (armed && hit?.id === armed) n = takeTarget(n, armed);
    }
    return n;
  }
  if (kind === "down") {
    if (hit) return { ...n, armedTarget: hit.id };
    const node = nearestNode(n.board, x, y);
    if (node) n = beginTrace(n, node);
  }
  if (kind === "move" && n.tracing) {
    const node = nearestNode(n.board, x, y);
    if (node) n = moveBeam(n, node);
  }
  if (kind === "up") {
    const armed = n.armedTarget;
    n = { ...n, tracing: null, armedTarget: null };
    n = n.beams.some((b) => b.cells.length === 1)
      ? {
          ...n,
          beams: n.beams.map((b) =>
            b.cells.length === 1 ? { ...b, cells: [] } : b,
          ),
        }
      : n;
    if (armed && hit?.id === armed) n = takeTarget(n, armed);
  }
  if (n.screen === "playing" && isSolved(n)) n = solveBoard(n);
  return n;
}
function nearestNode(
  board: BoardState,
  x: number,
  y: number,
): NodeState | undefined {
  return board.nodes.find((n) => {
    const p = center(n.col, n.row, board.cols, board.rows);
    return Math.hypot(x - p.x, y - p.y) <= NODE_HIT_R;
  });
}
function beginTrace(s: RefractState, node: NodeState): RefractState {
  const cell = { col: node.col, row: node.row };
  const beam = s.beams.find((b) => b.channel === node.channel);
  if (node.kind === "emitter" && beam?.cells.length === 0)
    return {
      ...s,
      beams: s.beams.map((b) =>
        b.channel === node.channel ? { ...b, cells: [cell] } : b,
      ),
      tracing: { channel: node.channel! },
    };
  const candidates = s.beams
    .map((b) => ({
      beam: b,
      indices: b.cells
        .map((c, i) => (same(c, cell) ? i : -1))
        .filter((i) => i >= 0),
    }))
    .filter(({ indices }) => indices.length > 0);
  const end = candidates.find(
    ({ beam, indices }) =>
      indices.includes(0) || indices.includes(beam.cells.length - 1),
  );
  const through = candidates.filter(
    ({ beam, indices }) =>
      !indices.includes(0) && !indices.includes(beam.cells.length - 1),
  );
  const chosen = end ?? (through.length === 1 ? through[0] : undefined);
  if (chosen) {
    const { beam: b, indices } = chosen;
    let cells = [...b.cells];
    if (indices.includes(cells.length - 1)) {
      // Already oriented from this end.
    } else if (indices.includes(0)) cells.reverse();
    else cells = cells.slice(0, indices[indices.length - 1]! + 1);
    return {
      ...s,
      beams: s.beams.map((v) =>
        v.channel === b.channel ? { ...v, cells } : v,
      ),
      tracing: { channel: b.channel },
    };
  }
  return s;
}
function moveBeam(s: RefractState, node: NodeState): RefractState {
  const b = s.beams.find((v) => v.channel === s.tracing?.channel);
  if (!b?.cells.length) return s;
  const target = { col: node.col, row: node.row };
  const end = b.cells[b.cells.length - 1]!;
  const prev = b.cells[b.cells.length - 2];
  if (nodeAt(s.board, end)?.kind === "emitter" && b.cells.length > 1) return s;
  if (prev && same(prev, target))
    return {
      ...s,
      beams: s.beams.map((v) =>
        v.channel === b.channel ? { ...v, cells: v.cells.slice(0, -1) } : v,
      ),
    };
  const dc = Math.abs(target.col - end.col),
    dr = Math.abs(target.row - end.row);
  if (
    dc > 1 ||
    dr > 1 ||
    (!dc && !dr) ||
    (node.channel && node.channel !== b.channel)
  )
    return s;
  if (!segmentLegal(s, b, target)) return s;
  const beams = s.beams.map((v) =>
    v.channel === b.channel ? { ...v, cells: [...v.cells, target] } : v,
  );
  const next = { ...s, beams };
  return next;
}
function segmentLegal(s: RefractState, beam: BeamState, target: Cell): boolean {
  const start = beam.cells[beam.cells.length - 1]!;
  const crystal = nodeAt(s.board, target);
  if (crystal?.kind === "crystal" && spentAt(s, target) >= crystal.charges!)
    return false;
  const targetNode = nodeAt(s.board, target);
  const visits = beam.cells.filter((c) => same(c, target)).length;
  if (targetNode?.kind === "emitter" && visits > 0) return false;
  if (targetNode?.kind === "lens" && visits >= 1) return false;
  if (
    s.beams.some((b) =>
      b.cells
        .slice(1)
        .some(
          (c, i) =>
            (same(b.cells[i]!, start) && same(c, target)) ||
            (same(b.cells[i]!, target) && same(c, start)),
        ),
    )
  )
    return false;
  if (start.col !== target.col && start.row !== target.row)
    for (const b of s.beams)
      for (let i = 1; i < b.cells.length; i++) {
        const a = b.cells[i - 1]!,
          z = b.cells[i]!;
        if (
          a.col !== z.col &&
          a.row !== z.row &&
          Math.min(a.col, z.col) === Math.min(start.col, target.col) &&
          Math.min(a.row, z.row) === Math.min(start.row, target.row) &&
          (a.col - z.col) * (a.row - z.row) !==
            (start.col - target.col) * (start.row - target.row)
        )
          return false;
      }
  if (
    nodeAt(s.board, start)?.kind === "emitter" &&
    beam.cells.filter((c) => same(c, start)).length > 1
  )
    return false;
  return true;
}

function takeTarget(s: RefractState, id: string): RefractState {
  if (id === "back")
    return s.screen === "howto"
      ? { ...s, screen: "title", menuIndex: 2, armedTarget: null }
      : s.screen === "select"
        ? { ...s, screen: "title", menuIndex: 0, armedTarget: null }
        : s.mode === "campaign"
          ? {
              ...s,
              screen: "select",
              selectIndex: s.boardIndex,
              beams: beamsFor(EMPTY),
              tracing: null,
              armedTarget: null,
            }
          : {
              ...s,
              screen: "title",
              menuIndex: 1,
              board: EMPTY,
              beams: [],
              tracing: null,
              armedTarget: null,
            };
  if (id === "clear") return clearState(s);
  if (id.startsWith("board-")) {
    const i = Number(id.slice(6)) - 1;
    return i < s.unlockedCount
      ? putBoard(
          { ...s, boardIndex: i, selectIndex: i },
          parseBoard(CAMPAIGN_BOARDS[i]!),
        )
      : s;
  }
  if (id.startsWith("menu-")) return choose(s, Number(id.slice(5)));
  return s;
}
function choose(s: RefractState, i: number): RefractState {
  if (s.screen === "title") {
    if (i === 0)
      return {
        ...s,
        mode: "campaign",
        screen: "select",
        selectIndex: s.boardIndex,
        menuIndex: 0,
        armedTarget: null,
      };
    if (i === 1)
      return putBoard(
        { ...s, mode: "cascade", solvedCount: 0, tier: 1 },
        genBoard(1),
      );
    return { ...s, screen: "howto", menuIndex: 0, armedTarget: null };
  }
  if (s.screen === "select")
    return i < s.unlockedCount
      ? putBoard(
          { ...s, boardIndex: i, selectIndex: i },
          parseBoard(CAMPAIGN_BOARDS[i]!),
        )
      : s;
  if (s.screen === "solved" && s.mode === "cascade")
    return i === 0
      ? putBoard(s, genBoard(s.tier))
      : putBoard({ ...s, solvedCount: 0, tier: 1 }, genBoard(1));
  if (s.screen === "solved") {
    if (i === 0 && s.boardIndex < 23)
      return putBoard(
        { ...s, boardIndex: s.boardIndex + 1, selectIndex: s.boardIndex + 1 },
        parseBoard(CAMPAIGN_BOARDS[s.boardIndex + 1]!),
      );
    if ((s.boardIndex === 23 && i === 0) || (i === 1 && s.boardIndex < 23))
      return putBoard(s, parseBoard(CAMPAIGN_BOARDS[s.boardIndex]!));
    return {
      ...s,
      screen: "select",
      selectIndex: s.boardIndex,
      menuIndex: 0,
      armedTarget: null,
    };
  }
  if (s.screen === "complete")
    return i === 0
      ? { ...s, screen: "select", selectIndex: s.boardIndex }
      : { ...s, screen: "title", menuIndex: 0 };
  return s;
}
function clearState(s: RefractState): RefractState {
  return {
    ...s,
    beams: s.beams.map((b) => ({ ...b, cells: [] })),
    tracing: null,
    armedTarget: null,
  };
}
function solveBoard(s: RefractState): RefractState {
  if (s.mode === "cascade") {
    const solvedCount = s.solvedCount + 1;
    return {
      ...s,
      solvedCount,
      tier: Math.min(Math.floor(solvedCount / TIER_ADVANCE) + 1, MAX_TIER),
      screen: "solved",
      menuIndex: 0,
      tracing: null,
    };
  }
  const solvedBoards = [...new Set([...s.solvedBoards, s.boardIndex])].sort(
    (a, b) => a - b,
  );
  const unlockedCount = Math.min(
    CAMPAIGN_LENGTH,
    Math.max(s.unlockedCount, s.boardIndex + 2),
  );
  return {
    ...s,
    solvedBoards,
    unlockedCount,
    screen:
      unlockedCount === CAMPAIGN_LENGTH &&
      solvedBoards.length === CAMPAIGN_LENGTH
        ? "complete"
        : "solved",
    menuIndex: 0,
    tracing: null,
  };
}
function initial(): RefractState {
  return {
    screen: "title",
    mode: "campaign",
    menuIndex: 0,
    board: EMPTY,
    beams: [],
    tracing: null,
    boardIndex: 0,
    solvedBoards: [],
    unlockedCount: 1,
    selectIndex: 0,
    solvedCount: 0,
    tier: 1,
    pointer: { x: 0, y: 0, down: false, device: "mouse" },
    armedTarget: null,
    simTime: 0,
    muted: false,
  };
}
function snapshot(s: DeepReadonly<RefractState>): RefractSnapshot {
  const beams: RefractSnapshot["beams"] = {};
  for (const b of s.beams)
    beams[b.channel] = {
      cells: b.cells.map((cell) => ({ ...cell })),
      complete: channelComplete(s, b.channel),
    };
  return {
    version: REFRACT_DEBUG_VERSION,
    screen: s.screen,
    mode: s.mode,
    menuIndex: s.menuIndex,
    boardIndex: s.boardIndex,
    solvedBoards: [...s.solvedBoards],
    unlockedCount: s.unlockedCount,
    selectIndex: s.selectIndex,
    solvedCount: s.solvedCount,
    tier: s.tier,
    board: {
      cols: s.board.cols,
      rows: s.board.rows,
      nodes: s.board.nodes.map((n) => ({
        ...n,
        ...center(n.col, n.row, s.board.cols, s.board.rows),
        spent: n.kind === "crystal" ? spentAt(s, n) : null,
      })),
    },
    beams,
    solved: isSolved(s),
    tracing:
      s.tracing &&
      s.beams.find((b) => b.channel === s.tracing!.channel)?.cells.length
        ? {
            channel: s.tracing.channel,
            live: {
              ...s.beams
                .find((b) => b.channel === s.tracing!.channel)!
                .cells.slice(-1)[0]!,
            },
          }
        : null,
    pointer: clone(s.pointer),
    targets: targets(s),
    muted: s.muted,
    simTime: s.simTime,
  };
}

export const game: Game<RefractState, RefractDebugApi> = {
  initialize(api: InitApi<RefractState>) {
    for (const action of ACTIONS)
      api.input.register(action, {
        keys: [...BINDINGS[action]],
        kind: "digital",
      });
    api.audio.define(CUES.connect, {
      wave: "sine",
      freq: 560,
      freqTo: 820,
      gain: 0.14,
      durationMs: 65,
    });
    api.audio.define(CUES.retract, {
      wave: "triangle",
      freq: 310,
      freqTo: 180,
      gain: 0.12,
      durationMs: 70,
    });
    api.audio.define(CUES.channelComplete, {
      wave: "sine",
      freq: 720,
      freqTo: 980,
      gain: 0.17,
      durationMs: 150,
    });
    api.audio.define(CUES.solved, {
      wave: "triangle",
      freq: 520,
      freqTo: 1040,
      gain: 0.2,
      durationMs: 260,
    });
    api.audio.define(CUES.clear, {
      wave: "sawtooth",
      freq: 260,
      freqTo: 120,
      gain: 0.1,
      durationMs: 100,
    });
    for (const name of [
      "screen",
      "mode",
      "board-size",
      "triangle",
      "square",
      "diamond",
      "crystals",
      "solved",
      "pointer",
    ])
      api.diagnostics.register(name, (s) => {
        if (name === "screen") return s.screen;
        if (name === "mode") return s.mode;
        if (name === "board-size") return `${s.board.cols}×${s.board.rows}`;
        if (name === "solved") return isSolved(s);
        if (name === "pointer")
          return `${s.pointer.x.toFixed(0)},${s.pointer.y.toFixed(0)} ${s.pointer.device}`;
        if (name === "crystals")
          return (
            s.board.nodes
              .filter((n) => n.kind === "crystal")
              .map((n) => `${spentAt(s, n)}/${n.charges}`)
              .join(" ") || "none"
          );
        const c = name as Channel;
        const b = s.beams.find((v) => v.channel === c);
        return b
          ? `${b.cells.length} ${channelComplete(s, c) ? "complete" : "open"}`
          : "—";
      });
    const debug: RefractDebugApi = {
      version: REFRACT_DEBUG_VERSION,
      reset: (s) => ({ ...initial(), muted: s.muted }),
      snapshot,
      reconcile: (s) => clone(s),
      setMode: (s, mode) => ({ ...s, mode }),
      setScreen: (s, screen) => ({ ...s, screen, armedTarget: null }),
      setMenuIndex: (s, menuIndex) => ({ ...s, menuIndex }),
      setSolvedCount: (s, solvedCount) => ({ ...s, solvedCount }),
      setTier: (s, tier) => ({ ...s, tier }),
      generateBoard: (s, tier) => putBoard(s, genBoard(tier)),
      loadBoard: (s, rows) => putBoard(s, parseBoard(rows)),
      pointerDown: (s, x, y, device = "mouse") =>
        applyPointer(s, "down", x, y, device),
      pointerMove: (s, x, y, device = "mouse") =>
        applyPointer(s, "move", x, y, device),
      pointerUp: (s, device = "mouse") =>
        applyPointer(s, "up", s.pointer.x, s.pointer.y, device),
      clear: clearState,
    };
    return [initial(), debug];
  },
  update(
    state: DeepReadonly<RefractState>,
    api: UpdateApi,
    dt: number,
  ): RefractState {
    let s = {
      ...state,
      simTime: state.simTime + dt,
      muted: api.audio.muted(),
    } as RefractState;
    if (api.input.pressed("mute")) {
      api.audio.setMuted(!api.audio.muted());
      s = { ...s, muted: api.audio.muted() };
    }
    const p = api.input.pointer();
    const samples = api.input.pointerSamples().filter((v) => v.primary);
    for (const sample of samples) {
      const before = s;
      s = applyPointer(s, sample.type, sample.x, sample.y, sample.device);
      const cleared =
        sample.type === "up" &&
        before.armedTarget === "clear" &&
        before.beams.some((beam) => beam.cells.length > 1);
      if (cleared) api.audio.play(CUES.clear);
      else {
        for (const oldBeam of before.beams) {
          const newBeam = s.beams.find(
            (beam) => beam.channel === oldBeam.channel,
          );
          const oldSegments = Math.max(0, oldBeam.cells.length - 1);
          const newSegments = Math.max(0, (newBeam?.cells.length ?? 0) - 1);
          if (newSegments > oldSegments) {
            api.audio.play(CUES.connect);
            if (newBeam && channelComplete(s, newBeam.channel))
              api.audio.play(CUES.channelComplete);
          } else if (newSegments < oldSegments) api.audio.play(CUES.retract);
        }
      }
      if (s.screen === "playing" && isSolved(s)) break;
    }
    if (!samples.length) {
      if (api.input.pointerPressed())
        s = applyPointer(s, "down", p.x, p.y, p.device);
      if (
        s.pointer.down &&
        p.down &&
        (p.x !== s.pointer.x || p.y !== s.pointer.y)
      )
        s = applyPointer(s, "move", p.x, p.y, p.device);
      if (api.input.pointerReleased())
        s = applyPointer(s, "up", p.x, p.y, p.device);
    }
    const activeMenu =
      s.screen === "title"
        ? TITLE_ITEMS.length
        : s.screen === "solved"
          ? s.mode === "cascade"
            ? 2
            : s.boardIndex < 23
              ? 3
              : 2
          : s.screen === "complete"
            ? 2
            : 0;
    const selectMove = s.screen === "select";
    if (api.input.pressed("up"))
      s = {
        ...s,
        menuIndex:
          (s.menuIndex + (selectMove ? 4 : activeMenu) - 1) %
          (selectMove ? 24 : Math.max(activeMenu, 1)),
        selectIndex: selectMove ? (s.selectIndex + 20) % 24 : s.selectIndex,
      };
    if (api.input.pressed("down"))
      s = {
        ...s,
        menuIndex: (s.menuIndex + 1) % Math.max(activeMenu, 1),
        selectIndex: selectMove ? (s.selectIndex + 6) % 24 : s.selectIndex,
      };
    if (selectMove && api.input.pressed("left"))
      s = {
        ...s,
        selectIndex:
          Math.floor(s.selectIndex / 6) * 6 + (((s.selectIndex % 6) + 5) % 6),
      };
    if (selectMove && api.input.pressed("right"))
      s = {
        ...s,
        selectIndex:
          Math.floor(s.selectIndex / 6) * 6 + (((s.selectIndex % 6) + 1) % 6),
      };
    if (api.input.pressed("back")) s = takeTarget(s, "back");
    if (s.screen === "playing" && api.input.pressed("clear")) {
      if (s.beams.some((b) => b.cells.length > 1)) api.audio.play(CUES.clear);
      s = clearState(s);
    }
    if (api.input.pressed("confirm"))
      s =
        s.screen === "select"
          ? choose(s, s.selectIndex)
          : s.screen === "playing"
            ? s
            : choose(s, s.menuIndex);
    if (s.screen === "playing" && isSolved(s)) s = solveBoard(s);
    if (state.screen === "playing" && s.screen !== "playing")
      api.audio.play(CUES.solved);
    return s;
  },
  render(state: DeepReadonly<RefractState>, api: RenderApi) {
    draw(state, api);
  },
};

function draw(s: DeepReadonly<RefractState>, api: RenderApi) {
  const c = api.ctx;
  c.fillStyle = BACKGROUND;
  c.fillRect(0, 0, STAGE_W, STAGE_H);
  const g = c.createRadialGradient(STAGE_CX, 340, 90, STAGE_CX, 340, 720);
  g.addColorStop(0, "#122a38");
  g.addColorStop(1, BACKGROUND);
  c.fillStyle = g;
  c.fillRect(0, 0, STAGE_W, STAGE_H);
  c.strokeStyle = "rgba(120,190,208,.08)";
  c.lineWidth = 1;
  for (let x = 0; x < STAGE_W; x += 32) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, STAGE_H);
    c.stroke();
  }
  for (let y = 0; y < STAGE_H; y += 32) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(STAGE_W, y);
    c.stroke();
  }
  if (s.board.cols && ["playing", "solved", "complete"].includes(s.screen))
    drawBoard(s, c);
  if (s.screen === "title") {
    text(c, TITLE_TEXT, STAGE_CX, 170, 74, "#eaf7f7", 700);
    text(c, TAGLINE_TEXT, STAGE_CX, 220, 17, "#71cfce", 600);
    TITLE_ITEMS.forEach((v, i) =>
      menuCard(c, v, STAGE_CX, 412 + i * 76, i === s.menuIndex),
    );
    text(
      c,
      "A PUZZLE OF LIGHT · 24 HAND-CRAFTED BOARDS",
      STAGE_CX,
      650,
      13,
      "#65818d",
      500,
    );
  }
  if (s.screen === "howto") {
    panel(c, 210, 100, 860, 520);
    text(c, "HOW TO PLAY", STAGE_CX, 154, 30, "#ecf7f7", 700);
    const lines = [
      "Each channel has two emitters and its own lenses.",
      "Press an emitter and drag through adjacent nodes to draw a beam.",
      "Pass through every lens once, then reach the other emitter.",
      "Any beam may cross a crystal; spend every charge exactly once.",
      "A segment can be drawn once. Diagonal crossings are exclusive.",
      "Other channels' emitters and lenses block your beam.",
      "Illegal moves are ignored. Release to keep your route; trace an end to resume.",
      "Clear the board with R. Move menus with arrows or WASD; Enter confirms.",
      "Use Escape to go back and M to mute sound.",
    ];
    lines.forEach((v, i) =>
      text(c, v, STAGE_CX, 230 + i * 36, 17, "#c2d6db", 400),
    );
    button(c, BACK_LABEL, 72, 620);
  }
  if (s.screen === "select") {
    text(c, "CAMPAIGN", STAGE_CX, 92, 30, "#eaf7f7", 700);
    text(c, "CHOOSE A BOARD", STAGE_CX, 124, 13, "#7e9ca6", 500);
    SET_LABELS.forEach((set, r) => {
      text(c, set, 208, 260 + r * 82, 13, "#6f929d", 700, "right");
      for (let col = 0; col < 6; col++) {
        const i = r * 6 + col,
          x = 294 + col * 116,
          y = 230 + r * 82,
          solved = s.solvedBoards.includes(i),
          open = i < s.unlockedCount;
        panel(c, x, y, 96, 72);
        c.fillStyle =
          i === s.selectIndex
            ? "#a5fcdb"
            : solved
              ? "#4ca88e"
              : open
                ? "#243e48"
                : "#111d25";
        c.fillRect(x, y, 96, 3);
        text(
          c,
          String(i + 1).padStart(2, "0"),
          x + 48,
          y + 42,
          22,
          open ? "#e8f8f3" : "#52616a",
          700,
        );
        text(
          c,
          solved ? "CLEARED" : open ? "OPEN" : "LOCKED",
          x + 48,
          y + 60,
          9,
          open ? "#86cebb" : "#53616b",
          600,
        );
      }
    });
    button(c, BACK_LABEL, 72, 620);
  }
  if (s.screen === "playing") {
    button(c, BACK_LABEL, 72, 56);
    button(c, `${CLEAR_LABEL}  ·  R`, 1050, 56);
    if (s.mode === "cascade") {
      text(
        c,
        `${HUD_SOLVED_LABEL}  ${s.solvedCount}`,
        STAGE_CX - 130,
        56,
        14,
        "#b8d2d7",
        600,
      );
      text(
        c,
        `${HUD_TIER_LABEL}  ${s.tier}`,
        STAGE_CX + 130,
        56,
        14,
        "#b8d2d7",
        600,
      );
    } else
      text(
        c,
        `CAMPAIGN   ${String(s.boardIndex + 1).padStart(2, "0")} / 24`,
        STAGE_CX,
        56,
        14,
        "#b8d2d7",
        600,
      );
    drawProgress(s, c);
  }
  if (s.screen === "solved" || s.screen === "complete") {
    c.fillStyle = "rgba(3,10,15,.74)";
    c.fillRect(0, 0, STAGE_W, STAGE_H);
    panel(c, 390, 210, 500, 380);
    text(
      c,
      s.screen === "complete" ? "COURSE COMPLETE" : SOLVED_TITLE_TEXT,
      STAGE_CX,
      272,
      31,
      "#edfff9",
      700,
    );
    text(
      c,
      s.screen === "complete"
        ? "ALL 24 BOARDS SOLVED"
        : s.mode === "campaign"
          ? `BOARD ${s.boardIndex + 1} COMPLETE`
          : `${s.solvedCount} BOARDS SOLVED`,
      STAGE_CX,
      312,
      14,
      "#8ab6b3",
      600,
    );
    const items =
      s.screen === "complete"
        ? ["BACK TO SELECT", "TITLE"]
        : s.mode === "cascade"
          ? SOLVED_ITEMS
          : s.boardIndex < 23
            ? ["NEXT BOARD", "REPLAY", "BACK TO SELECT"]
            : ["REPLAY", "BACK TO SELECT"];
    items.forEach((v, i) =>
      menuCard(c, v, STAGE_CX, 405 + i * 72, i === s.menuIndex),
    );
  }
}
function drawBoard(s: DeepReadonly<RefractState>, c: CanvasRenderingContext2D) {
  for (let r = 0; r < s.board.rows; r++)
    for (let col = 0; col < s.board.cols; col++) {
      const p = center(col, r, s.board.cols, s.board.rows);
      c.fillStyle = "rgba(173,213,220,.035)";
      c.beginPath();
      c.arc(p.x, p.y, 31, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "rgba(142,190,201,.11)";
      c.stroke();
    }
  for (const b of s.beams) {
    if (b.cells.length < 2) continue;
    c.save();
    c.strokeStyle = COLORS[b.channel];
    c.lineWidth = 7;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.shadowColor = COLORS[b.channel];
    c.shadowBlur = 18;
    c.beginPath();
    b.cells.forEach((cell, i) => {
      const p = center(cell.col, cell.row, s.board.cols, s.board.rows);
      if (i) c.lineTo(p.x, p.y);
      else c.moveTo(p.x, p.y);
    });
    c.stroke();
    c.restore();
  }
  for (const n of s.board.nodes) {
    const p = center(n.col, n.row, s.board.cols, s.board.rows);
    c.save();
    c.translate(p.x, p.y);
    if (n.kind === "crystal") {
      c.rotate(Math.PI / 4);
      c.fillStyle = "#172b37";
      c.strokeStyle = "#65d9ed";
      c.lineWidth = 2;
      c.shadowColor = "#56d8ee";
      c.shadowBlur = 12;
      c.fillRect(-20, -20, 40, 40);
      c.strokeRect(-20, -20, 40, 40);
      c.restore();
      text(
        c,
        `${spentAt(s, n)}/${n.charges}`,
        p.x,
        p.y + 5,
        13,
        "#d9fbff",
        700,
      );
      continue;
    }
    const color = COLORS[n.channel!];
    c.beginPath();
    if (n.channel === "triangle") {
      c.moveTo(0, -NODE_R);
      c.lineTo(NODE_R * 0.9, NODE_R * 0.72);
      c.lineTo(-NODE_R * 0.9, NODE_R * 0.72);
      c.closePath();
    } else if (n.channel === "square")
      c.rect(-NODE_R * 0.72, -NODE_R * 0.72, NODE_R * 1.44, NODE_R * 1.44);
    else {
      c.moveTo(0, -NODE_R);
      c.lineTo(NODE_R * 0.72, 0);
      c.lineTo(0, NODE_R);
      c.lineTo(-NODE_R * 0.72, 0);
      c.closePath();
    }
    c.fillStyle = n.kind === "lens" ? color : "#0b1820";
    c.strokeStyle = color;
    c.lineWidth = 3;
    c.shadowColor = color;
    c.shadowBlur = 12;
    c.fill();
    c.stroke();
    c.restore();
  }
}
function drawProgress(
  s: DeepReadonly<RefractState>,
  c: CanvasRenderingContext2D,
) {
  let x = 460;
  for (const b of s.beams) {
    const color = COLORS[b.channel];
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, 680, 6, 0, Math.PI * 2);
    c.fill();
    text(c, b.channel.toUpperCase(), x + 14, 684, 11, "#a8c0c5", 600, "left");
    text(
      c,
      channelComplete(s, b.channel) ? "✓" : "○",
      x + 94,
      684,
      13,
      color,
      700,
    );
    x += 190;
  }
}
function text(
  c: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight: number,
  align: CanvasTextAlign = "center",
) {
  c.fillStyle = color;
  c.font = `${weight} ${size}px ui-sans-serif,system-ui,sans-serif`;
  c.textAlign = align;
  c.textBaseline = "middle";
  c.fillText(str, x, y);
}
function panel(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  c.fillStyle = "rgba(11,24,32,.94)";
  c.strokeStyle = "rgba(112,197,195,.28)";
  c.lineWidth = 1;
  c.beginPath();
  c.roundRect(x, y, w, h, 12);
  c.fill();
  c.stroke();
}
function menuCard(
  c: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  active: boolean,
) {
  panel(c, x - 170, y - 27, 340, 54);
  if (active) {
    c.fillStyle = "#a5fcdb";
    c.fillRect(x - 170, y - 27, 3, 54);
  }
  text(c, label, x, y, 16, active ? "#e4fff5" : "#87a1a9", active ? 700 : 500);
}
function button(
  c: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
) {
  panel(c, x, y, 150, 52);
  text(c, label, x + 75, y + 27, 13, "#cce0e1", 700);
}
