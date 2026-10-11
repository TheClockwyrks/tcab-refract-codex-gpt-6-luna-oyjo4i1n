import { describe, expect, it } from "vitest";
import { game, type RefractState } from "./game";
import type { InitApi } from "@clockwyrks/simple-2d";

async function setup() {
  const noop = () => undefined;
  const api = {
    input: { register: noop, layout: () => null },
    audio: { define: noop, load: async () => undefined },
    assets: {
      loadImage: async () => ({}) as ImageBitmap,
      loadAudio: async () => ({}) as AudioBuffer,
      load: async () => new Blob(),
      resolve: (p: string) => p,
    },
    diagnostics: { register: noop },
    events: { on: noop },
    viewport: () => ({}),
  } as unknown as InitApi<RefractState>;
  return await game.initialize(api);
}

describe("Refract simulation surface", () => {
  it("starts with a complete title state and a versioned snapshot", async () => {
    const [state, debug] = await setup();
    expect(state.screen).toBe("title");
    expect(debug.snapshot(state).version).toBe(2);
    expect(debug.snapshot(state).targets.map((t) => t.id)).toEqual([
      "menu-0",
      "menu-1",
      "menu-2",
    ]);
  });

  it("loads notation, derives geometry and crystal charges, and clears beams", async () => {
    const [state, debug] = await setup();
    const board = debug.loadBoard(state, ["TtT", "1.."]).board;
    expect(board).toMatchObject({ cols: 3, rows: 2 });
    expect(
      board.nodes.some(
        (node) =>
          node.col === 0 &&
          node.row === 1 &&
          node.kind === "crystal" &&
          node.charges === 1,
      ),
    ).toBe(true);
    const snap = debug.snapshot(debug.loadBoard(state, ["TtT", "1.."]));
    expect(snap.board.nodes[0]).toMatchObject({ x: 544, y: 344, spent: null });
    expect(
      debug
        .clear(debug.loadBoard(state, ["TtT", "1.."]))
        .beams.every((beam) => beam.cells.length === 0),
    ).toBe(true);
  });

  it("poses independent mode fields and resets without muting the runtime", async () => {
    const [state, debug] = await setup();
    const posed = debug.setTier(
      debug.setSolvedCount(debug.setMode(state, "cascade"), 12),
      4,
    );
    expect(posed).toMatchObject({
      mode: "cascade",
      solvedCount: 12,
      tier: 4,
      unlockedCount: 1,
    });
    expect(debug.reset({ ...posed, muted: true })).toMatchObject({
      screen: "title",
      muted: true,
      solvedCount: 0,
      tier: 1,
    });
  });

  it("traces a legal route through its lens and solves on the final segment", async () => {
    const [state, debug] = await setup();
    const board = debug.loadBoard(state, ["TtT"]);
    let next = debug.pointerDown(board, 544, 392);
    next = debug.pointerMove(next, 640, 392);
    next = debug.pointerMove(next, 736, 392);
    const snapshot = debug.snapshot(next);
    expect(snapshot.beams.triangle?.complete).toBe(true);
    expect(snapshot.solved).toBe(true);
    expect(next.screen).toBe("solved");
    expect(next.tracing).toBeNull();
  });

  it("generates boards with tier-sized grids and the required channels", async () => {
    const [state, debug] = await setup();
    for (let tier = 1; tier <= 5; tier++) {
      const generated = debug.generateBoard(state, tier);
      expect(generated.board.cols).toBeGreaterThanOrEqual(tier === 1 ? 3 : 4);
      expect(generated.board.rows).toBeGreaterThanOrEqual(tier === 1 ? 3 : 4);
      expect(generated.beams).toHaveLength(tier === 1 ? 1 : tier < 4 ? 2 : 3);
      expect(generated.board.nodes.length).toBeLessThanOrEqual(
        generated.board.cols * generated.board.rows,
      );
    }
  });

  it("returns from the campaign board picker to the campaign title item", async () => {
    const [state, debug] = await setup();
    const select = debug.setScreen(state, "select");
    const back = debug.pointerDown(select, 100, 650);
    const title = debug.pointerUp(back);
    expect(title).toMatchObject({
      screen: "title",
      menuIndex: 0,
      armedTarget: null,
    });
  });
});
