import { loadAppSetting, saveAppSetting } from "@/lib/appSettings";

/** How sharp the editor preview is drawn. Never affects the exported file. */
export type PreviewQuality = "full" | "half" | "quarter";

export const PREVIEW_QUALITIES: readonly PreviewQuality[] = ["full", "half", "quarter"] as const;
export const DEFAULT_PREVIEW_QUALITY: PreviewQuality = "full";
export const PREVIEW_QUALITY_SETTING_KEY = "editor.previewQuality";

/** Share of the screen's native pixel density the preview is rendered at. */
const PREVIEW_QUALITY_FACTORS: Record<PreviewQuality, number> = {
	full: 1,
	half: 0.5,
	quarter: 0.25,
};

export function normalizePreviewQuality(value: unknown): PreviewQuality {
	return PREVIEW_QUALITIES.includes(value as PreviewQuality)
		? (value as PreviewQuality)
		: DEFAULT_PREVIEW_QUALITY;
}

/**
 * Renderer resolution (pixels per CSS pixel) for a quality level. Half and quarter apply to the
 * native density, so a 2x screen drawn at half quality renders at 1x.
 */
export function getPreviewResolution(devicePixelRatio: number, quality: PreviewQuality): number {
	const native = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
	return native * PREVIEW_QUALITY_FACTORS[quality];
}

export function loadPreviewQuality(): PreviewQuality {
	return normalizePreviewQuality(loadAppSetting<string>(PREVIEW_QUALITY_SETTING_KEY));
}

export function savePreviewQuality(quality: PreviewQuality): void {
	saveAppSetting(PREVIEW_QUALITY_SETTING_KEY, quality);
}
