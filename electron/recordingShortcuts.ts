import { BrowserWindow, globalShortcut } from "electron";
import {
	mergeRecordingShortcuts,
	RECORDING_SHORTCUT_ACTIONS,
	type RecordingShortcutAction,
	type RecordingShortcutsConfig,
	toElectronAccelerator,
} from "../src/lib/recordingShortcuts";
import { readAppSetting, writeAppSetting } from "./appSettingsStore";

export const RECORDING_SHORTCUTS_SETTING_KEY = "recordingShortcuts";
export const RECORDING_SHORTCUT_EVENT = "recording-shortcut";

/** For each action: whether the system accepted the combination (another app may own it). */
export type RecordingShortcutRegistration = Record<RecordingShortcutAction, boolean>;

export interface GlobalShortcutApi {
	register: (accelerator: string, callback: () => void) => boolean;
	unregister: (accelerator: string) => void;
}

let registeredAccelerators: string[] = [];
let currentConfig: RecordingShortcutsConfig | null = null;

function dispatchToWindows(action: RecordingShortcutAction) {
	for (const window of BrowserWindow.getAllWindows()) {
		if (!window.isDestroyed()) window.webContents.send(RECORDING_SHORTCUT_EVENT, action);
	}
}

export function loadRecordingShortcuts(): RecordingShortcutsConfig {
	return mergeRecordingShortcuts(readAppSetting(RECORDING_SHORTCUTS_SETTING_KEY));
}

export function getRecordingShortcutsConfig(): RecordingShortcutsConfig {
	currentConfig ??= loadRecordingShortcuts();
	return currentConfig;
}

export function unregisterRecordingShortcuts(api: GlobalShortcutApi = globalShortcut) {
	for (const accelerator of registeredAccelerators) {
		try {
			api.unregister(accelerator);
		} catch {
			// Already released.
		}
	}
	registeredAccelerators = [];
}

/** Replaces our global shortcuts with `config` and reports which ones the system accepted. */
export function applyRecordingShortcuts(
	config: RecordingShortcutsConfig,
	api: GlobalShortcutApi = globalShortcut,
	dispatch: (action: RecordingShortcutAction) => void = dispatchToWindows,
): RecordingShortcutRegistration {
	unregisterRecordingShortcuts(api);
	currentConfig = config;

	const report = {} as RecordingShortcutRegistration;
	for (const action of RECORDING_SHORTCUT_ACTIONS) {
		const accelerator = toElectronAccelerator(config[action]);
		let registered = false;
		try {
			registered = api.register(accelerator, () => dispatch(action));
		} catch {
			registered = false;
		}
		if (registered) registeredAccelerators.push(accelerator);
		report[action] = registered;
	}
	return report;
}

/** Releases the system-wide shortcuts while the shortcuts menu is open, so that pressing a
 * current combination there records it instead of triggering the action. */
export function suspendRecordingShortcuts(api: GlobalShortcutApi = globalShortcut) {
	unregisterRecordingShortcuts(api);
}

export function resumeRecordingShortcuts(
	api: GlobalShortcutApi = globalShortcut,
	dispatch?: (action: RecordingShortcutAction) => void,
) {
	return applyRecordingShortcuts(getRecordingShortcutsConfig(), api, dispatch);
}

export function saveRecordingShortcuts(
	config: RecordingShortcutsConfig,
	api: GlobalShortcutApi = globalShortcut,
	dispatch?: (action: RecordingShortcutAction) => void,
) {
	const merged = mergeRecordingShortcuts(config);
	writeAppSetting(RECORDING_SHORTCUTS_SETTING_KEY, merged);
	return { config: merged, registered: applyRecordingShortcuts(merged, api, dispatch) };
}
