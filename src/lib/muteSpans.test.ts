import { describe, expect, it } from "vitest";
import { MuteSpanLog } from "./muteSpans";

describe("MuteSpanLog", () => {
	it("records a muted stretch in recording time", () => {
		const log = new MuteSpanLog();
		log.start(1000);
		expect(log.toggle("mic", 3000)).toBe(true);
		expect(log.isMuted("mic")).toBe(true);
		expect(log.toggle("mic", 5500)).toBe(false);
		expect(log.take(9000)).toEqual([{ track: "mic", startMs: 2000, endMs: 4500 }]);
	});

	it("leaves paused time out of the timeline", () => {
		const log = new MuteSpanLog();
		log.start(0);
		log.setPaused(true, 2000);
		log.setPaused(false, 7000); // 5 s pause
		log.toggle("system", 8000); // 3 s of recording time
		log.toggle("system", 10000); // 5 s
		expect(log.take(12000)).toEqual([{ track: "system", startMs: 3000, endMs: 5000 }]);
	});

	it("does not count time spent paused while muted", () => {
		const log = new MuteSpanLog();
		log.start(0);
		log.toggle("mic", 1000);
		log.setPaused(true, 2000);
		log.setPaused(false, 6000);
		log.toggle("mic", 7000);
		expect(log.take(8000)).toEqual([{ track: "mic", startMs: 1000, endMs: 3000 }]);
	});

	it("closes a span still open when the take ends", () => {
		const log = new MuteSpanLog();
		log.start(0);
		log.toggle("mic", 4000);
		expect(log.take(10000)).toEqual([{ track: "mic", startMs: 4000, endMs: 10000 }]);
		expect(log.isActive()).toBe(false);
	});

	it("tracks the two sources independently and sorts the spans", () => {
		const log = new MuteSpanLog();
		log.start(0);
		log.toggle("system", 1000);
		log.toggle("mic", 2000);
		log.toggle("system", 3000);
		log.toggle("mic", 4000);
		expect(log.take(5000)).toEqual([
			{ track: "system", startMs: 1000, endMs: 3000 },
			{ track: "mic", startMs: 2000, endMs: 4000 },
		]);
	});

	it("ignores toggles when no take is running and resets after take", () => {
		const log = new MuteSpanLog();
		expect(log.toggle("mic", 100)).toBe(false);
		expect(log.take(200)).toEqual([]);
		log.start(0);
		log.toggle("mic", 1000);
		log.take(2000);
		expect(log.take(3000)).toEqual([]);
	});
});
