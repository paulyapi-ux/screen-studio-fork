import { describe, expect, it } from "vitest";
import { DEFAULT_COMPOSITION, normalizeComposition } from "./settings";

describe("normalizeComposition", () => {
	it("returns the defaults for missing or invalid data", () => {
		expect(normalizeComposition(undefined)).toEqual(DEFAULT_COMPOSITION);
		expect(normalizeComposition("nope")).toEqual(DEFAULT_COMPOSITION);
		expect(normalizeComposition({ screenRect: { x: "a" } }).screenRect).toBeNull();
	});

	it("keeps a valid rectangle, locks and grid", () => {
		const result = normalizeComposition({
			screenRect: { x: 0.1, y: 0.1, width: 0.5, height: 0.4 },
			locks: { all: false, screen: true, webcam: false },
			grid: { enabled: true, columns: 8, snap: false },
		});
		expect(result.screenRect).toEqual({ x: 0.1, y: 0.1, width: 0.5, height: 0.4 });
		expect(result.locks.screen).toBe(true);
		expect(result.grid).toEqual({ enabled: true, columns: 8, snap: false });
	});

	it("pulls a rectangle back onto the canvas and bounds the grid", () => {
		const result = normalizeComposition({
			screenRect: { x: 0.9, y: -1, width: 0.5, height: 0.5 },
			grid: { columns: 1000 },
		});
		expect(result.screenRect).toEqual({ x: 0.5, y: 0, width: 0.5, height: 0.5 });
		expect(result.grid.columns).toBe(48);
	});
});
