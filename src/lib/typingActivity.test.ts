import { describe, expect, it } from "vitest";
import { classifyKeyPress, findTypingSessionEnd, type KeySample } from "./typingActivity";

const text = (timeMs: number): KeySample => ({ timeMs, interactionType: "key-text" });
const edit = (timeMs: number): KeySample => ({ timeMs, interactionType: "key-edit" });

describe("classifyKeyPress", () => {
	it("counts letters, digits and punctuation as text", () => {
		expect(classifyKeyPress({ keycode: 30 })).toBe("text"); // A
		expect(classifyKeyPress({ keycode: 11 })).toBe("text"); // 0
		expect(classifyKeyPress({ keycode: 52 })).toBe("text"); // Period
		expect(classifyKeyPress({ keycode: 82 })).toBe("text"); // Numpad0
	});

	it("keeps space, enter, backspace, delete and tab as edit keys", () => {
		for (const keycode of [57, 28, 14, 3667, 15]) {
			expect(classifyKeyPress({ keycode })).toBe("edit");
		}
	});

	it("ignores arrows, function keys, modifiers and unknown keys", () => {
		for (const keycode of [57419, 57421, 59, 29, 42, 56, 3675, 1, 3655, 9999]) {
			expect(classifyKeyPress({ keycode })).toBeNull();
		}
	});

	it("ignores shortcuts with Ctrl, Alt or Cmd", () => {
		expect(classifyKeyPress({ keycode: 31, ctrlKey: true })).toBeNull(); // Ctrl+S
		expect(classifyKeyPress({ keycode: 30, altKey: true })).toBeNull();
		expect(classifyKeyPress({ keycode: 46, metaKey: true })).toBeNull();
	});
});

describe("findTypingSessionEnd", () => {
	it("starts after two text keys within 3 s of the click and ends 2 s after the last key", () => {
		const samples = [text(1500), text(1700), text(2400), text(3000)];
		expect(findTypingSessionEnd(samples, 1000)).toBe(3000 + 2000);
	});

	it("does not start with a single key or with keys that come too late", () => {
		expect(findTypingSessionEnd([text(1500)], 1000)).toBeNull();
		expect(findTypingSessionEnd([text(5000), text(5200)], 1000)).toBeNull();
	});

	it("ignores space and other edit keys when starting (Figma panning)", () => {
		expect(
			findTypingSessionEnd([edit(1200), edit(1300), edit(1400), edit(1500)], 1000),
		).toBeNull();
		expect(findTypingSessionEnd([edit(1200), text(1300)], 1000)).toBeNull();
	});

	it("lets edit keys keep a started session going", () => {
		const samples = [text(1200), text(1400), edit(3000), edit(4500), text(6000)];
		expect(findTypingSessionEnd(samples, 1000)).toBe(6000 + 2000);
	});

	it("ends the session at a pause longer than 2 s", () => {
		const samples = [text(1200), text(1400), text(1600), text(6000), text(6100)];
		expect(findTypingSessionEnd(samples, 1000)).toBe(1600 + 2000);
	});

	it("stops at the next click", () => {
		const samples = [text(1200), text(1400), text(2200), text(9000), text(9100)];
		expect(findTypingSessionEnd(samples, 1000, 5000)).toBe(2200 + 2000);
	});

	it("ignores keys typed before the click", () => {
		expect(findTypingSessionEnd([text(500), text(700), text(900)], 1000)).toBeNull();
	});
});
