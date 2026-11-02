import { describe, expect, it } from "vitest";
import { getCroppedVideoAspect, getEffectiveScreenRect } from "./compositionLayout";

const FULL_CROP = { x: 0, y: 0, width: 1, height: 1 };

describe("getCroppedVideoAspect", () => {
	it("is the aspect ratio of the visible part", () => {
		expect(getCroppedVideoAspect(1920, 1080, FULL_CROP)).toBeCloseTo(16 / 9);
		expect(
			getCroppedVideoAspect(1000, 1000, { x: 0, y: 0, width: 0.5, height: 1 }),
		).toBeCloseTo(0.5);
	});
});

describe("getEffectiveScreenRect", () => {
	it("returns the free rectangle as is", () => {
		const rect = { x: 0.1, y: 0.2, width: 0.5, height: 0.28 };
		expect(
			getEffectiveScreenRect({
				screenRect: rect,
				padding: 0,
				cropRegion: FULL_CROP,
				videoWidth: 1920,
				videoHeight: 1080,
				canvas: { width: 1000, height: 1000 },
			}),
		).toBe(rect);
	});

	it("derives the current classic position when there is none", () => {
		const rect = getEffectiveScreenRect({
			screenRect: null,
			padding: 0,
			cropRegion: FULL_CROP,
			videoWidth: 1600,
			videoHeight: 900,
			canvas: { width: 1600, height: 900 },
		});
		expect(rect.x).toBeCloseTo(0);
		expect(rect.y).toBeCloseTo(0);
		expect(rect.width).toBeCloseTo(1);
		expect(rect.height).toBeCloseTo(1);
	});

	it("centers a 16:9 video on a square canvas", () => {
		const rect = getEffectiveScreenRect({
			screenRect: null,
			padding: 0,
			cropRegion: FULL_CROP,
			videoWidth: 1600,
			videoHeight: 900,
			canvas: { width: 1000, height: 1000 },
		});
		expect(rect.width).toBeCloseTo(1);
		expect(rect.height).toBeCloseTo(0.5625);
		expect(rect.y).toBeCloseTo((1 - 0.5625) / 2);
	});
});
