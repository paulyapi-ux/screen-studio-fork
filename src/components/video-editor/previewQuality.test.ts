import { describe, expect, it } from "vitest";
import {
	DEFAULT_PREVIEW_QUALITY,
	getPreviewResolution,
	normalizePreviewQuality,
} from "./previewQuality";

describe("preview quality", () => {
	it("defaults to full quality for unknown values", () => {
		expect(DEFAULT_PREVIEW_QUALITY).toBe("full");
		expect(normalizePreviewQuality(undefined)).toBe("full");
		expect(normalizePreviewQuality(null)).toBe("full");
		expect(normalizePreviewQuality("ultra")).toBe("full");
	});

	it("keeps valid values", () => {
		expect(normalizePreviewQuality("half")).toBe("half");
		expect(normalizePreviewQuality("quarter")).toBe("quarter");
	});

	it("scales the native pixel density", () => {
		expect(getPreviewResolution(2, "full")).toBe(2);
		expect(getPreviewResolution(2, "half")).toBe(1);
		expect(getPreviewResolution(2, "quarter")).toBe(0.5);
		expect(getPreviewResolution(1.5, "half")).toBe(0.75);
	});

	it("falls back to 1x for an invalid pixel ratio", () => {
		expect(getPreviewResolution(0, "full")).toBe(1);
		expect(getPreviewResolution(Number.NaN, "half")).toBe(0.5);
	});
});
