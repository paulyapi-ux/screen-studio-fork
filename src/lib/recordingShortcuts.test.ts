import { describe, expect, it } from "vitest";
import {
	DEFAULT_RECORDING_SHORTCUTS,
	findRecordingShortcutConflict,
	isValidGlobalBinding,
	mergeRecordingShortcuts,
	toElectronAccelerator,
} from "./recordingShortcuts";

describe("toElectronAccelerator", () => {
	it("maps the primary modifier to CommandOrControl", () => {
		expect(toElectronAccelerator({ key: "r", ctrl: true, shift: true })).toBe(
			"CommandOrControl+Shift+R",
		);
		expect(toElectronAccelerator({ key: "p", alt: true })).toBe("Alt+P");
	});

	it("names special keys the way Electron expects", () => {
		expect(toElectronAccelerator({ key: " ", ctrl: true })).toBe("CommandOrControl+Space");
		expect(toElectronAccelerator({ key: "arrowup", ctrl: true })).toBe("CommandOrControl+Up");
		expect(toElectronAccelerator({ key: "backspace", ctrl: true, shift: true })).toBe(
			"CommandOrControl+Shift+Backspace",
		);
		expect(toElectronAccelerator({ key: "f5", ctrl: true })).toBe("CommandOrControl+f5");
	});
});

describe("isValidGlobalBinding", () => {
	it("requires Ctrl/Cmd or Alt so no bare key is taken from other apps", () => {
		expect(isValidGlobalBinding({ key: "r" })).toBe(false);
		expect(isValidGlobalBinding({ key: "r", shift: true })).toBe(false);
		expect(isValidGlobalBinding({ key: "r", ctrl: true })).toBe(true);
		expect(isValidGlobalBinding({ key: "r", alt: true })).toBe(true);
	});
});

describe("mergeRecordingShortcuts", () => {
	it("falls back to defaults for missing or unusable data", () => {
		expect(mergeRecordingShortcuts(null)).toEqual(DEFAULT_RECORDING_SHORTCUTS);
		expect(mergeRecordingShortcuts({ toggleRecording: { key: "r" } })).toEqual(
			DEFAULT_RECORDING_SHORTCUTS,
		);
		expect(mergeRecordingShortcuts({ toggleRecording: "nope" })).toEqual(
			DEFAULT_RECORDING_SHORTCUTS,
		);
	});

	it("keeps a valid saved binding and normalizes the key", () => {
		const merged = mergeRecordingShortcuts({
			pauseResume: { key: "J", ctrl: true, alt: true },
		});
		expect(merged.pauseResume).toEqual({ key: "j", ctrl: true, alt: true });
		expect(merged.toggleRecording).toEqual(DEFAULT_RECORDING_SHORTCUTS.toggleRecording);
	});
});

describe("findRecordingShortcutConflict", () => {
	it("detects another action using the same combination", () => {
		expect(
			findRecordingShortcutConflict(
				{ key: "p", ctrl: true, shift: true },
				"toggleRecording",
				DEFAULT_RECORDING_SHORTCUTS,
			),
		).toBe("pauseResume");
		expect(
			findRecordingShortcutConflict(
				{ key: "p", ctrl: true, shift: true },
				"pauseResume",
				DEFAULT_RECORDING_SHORTCUTS,
			),
		).toBeNull();
	});
});
