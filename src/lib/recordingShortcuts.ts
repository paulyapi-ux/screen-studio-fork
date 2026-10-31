import { bindingsEqual, type ShortcutBinding } from "./shortcuts";

/**
 * Global shortcuts that work while another application has the focus. They drive the recording
 * HUD (start/stop, pause, restart). `ctrl` in a binding means Cmd on macOS, like the editor ones.
 */
export const RECORDING_SHORTCUT_ACTIONS = [
	"toggleRecording",
	"pauseResume",
	"restartRecording",
	"toggleMicrophone",
	"toggleSystemAudio",
] as const;

export type RecordingShortcutAction = (typeof RECORDING_SHORTCUT_ACTIONS)[number];

export type RecordingShortcutsConfig = Record<RecordingShortcutAction, ShortcutBinding>;

export const DEFAULT_RECORDING_SHORTCUTS: RecordingShortcutsConfig = {
	toggleRecording: { key: "r", ctrl: true, shift: true },
	pauseResume: { key: "p", ctrl: true, shift: true },
	restartRecording: { key: "x", ctrl: true, shift: true },
	toggleMicrophone: { key: "m", ctrl: true, shift: true },
	toggleSystemAudio: { key: "s", ctrl: true, shift: true },
};

export const RECORDING_SHORTCUT_LABELS: Record<RecordingShortcutAction, string> = {
	toggleRecording: "Start / Stop recording",
	pauseResume: "Pause / Resume recording",
	restartRecording: "Restart recording from zero",
	toggleMicrophone: "Mute / unmute microphone",
	toggleSystemAudio: "Mute / unmute system sound",
};

export function mergeRecordingShortcuts(partial: unknown): RecordingShortcutsConfig {
	const merged = { ...DEFAULT_RECORDING_SHORTCUTS };
	if (!partial || typeof partial !== "object") return merged;
	for (const action of RECORDING_SHORTCUT_ACTIONS) {
		const candidate = (partial as Partial<Record<RecordingShortcutAction, unknown>>)[action];
		if (isShortcutBinding(candidate) && isValidGlobalBinding(candidate)) {
			merged[action] = {
				key: candidate.key.toLowerCase(),
				...(candidate.ctrl ? { ctrl: true } : {}),
				...(candidate.shift ? { shift: true } : {}),
				...(candidate.alt ? { alt: true } : {}),
			};
		}
	}
	return merged;
}

function isShortcutBinding(value: unknown): value is ShortcutBinding {
	return (
		!!value &&
		typeof value === "object" &&
		typeof (value as ShortcutBinding).key === "string" &&
		(value as ShortcutBinding).key.length > 0
	);
}

/**
 * A global shortcut must include Ctrl/Cmd or Alt: a bare letter (or Shift + letter) would be
 * taken away from every other application.
 */
export function isValidGlobalBinding(binding: ShortcutBinding): boolean {
	return !!binding.ctrl || !!binding.alt;
}

/** The recording action already using `binding`, if any. */
export function findRecordingShortcutConflict(
	binding: ShortcutBinding,
	forAction: RecordingShortcutAction,
	config: RecordingShortcutsConfig,
): RecordingShortcutAction | null {
	for (const action of RECORDING_SHORTCUT_ACTIONS) {
		if (action !== forAction && bindingsEqual(config[action], binding)) return action;
	}
	return null;
}

const ACCELERATOR_KEYS: Record<string, string> = {
	" ": "Space",
	backspace: "Backspace",
	delete: "Delete",
	escape: "Esc",
	enter: "Enter",
	tab: "Tab",
	arrowup: "Up",
	arrowdown: "Down",
	arrowleft: "Left",
	arrowright: "Right",
	"+": "Plus",
};

/** Electron `globalShortcut` accelerator for a binding, e.g. `CommandOrControl+Shift+R`. */
export function toElectronAccelerator(binding: ShortcutBinding): string {
	const parts: string[] = [];
	if (binding.ctrl) parts.push("CommandOrControl");
	if (binding.shift) parts.push("Shift");
	if (binding.alt) parts.push("Alt");
	const key = binding.key.toLowerCase();
	parts.push(ACCELERATOR_KEYS[key] ?? (key.length === 1 ? key.toUpperCase() : binding.key));
	return parts.join("+");
}
