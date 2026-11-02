import { describe, expect, it } from "vitest";
import { DEFAULT_COMPOSITION } from "@/lib/composition/settings";
import { type EditorPresetSnapshot, serializeEditorPresetSnapshot } from "../editorPreferences";

function snapshotWith(composition: unknown): EditorPresetSnapshot {
	return { composition } as unknown as EditorPresetSnapshot;
}

describe("composition inside a saved preset", () => {
	it("falls back to the classic layout for presets saved before compositions existed", () => {
		const parsed = JSON.parse(serializeEditorPresetSnapshot(snapshotWith(undefined)));
		expect(parsed.composition).toEqual({
			screenRect: null,
			locks: DEFAULT_COMPOSITION.locks,
		});
	});

	it("keeps the screen rectangle and the locks, but not the grid", () => {
		const parsed = JSON.parse(
			serializeEditorPresetSnapshot(
				snapshotWith({
					screenRect: { x: 0.1, y: 0.2, width: 0.5, height: 0.3 },
					locks: { all: false, screen: true, webcam: false },
					grid: { enabled: true, columns: 8, snap: true },
				}),
			),
		);
		expect(parsed.composition.screenRect).toEqual({ x: 0.1, y: 0.2, width: 0.5, height: 0.3 });
		expect(parsed.composition.locks.screen).toBe(true);
		expect(parsed.composition.grid).toBeUndefined();
	});

	it("makes two presets with different layouts differ", () => {
		const a = serializeEditorPresetSnapshot(
			snapshotWith({ screenRect: { x: 0, y: 0, width: 0.5, height: 0.5 } }),
		);
		const b = serializeEditorPresetSnapshot(
			snapshotWith({ screenRect: { x: 0.5, y: 0, width: 0.5, height: 0.5 } }),
		);
		expect(a).not.toBe(b);
	});
});
