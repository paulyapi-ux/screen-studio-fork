/**
 * Typing activity for the zoom: when someone clicks into a text field and types, the zoom stays
 * open while they type. Only the *moment* of a keystroke and its coarse category are kept, never
 * which key it was (privacy: what was typed cannot be read back).
 *
 * Categories:
 * - "text": letters, digits and punctuation. Two of them shortly after a click start a typing
 *   session.
 * - "edit": space, enter, backspace, delete, tab. They keep a session going once it started but
 *   never start one (holding Space to pan a canvas, as in Figma, must not zoom).
 * Anything else (arrows, function keys, Ctrl/Alt/Cmd shortcuts, modifiers) is not recorded.
 */

export type KeyCategory = "text" | "edit";

/** Key codes of uiohook-napi (`UiohookKey`), grouped by category. */
const TEXT_KEYCODES = new Set<number>([
	// Digits 1-9, 0
	2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
	// Letters: Q W E R T Y U I O P A S D F G H J K L Z X C V B N M
	16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 30, 31, 32, 33, 34, 35, 36, 37, 38, 44, 45, 46, 47, 48,
	49, 50,
	// Minus, Equal, BracketLeft, BracketRight, Semicolon, Quote, Backquote, Backslash
	12, 13, 26, 27, 39, 40, 41, 43,
	// Comma, Period, Slash
	51, 52, 53,
	// Numpad 0-9, multiply, subtract, add, decimal, divide
	82, 79, 80, 81, 75, 76, 77, 71, 72, 73, 55, 74, 78, 83, 3637,
]);

const EDIT_KEYCODES = new Set<number>([
	14, // Backspace
	15, // Tab
	28, // Enter
	57, // Space
	3667, // Delete
]);

export interface KeyEventLike {
	keycode: number;
	ctrlKey?: boolean;
	altKey?: boolean;
	metaKey?: boolean;
}

/** Category to record for a key press, or null when it must not be recorded at all. */
export function classifyKeyPress(event: KeyEventLike): KeyCategory | null {
	// Shortcuts (Ctrl/Alt/Cmd + key) are commands, not typing.
	if (event.ctrlKey || event.altKey || event.metaKey) return null;
	if (TEXT_KEYCODES.has(event.keycode)) return "text";
	if (EDIT_KEYCODES.has(event.keycode)) return "edit";
	return null;
}

/** A click followed by this many text keys within the window starts a typing session. */
export const TYPING_START_KEY_COUNT = 2;
export const TYPING_START_WINDOW_MS = 3000;
/** The zoom stays open this long after the last keystroke. */
export const TYPING_HOLD_MS = 2000;

export interface KeySample {
	timeMs: number;
	interactionType?: string;
}

/**
 * End of the typing session that follows a click, or null when the click was not followed by
 * typing. `samples` must be sorted by time. `nextClickMs` stops the session at the next click.
 */
export function findTypingSessionEnd(
	samples: readonly KeySample[],
	clickMs: number,
	nextClickMs: number = Number.POSITIVE_INFINITY,
): number | null {
	const keys = samples.filter(
		(sample) =>
			(sample.interactionType === "key-text" || sample.interactionType === "key-edit") &&
			sample.timeMs > clickMs &&
			sample.timeMs < nextClickMs,
	);
	const startKeys = keys.filter(
		(sample) =>
			sample.interactionType === "key-text" &&
			sample.timeMs - clickMs <= TYPING_START_WINDOW_MS,
	);
	if (startKeys.length < TYPING_START_KEY_COUNT) return null;

	let lastKeyMs = startKeys[0].timeMs;
	for (const key of keys) {
		if (key.timeMs < lastKeyMs) continue;
		if (key.timeMs - lastKeyMs > TYPING_HOLD_MS) break;
		lastKeyMs = key.timeMs;
	}
	return lastKeyMs + TYPING_HOLD_MS;
}
