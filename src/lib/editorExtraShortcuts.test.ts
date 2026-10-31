import { describe, expect, it } from "vitest";
import { getSeekTarget, resolveEditorExtraShortcut } from "./editorExtraShortcuts";

const key = (
	k: string,
	mods: Partial<Record<"ctrl" | "meta" | "shift" | "alt", boolean>> = {},
) => ({
	key: k,
	ctrlKey: !!mods.ctrl,
	metaKey: !!mods.meta,
	shiftKey: !!mods.shift,
	altKey: !!mods.alt,
});

describe("resolveEditorExtraShortcut", () => {
	it("exports with Ctrl+E on Windows and Cmd+E on Mac", () => {
		expect(resolveEditorExtraShortcut(key("e", { ctrl: true }), false)).toBe("export");
		expect(resolveEditorExtraShortcut(key("E", { meta: true }), true)).toBe("export");
		expect(resolveEditorExtraShortcut(key("e", { ctrl: true }), true)).toBeNull();
		expect(resolveEditorExtraShortcut(key("e"), false)).toBeNull();
	});

	it("moves the playhead with the arrows, Shift for the larger step", () => {
		expect(resolveEditorExtraShortcut(key("ArrowLeft"), false)).toBe("seekBackSmall");
		expect(resolveEditorExtraShortcut(key("ArrowRight"), false)).toBe("seekForwardSmall");
		expect(resolveEditorExtraShortcut(key("ArrowLeft", { shift: true }), false)).toBe(
			"seekBackLarge",
		);
		expect(resolveEditorExtraShortcut(key("ArrowRight", { shift: true }), false)).toBe(
			"seekForwardLarge",
		);
	});

	it("jumps to the start and end, and mutes the preview with M", () => {
		expect(resolveEditorExtraShortcut(key("Home"), false)).toBe("goToStart");
		expect(resolveEditorExtraShortcut(key("End"), false)).toBe("goToEnd");
		expect(resolveEditorExtraShortcut(key("m"), false)).toBe("toggleMutePreview");
	});

	it("ignores combinations with Alt or the wrong modifier", () => {
		expect(resolveEditorExtraShortcut(key("m", { alt: true }), false)).toBeNull();
		expect(resolveEditorExtraShortcut(key("ArrowLeft", { ctrl: true }), false)).toBeNull();
		expect(resolveEditorExtraShortcut(key("m", { ctrl: true }), false)).toBeNull();
	});
});

describe("getSeekTarget", () => {
	it("steps by 1 s and 5 s and stays inside the clip", () => {
		expect(getSeekTarget("seekForwardSmall", 10, 60)).toBe(11);
		expect(getSeekTarget("seekBackLarge", 10, 60)).toBe(5);
		expect(getSeekTarget("seekBackLarge", 2, 60)).toBe(0);
		expect(getSeekTarget("seekForwardLarge", 58, 60)).toBe(60);
	});

	it("goes to the start and the end", () => {
		expect(getSeekTarget("goToStart", 30, 60)).toBe(0);
		expect(getSeekTarget("goToEnd", 30, 60)).toBe(60);
		expect(getSeekTarget("export", 30, 60)).toBeNull();
	});
});
