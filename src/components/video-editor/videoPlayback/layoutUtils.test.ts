import { describe, expect, it } from "vitest";

import { ADVANCED_VERTICAL_PADDING_MAX } from "../types";
import { computePaddedLayout, scalePreviewBorderRadius } from "./layoutUtils";

const BASE_LAYOUT_PARAMS = {
	width: 1000,
	height: 1000,
	cropRegion: { x: 0, y: 0, width: 1, height: 1 },
	videoWidth: 1000,
	videoHeight: 1000,
};

describe("computePaddedLayout", () => {
	it("allows advanced bottom padding to pin the video to the top edge", () => {
		const layout = computePaddedLayout({
			...BASE_LAYOUT_PARAMS,
			padding: {
				top: 0,
				bottom: ADVANCED_VERTICAL_PADDING_MAX,
				left: 0,
				right: 0,
				linked: false,
			},
		});

		expect(layout.centerOffsetY).toBeCloseTo(0);
	});

	it("allows advanced top padding to pin the video to the bottom edge", () => {
		const layout = computePaddedLayout({
			...BASE_LAYOUT_PARAMS,
			padding: {
				top: ADVANCED_VERTICAL_PADDING_MAX,
				bottom: 0,
				left: 0,
				right: 0,
				linked: false,
			},
		});

		expect(layout.centerOffsetY + layout.croppedDisplayHeight).toBeCloseTo(
			BASE_LAYOUT_PARAMS.height,
		);
	});

	it("preserves linked padding centering behavior", () => {
		const layout = computePaddedLayout({
			...BASE_LAYOUT_PARAMS,
			padding: { top: 20, bottom: 20, left: 20, right: 20, linked: true },
		});

		expect(layout.centerOffsetY).toBeCloseTo(40);
		expect(layout.centerOffsetY + layout.croppedDisplayHeight).toBeCloseTo(960);
	});
});

describe("scalePreviewBorderRadius", () => {
	it("uses a percentage of the content's shorter side", () => {
		expect(scalePreviewBorderRadius(1920, 1080, 8)).toBeCloseTo(86.4, 6);
		expect(scalePreviewBorderRadius(960, 540, 8)).toBeCloseTo(43.2, 6);
		expect(scalePreviewBorderRadius(500, 1000, 8)).toBeCloseTo(40, 6);
	});

	it("clamps invalid or empty preview sizes to zero", () => {
		expect(scalePreviewBorderRadius(0, 540, 16)).toBe(0);
		expect(scalePreviewBorderRadius(960, 0, 16)).toBe(0);
		expect(scalePreviewBorderRadius(960, 540, -8)).toBe(0);
	});
});

describe("computePaddedLayout with a free screen rectangle", () => {
	it("fits the video in the rectangle and centers it", () => {
		const layout = computePaddedLayout({
			width: 1000,
			height: 1000,
			padding: 0,
			cropRegion: { x: 0, y: 0, width: 1, height: 1 },
			videoWidth: 1600,
			videoHeight: 900,
			screenRect: { x: 0.1, y: 0.2, width: 0.4, height: 0.4 },
		});

		expect(layout.croppedDisplayWidth).toBeCloseTo(400);
		expect(layout.croppedDisplayHeight).toBeCloseTo(225);
		expect(layout.centerOffsetX).toBeCloseTo(100);
		expect(layout.centerOffsetY).toBeCloseTo(200 + (400 - 225) / 2);
		expect(layout.scale).toBeCloseTo(0.25);
	});

	it("positions the sprite so the crop starts at the rectangle", () => {
		const layout = computePaddedLayout({
			width: 1000,
			height: 1000,
			padding: 0,
			cropRegion: { x: 0.5, y: 0, width: 0.5, height: 1 },
			videoWidth: 1000,
			videoHeight: 1000,
			screenRect: { x: 0, y: 0, width: 0.5, height: 0.5 },
		});

		expect(layout.croppedDisplayWidth).toBeCloseTo(250);
		expect(layout.spriteX).toBeCloseTo(
			layout.centerOffsetX - 0.5 * layout.fullVideoDisplayWidth,
		);
	});

	it("is ignored when no rectangle is given", () => {
		const base = computePaddedLayout({ ...BASE_LAYOUT_PARAMS, padding: 10 });
		const same = computePaddedLayout({ ...BASE_LAYOUT_PARAMS, padding: 10, screenRect: null });
		expect(same).toEqual(base);
	});
});
