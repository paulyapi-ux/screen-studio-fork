import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
	BrowserWindow: { getAllWindows: () => [] },
	globalShortcut: { register: vi.fn(), unregister: vi.fn() },
}));
vi.mock("./appSettingsStore", () => ({
	readAppSetting: vi.fn(() => null),
	writeAppSetting: vi.fn(),
}));

import { DEFAULT_RECORDING_SHORTCUTS } from "../src/lib/recordingShortcuts";
import { writeAppSetting } from "./appSettingsStore";
import {
	applyRecordingShortcuts,
	RECORDING_SHORTCUTS_SETTING_KEY,
	saveRecordingShortcuts,
	unregisterRecordingShortcuts,
} from "./recordingShortcuts";

function fakeApi(refuse: string[] = []) {
	const callbacks = new Map<string, () => void>();
	return {
		callbacks,
		register: vi.fn((accelerator: string, callback: () => void) => {
			if (refuse.includes(accelerator)) return false;
			callbacks.set(accelerator, callback);
			return true;
		}),
		unregister: vi.fn((accelerator: string) => {
			callbacks.delete(accelerator);
		}),
	};
}

describe("recording shortcuts (main process)", () => {
	beforeEach(() => {
		unregisterRecordingShortcuts(fakeApi());
		vi.clearAllMocks();
	});

	it("registers each action and sends it to the renderer when pressed", () => {
		const api = fakeApi();
		const dispatch = vi.fn();
		const report = applyRecordingShortcuts(DEFAULT_RECORDING_SHORTCUTS, api, dispatch);

		expect(report).toEqual({
			toggleRecording: true,
			pauseResume: true,
			restartRecording: true,
			toggleMicrophone: true,
			toggleSystemAudio: true,
		});
		api.callbacks.get("CommandOrControl+Shift+R")?.();
		api.callbacks.get("CommandOrControl+Shift+P")?.();
		expect(dispatch).toHaveBeenNthCalledWith(1, "toggleRecording");
		expect(dispatch).toHaveBeenNthCalledWith(2, "pauseResume");
	});

	it("reports a combination another application already owns", () => {
		const api = fakeApi(["CommandOrControl+Shift+P"]);
		const report = applyRecordingShortcuts(DEFAULT_RECORDING_SHORTCUTS, api, vi.fn());
		expect(report.pauseResume).toBe(false);
		expect(report.toggleRecording).toBe(true);
	});

	it("releases the previous shortcuts before applying new ones", () => {
		const api = fakeApi();
		applyRecordingShortcuts(DEFAULT_RECORDING_SHORTCUTS, api, vi.fn());
		applyRecordingShortcuts(
			{
				...DEFAULT_RECORDING_SHORTCUTS,
				toggleRecording: { key: "j", ctrl: true, alt: true },
			},
			api,
			vi.fn(),
		);
		expect(api.unregister).toHaveBeenCalledWith("CommandOrControl+Shift+R");
		expect(api.callbacks.has("CommandOrControl+Shift+R")).toBe(false);
		expect(api.callbacks.has("CommandOrControl+Alt+J")).toBe(true);
	});

	it("saves a sanitized config", () => {
		const api = fakeApi();
		const { config } = saveRecordingShortcuts(
			{ ...DEFAULT_RECORDING_SHORTCUTS, pauseResume: { key: "q" } },
			api,
			vi.fn(),
		);
		expect(config.pauseResume).toEqual(DEFAULT_RECORDING_SHORTCUTS.pauseResume);
		expect(writeAppSetting).toHaveBeenCalledWith(RECORDING_SHORTCUTS_SETTING_KEY, config);
	});
});

describe("suspending while the shortcuts menu is open", () => {
	it("releases the shortcuts, then restores the saved ones", async () => {
		const { suspendRecordingShortcuts, resumeRecordingShortcuts } = await import(
			"./recordingShortcuts"
		);
		const api = fakeApi();
		applyRecordingShortcuts(DEFAULT_RECORDING_SHORTCUTS, api, vi.fn());
		expect(api.callbacks.size).toBe(5);

		suspendRecordingShortcuts(api);
		expect(api.callbacks.size).toBe(0);

		const report = resumeRecordingShortcuts(api, vi.fn());
		expect(api.callbacks.size).toBe(5);
		expect(report.toggleRecording).toBe(true);
	});
});
