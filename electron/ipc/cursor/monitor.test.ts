import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ BrowserWindow: { getAllWindows: () => [] } }));
vi.mock("../paths/binaries", () => ({
	ensureNativeCursorMonitorBinary: vi.fn(),
	getCursorMonitorExePath: vi.fn(),
}));
vi.mock("./interaction", () => ({
	recordCursorKey: vi.fn(),
	recordCursorMouseDown: vi.fn(),
	recordCursorMouseUp: vi.fn(),
}));

import { parseCursorMonitorInteraction } from "./monitor";

describe("parseCursorMonitorInteraction", () => {
	it("reads mouse presses and releases", () => {
		expect(parseCursorMonitorInteraction("INTERACTION:mousedown:1")).toEqual({
			kind: "mousedown",
			button: 1,
		});
		expect(parseCursorMonitorInteraction("INTERACTION:mousedown:2")).toEqual({
			kind: "mousedown",
			button: 2,
		});
		expect(parseCursorMonitorInteraction("INTERACTION:mousedown")).toEqual({
			kind: "mousedown",
			button: 1,
		});
		expect(parseCursorMonitorInteraction("INTERACTION:mouseup:1")).toEqual({ kind: "mouseup" });
	});

	it("reads keystroke categories and nothing else about the key", () => {
		expect(parseCursorMonitorInteraction("INTERACTION:key:text")).toEqual({
			kind: "key",
			category: "text",
		});
		expect(parseCursorMonitorInteraction("INTERACTION:key:edit")).toEqual({
			kind: "key",
			category: "edit",
		});
	});

	it("ignores anything else, including a raw key code", () => {
		expect(parseCursorMonitorInteraction("INTERACTION:key:30")).toBeNull();
		expect(parseCursorMonitorInteraction("INTERACTION:key:text:extra")).toBeNull();
		expect(parseCursorMonitorInteraction("STATE:arrow")).toBeNull();
		expect(parseCursorMonitorInteraction("")).toBeNull();
	});
});
