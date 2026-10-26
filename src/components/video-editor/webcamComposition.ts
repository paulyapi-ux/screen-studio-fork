import type { NormalizedRect } from "@/lib/composition/geometry";
import { DEFAULT_WEBCAM_SIZE, type WebcamOverlaySettings } from "./types";
import {
	getWebcamOverlayDimensionsPx,
	getWebcamOverlayPosition,
	scaleWebcamOverlayPixels,
} from "./webcamOverlay";

const MIN_PERCENT = 10;
const MAX_PERCENT = 100;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function getSettingsPercents(webcam: WebcamOverlaySettings) {
	return {
		widthPercent: webcam.width ?? webcam.size ?? DEFAULT_WEBCAM_SIZE,
		heightPercent: webcam.height ?? webcam.size ?? DEFAULT_WEBCAM_SIZE,
	};
}

/** Where the webcam sits on the canvas, as fractions of the canvas (at zoom 1). */
export function getWebcamRectFraction(
	webcam: WebcamOverlaySettings,
	canvas: { width: number; height: number },
): NormalizedRect {
	const margin = scaleWebcamOverlayPixels(webcam.margin ?? 0, canvas.width);
	const { widthPercent, heightPercent } = getSettingsPercents(webcam);
	const size = getWebcamOverlayDimensionsPx({
		containerWidth: canvas.width,
		containerHeight: canvas.height,
		widthPercent,
		heightPercent,
		margin,
		zoomScale: 1,
		reactToZoom: false,
	});
	const position = getWebcamOverlayPosition({
		containerWidth: canvas.width,
		containerHeight: canvas.height,
		width: size.width,
		height: size.height,
		margin,
		positionPreset: webcam.positionPreset ?? webcam.corner,
		positionX: webcam.positionX,
		positionY: webcam.positionY,
		legacyCorner: webcam.corner,
	});
	return {
		x: position.x / canvas.width,
		y: position.y / canvas.height,
		width: size.width / canvas.width,
		height: size.height / canvas.height,
	};
}

/** Inverse of {@link getWebcamRectFraction}: the settings that place the webcam on `rect`. */
export function getWebcamSettingsFromRect(
	webcam: WebcamOverlaySettings,
	rect: NormalizedRect,
	canvas: { width: number; height: number },
): WebcamOverlaySettings {
	const minDimension = Math.min(canvas.width, canvas.height);
	const margin = scaleWebcamOverlayPixels(webcam.margin ?? 0, canvas.width);
	const widthPx = rect.width * canvas.width;
	const heightPx = rect.height * canvas.height;
	const availableWidth = Math.max(0, canvas.width - widthPx - margin * 2);
	const availableHeight = Math.max(0, canvas.height - heightPx - margin * 2);
	const positionX =
		availableWidth > 0 ? clamp((rect.x * canvas.width - margin) / availableWidth, 0, 1) : 0;
	const positionY =
		availableHeight > 0 ? clamp((rect.y * canvas.height - margin) / availableHeight, 0, 1) : 0;
	const width = clamp((widthPx / minDimension) * 100, MIN_PERCENT, MAX_PERCENT);
	const height = clamp((heightPx / minDimension) * 100, MIN_PERCENT, MAX_PERCENT);

	return {
		...webcam,
		positionPreset: "custom",
		positionX,
		positionY,
		width,
		height,
		size: width,
	};
}
