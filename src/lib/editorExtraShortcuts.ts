/**
 * Fixed editor shortcuts for the usual things a video tool offers (Premiere, OBS, screen
 * recorders): export, move the playhead, mute the preview. Save, open, undo/redo, play/pause,
 * split, delete and the like exist elsewhere.
 */
export type EditorExtraAction =
	| "export"
	| "seekBackSmall"
	| "seekForwardSmall"
	| "seekBackLarge"
	| "seekForwardLarge"
	| "goToStart"
	| "goToEnd"
	| "toggleMutePreview";

export const SEEK_SMALL_SECONDS = 1;
export const SEEK_LARGE_SECONDS = 5;

interface KeyEventLike {
	key: string;
	ctrlKey: boolean;
	metaKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
}

/** Maps a key press to an action, or null when it is not one of these shortcuts. */
export function resolveEditorExtraShortcut(
	event: KeyEventLike,
	isMac: boolean,
): EditorExtraAction | null {
	const primary = isMac ? event.metaKey : event.ctrlKey;
	const otherPrimary = isMac ? event.ctrlKey : event.metaKey;
	if (otherPrimary || event.altKey) return null;
	const key = event.key.toLowerCase();

	if (primary) {
		if (!event.shiftKey && key === "e") return "export";
		return null;
	}

	switch (key) {
		case "arrowleft":
			return event.shiftKey ? "seekBackLarge" : "seekBackSmall";
		case "arrowright":
			return event.shiftKey ? "seekForwardLarge" : "seekForwardSmall";
		case "home":
			return event.shiftKey ? null : "goToStart";
		case "end":
			return event.shiftKey ? null : "goToEnd";
		case "m":
			return event.shiftKey ? null : "toggleMutePreview";
		default:
			return null;
	}
}

/** New playhead position (seconds) for a seek action, kept inside the clip. */
export function getSeekTarget(
	action: EditorExtraAction,
	currentSeconds: number,
	durationSeconds: number,
): number | null {
	const clamp = (value: number) => Math.min(Math.max(0, durationSeconds), Math.max(0, value));
	switch (action) {
		case "seekBackSmall":
			return clamp(currentSeconds - SEEK_SMALL_SECONDS);
		case "seekForwardSmall":
			return clamp(currentSeconds + SEEK_SMALL_SECONDS);
		case "seekBackLarge":
			return clamp(currentSeconds - SEEK_LARGE_SECONDS);
		case "seekForwardLarge":
			return clamp(currentSeconds + SEEK_LARGE_SECONDS);
		case "goToStart":
			return 0;
		case "goToEnd":
			return Math.max(0, durationSeconds);
		default:
			return null;
	}
}

const IGNORED_TARGETS =
	'[role="slider"],[role="spinbutton"],[role="listbox"],[role="menu"],[role="menuitem"],[role="tab"],[role="tablist"],[role="dialog"],[data-recording-library]';

/** True when a key press belongs to a text field, slider, menu or dialog and must be left alone. */
export function isEditorShortcutTargetIgnored(target: EventTarget | null): boolean {
	const element = target as HTMLElement | null;
	if (!element) return false;
	if (
		element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement ||
		element instanceof HTMLSelectElement ||
		element.isContentEditable
	) {
		return true;
	}
	return !!element.closest?.(IGNORED_TARGETS);
}
