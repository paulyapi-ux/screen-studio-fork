import { type CanvasSize, type NormalizedRect } from "@/lib/composition/geometry";
import type { CropRegion, Padding } from "./types";
import { computePaddedLayout } from "./videoPlayback/layoutUtils";

/** Width / height of the part of the recording that is shown (after the crop). */
export function getCroppedVideoAspect(
	videoWidth: number,
	videoHeight: number,
	cropRegion: CropRegion,
): number {
	const width = videoWidth * cropRegion.width;
	const height = videoHeight * cropRegion.height;
	return height > 0 && width > 0 ? width / height : 16 / 9;
}

/**
 * Where the screen sits on the canvas, as fractions of the canvas: the free rectangle when the
 * user has moved it, otherwise the place the classic padded layout gives it.
 */
export function getEffectiveScreenRect(input: {
	screenRect: NormalizedRect | null;
	padding: Padding | number;
	cropRegion: CropRegion;
	videoWidth: number;
	videoHeight: number;
	canvas: CanvasSize;
}): NormalizedRect {
	if (input.screenRect) return input.screenRect;
	const layout = computePaddedLayout({
		width: input.canvas.width,
		height: input.canvas.height,
		padding: input.padding,
		cropRegion: input.cropRegion,
		videoWidth: input.videoWidth,
		videoHeight: input.videoHeight,
	});
	return {
		x: layout.centerOffsetX / input.canvas.width,
		y: layout.centerOffsetY / input.canvas.height,
		width: layout.croppedDisplayWidth / input.canvas.width,
		height: layout.croppedDisplayHeight / input.canvas.height,
	};
}
