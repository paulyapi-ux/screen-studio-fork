import { describe, expect, it } from "vitest";
import { DEFAULT_WEBCAM_OVERLAY } from "./types";
import { getWebcamRectFraction, getWebcamSettingsFromRect } from "./webcamComposition";

const CANVAS = { width: 1920, height: 1080 };

describe("webcam composition conversion", () => {
	it("places the default webcam in the bottom-right corner", () => {
		const rect = getWebcamRectFraction({ ...DEFAULT_WEBCAM_OVERLAY, enabled: true }, CANVAS);
		expect(rect.x + rect.width).toBeLessThan(1);
		expect(rect.y + rect.height).toBeLessThan(1);
		expect(rect.x).toBeGreaterThan(0.5);
		expect(rect.y).toBeGreaterThan(0.5);
	});

	it("round-trips a rectangle through the settings", () => {
		const target = { x: 0.1, y: 0.2, width: 0.25, height: 0.25 * (1920 / 1080) * 0.5 };
		const settings = getWebcamSettingsFromRect(DEFAULT_WEBCAM_OVERLAY, target, CANVAS);
		expect(settings.positionPreset).toBe("custom");
		const back = getWebcamRectFraction(settings, CANVAS);
		expect(back.x).toBeCloseTo(target.x, 3);
		expect(back.y).toBeCloseTo(target.y, 3);
		expect(back.width).toBeCloseTo(target.width, 3);
		expect(back.height).toBeCloseTo(target.height, 3);
	});

	it("round-trips on a vertical 9:16 canvas too", () => {
		const canvas = { width: 540, height: 960 };
		const target = { x: 0.3, y: 0.6, width: 0.4, height: 0.4 * (540 / 960) };
		const settings = getWebcamSettingsFromRect(DEFAULT_WEBCAM_OVERLAY, target, canvas);
		const back = getWebcamRectFraction(settings, canvas);
		expect(back.x).toBeCloseTo(target.x, 3);
		expect(back.y).toBeCloseTo(target.y, 3);
	});

	it("derives the height from the crop like the preview does", () => {
		const cropped = {
			...DEFAULT_WEBCAM_OVERLAY,
			enabled: true,
			width: 30,
			height: 30,
			size: 30,
			cropRegion: { x: 0, y: 0, width: 0.5, height: 1 },
		};
		const source = { width: 1920, height: 1080 };
		const withSource = getWebcamRectFraction(cropped, CANVAS, source);
		const without = getWebcamRectFraction(cropped, CANVAS);
		// Half the width of a 16:9 picture is taller than wide: the cropped height differs.
		expect(withSource.height).not.toBeCloseTo(without.height, 3);
	});

	it("keeps an exact square from being re-derived from the crop", () => {
		const settings = getWebcamSettingsFromRect(
			DEFAULT_WEBCAM_OVERLAY,
			{ x: 0.1, y: 0.1, width: 0.2, height: 0.2 * (1920 / 1080) },
			CANVAS,
		);
		expect(Math.abs(settings.width - settings.height)).toBeGreaterThan(0.001);
	});
});
