import { describe, expect, it } from "vitest";
import {
	alignRect,
	DEFAULT_COMPOSITION_LOCKS,
	fitAspectInRect,
	getGridLines,
	isElementLocked,
	setAllLocked,
	snapMove,
	snapResize,
	toggleElementLock,
} from "./geometry";

const CANVAS = { width: 1000, height: 1000 };

describe("locks", () => {
	it("locks one element without touching the other", () => {
		const locks = toggleElementLock(DEFAULT_COMPOSITION_LOCKS, "webcam");
		expect(isElementLocked(locks, "webcam")).toBe(true);
		expect(isElementLocked(locks, "screen")).toBe(false);
		expect(isElementLocked(toggleElementLock(locks, "webcam"), "webcam")).toBe(false);
	});

	it("the global lock locks everything and keeps individual states", () => {
		const locks = setAllLocked(toggleElementLock(DEFAULT_COMPOSITION_LOCKS, "screen"), true);
		expect(isElementLocked(locks, "screen")).toBe(true);
		expect(isElementLocked(locks, "webcam")).toBe(true);
		const unlocked = setAllLocked(locks, false);
		expect(isElementLocked(unlocked, "screen")).toBe(true);
		expect(isElementLocked(unlocked, "webcam")).toBe(false);
	});
});

describe("getGridLines", () => {
	it("returns nothing when the grid is off", () => {
		expect(getGridLines({ enabled: false, columns: 12, snap: true }, CANVAS, "x")).toEqual([]);
	});

	it("gives square cells on a tall canvas", () => {
		const tall = { width: 1080, height: 1920 };
		const x = getGridLines({ enabled: true, columns: 6, snap: true }, tall, "x");
		const y = getGridLines({ enabled: true, columns: 6, snap: true }, tall, "y");
		expect(x).toHaveLength(7);
		expect(y).toHaveLength(12);
	});
});

describe("snapMove", () => {
	it("snaps the center of an element to the canvas center", () => {
		const result = snapMove(
			{ x: 0.395, y: 0.1, width: 0.2, height: 0.2 },
			{ canvas: CANVAS, others: [] },
		);
		expect(result.rect.x).toBeCloseTo(0.4);
		expect(result.guides).toContainEqual({ axis: "x", position: 0.5, kind: "canvas" });
	});

	it("snaps to the edge of another element (side by side)", () => {
		const screen = { x: 0, y: 0, width: 0.6, height: 0.6 };
		const result = snapMove(
			{ x: 0.605, y: 0.0, width: 0.3, height: 0.3 },
			{ canvas: CANVAS, others: [screen] },
		);
		expect(result.rect.x).toBeCloseTo(0.6);
		expect(result.rect.y).toBeCloseTo(0);
		expect(result.guides.some((g) => g.axis === "x" && g.kind === "element")).toBe(true);
	});

	it("snaps to grid lines only when the grid snaps", () => {
		const grid = { enabled: true, columns: 10, snap: true };
		const on = snapMove(
			{ x: 0.203, y: 0.35, width: 0.1, height: 0.1 },
			{ canvas: CANVAS, others: [], grid },
		);
		expect(on.rect.x).toBeCloseTo(0.2);
		const off = snapMove(
			{ x: 0.203, y: 0.35, width: 0.1, height: 0.1 },
			{ canvas: CANVAS, others: [], grid: { ...grid, snap: false } },
		);
		expect(off.rect.x).toBeCloseTo(0.203);
	});

	it("does not snap when disabled and still stays on the canvas", () => {
		const result = snapMove(
			{ x: 0.95, y: -0.2, width: 0.2, height: 0.2 },
			{ canvas: CANVAS, others: [], disabled: true },
		);
		expect(result.rect.x).toBeCloseTo(0.8);
		expect(result.rect.y).toBe(0);
		expect(result.guides).toEqual([]);
	});

	it("ignores targets farther than the threshold", () => {
		const result = snapMove(
			{ x: 0.3, y: 0.3, width: 0.1, height: 0.1 },
			{ canvas: CANVAS, others: [] },
		);
		expect(result.rect).toEqual({ x: 0.3, y: 0.3, width: 0.1, height: 0.1 });
	});
});

describe("snapResize", () => {
	it("keeps the aspect ratio when resizing a corner", () => {
		// 16:9 video on a 1000x1000 canvas.
		const aspect = 16 / 9;
		const start = { x: 0.1, y: 0.1, width: 0.4, height: 0.4 / aspect };
		const result = snapResize(
			start,
			"se",
			{ x: 0.7, y: 0.9 },
			{ canvas: CANVAS, others: [], aspectRatio: aspect },
		);
		expect(result.rect.x).toBeCloseTo(0.1);
		expect(result.rect.y).toBeCloseTo(0.1);
		expect(result.rect.width / result.rect.height).toBeCloseTo(aspect, 3);
	});

	it("keeps the opposite corner fixed when resizing from the top left", () => {
		const start = { x: 0.4, y: 0.4, width: 0.4, height: 0.4 };
		const result = snapResize(
			start,
			"nw",
			{ x: 0.2, y: 0.2 },
			{ canvas: CANVAS, others: [], aspectRatio: 1 },
		);
		expect(result.rect.x + result.rect.width).toBeCloseTo(0.8);
		expect(result.rect.y + result.rect.height).toBeCloseTo(0.8);
	});

	it("snaps the dragged edge to the canvas edge", () => {
		const start = { x: 0.5, y: 0.2, width: 0.3, height: 0.3 };
		const result = snapResize(
			start,
			"e",
			{ x: 0.996, y: 0.35 },
			{ canvas: CANVAS, others: [], aspectRatio: null },
		);
		expect(result.rect.x + result.rect.width).toBeCloseTo(1);
		expect(result.guides).toContainEqual({ axis: "x", position: 1, kind: "canvas" });
	});

	it("never leaves the canvas nor goes below the minimum size", () => {
		const start = { x: 0.5, y: 0.5, width: 0.3, height: 0.3 };
		const big = snapResize(
			start,
			"se",
			{ x: 3, y: 3 },
			{ canvas: CANVAS, others: [], aspectRatio: 1 },
		);
		expect(big.rect.x + big.rect.width).toBeLessThanOrEqual(1 + 1e-9);
		expect(big.rect.y + big.rect.height).toBeLessThanOrEqual(1 + 1e-9);
		const tiny = snapResize(
			start,
			"se",
			{ x: 0.1, y: 0.1 },
			{ canvas: CANVAS, others: [], aspectRatio: null },
		);
		expect(tiny.rect.width).toBeGreaterThanOrEqual(0.05);
		expect(tiny.rect.height).toBeGreaterThanOrEqual(0.05);
	});
});

describe("fitAspectInRect", () => {
	it("centers a 16:9 video in a taller box", () => {
		const fitted = fitAspectInRect({ x: 0, y: 0, width: 1, height: 1 }, 16 / 9, CANVAS);
		expect(fitted.width).toBeCloseTo(1);
		expect(fitted.height).toBeCloseTo(9 / 16);
		expect(fitted.y).toBeCloseTo((1 - 9 / 16) / 2);
	});
});

describe("alignRect", () => {
	it("aligns to the canvas edges and center", () => {
		const rect = { x: 0.3, y: 0.3, width: 0.2, height: 0.2 };
		expect(alignRect(rect, "left").x).toBe(0);
		expect(alignRect(rect, "right").x).toBeCloseTo(0.8);
		expect(alignRect(rect, "center-x").x).toBeCloseTo(0.4);
		expect(alignRect(rect, "bottom").y).toBeCloseTo(0.8);
	});
});
