/**
 * Free composition geometry: rectangles are expressed as fractions of the canvas (0..1),
 * so a composition does not depend on the output resolution.
 */

export interface NormalizedRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export type CompositionElementId = "screen" | "webcam";

export interface CompositionLocks {
	/** Global lock: nothing can be moved or resized. */
	all: boolean;
	screen: boolean;
	webcam: boolean;
}

export const DEFAULT_COMPOSITION_LOCKS: CompositionLocks = {
	all: false,
	screen: false,
	webcam: false,
};

export interface CompositionGrid {
	enabled: boolean;
	/** Number of columns the canvas width is divided in (rows follow from the aspect ratio). */
	columns: number;
	snap: boolean;
}

export const DEFAULT_COMPOSITION_GRID: CompositionGrid = {
	enabled: false,
	columns: 12,
	snap: true,
};

export type SnapGuideKind = "canvas" | "element" | "grid";

export interface SnapGuide {
	axis: "x" | "y";
	/** Position as a fraction of the canvas width (axis x) or height (axis y). */
	position: number;
	kind: SnapGuideKind;
}

export interface SnapResult {
	rect: NormalizedRect;
	guides: SnapGuide[];
}

export interface CanvasSize {
	width: number;
	height: number;
}

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/** Snap distance in screen pixels. */
export const DEFAULT_SNAP_THRESHOLD_PX = 8;
export const MIN_ELEMENT_FRACTION = 0.05;

const EPSILON = 1e-6;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

export function isElementLocked(locks: CompositionLocks, id: CompositionElementId): boolean {
	return locks.all || locks[id];
}

export function toggleElementLock(
	locks: CompositionLocks,
	id: CompositionElementId,
): CompositionLocks {
	return { ...locks, [id]: !locks[id] };
}

export function setAllLocked(locks: CompositionLocks, all: boolean): CompositionLocks {
	return { ...locks, all };
}

/** Grid line positions (fractions) on one axis. */
export function getGridLines(grid: CompositionGrid, canvas: CanvasSize, axis: "x" | "y"): number[] {
	if (!grid.enabled || grid.columns < 1) return [];
	const columns = Math.round(grid.columns);
	if (axis === "x") {
		return Array.from({ length: columns + 1 }, (_, i) => i / columns);
	}
	// Square cells: the row count follows the canvas aspect ratio.
	const rows = Math.max(1, Math.round((columns * canvas.height) / canvas.width));
	return Array.from({ length: rows + 1 }, (_, i) => i / rows);
}

interface Target {
	position: number;
	kind: SnapGuideKind;
}

function collectTargets(
	axis: "x" | "y",
	others: readonly NormalizedRect[],
	grid: CompositionGrid | null,
	canvas: CanvasSize,
): Target[] {
	const targets: Target[] = [
		{ position: 0, kind: "canvas" },
		{ position: 0.5, kind: "canvas" },
		{ position: 1, kind: "canvas" },
	];
	for (const other of others) {
		const start = axis === "x" ? other.x : other.y;
		const size = axis === "x" ? other.width : other.height;
		targets.push(
			{ position: start, kind: "element" },
			{ position: start + size / 2, kind: "element" },
			{ position: start + size, kind: "element" },
		);
	}
	if (grid?.enabled && grid.snap) {
		for (const position of getGridLines(grid, canvas, axis)) {
			targets.push({ position, kind: "grid" });
		}
	}
	return targets;
}

interface AxisSnap {
	delta: number;
	guides: SnapGuide[];
}

/** Finds the smallest shift that brings one of `edges` onto one of `targets`. */
function snapAxis(
	axis: "x" | "y",
	edges: readonly number[],
	targets: readonly Target[],
	threshold: number,
): AxisSnap {
	let best: { delta: number } | null = null;
	for (const edge of edges) {
		for (const target of targets) {
			const delta = target.position - edge;
			if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
				best = { delta };
			}
		}
	}
	if (!best) return { delta: 0, guides: [] };

	const guides: SnapGuide[] = [];
	for (const edge of edges) {
		for (const target of targets) {
			if (Math.abs(edge + best.delta - target.position) < EPSILON) {
				if (
					!guides.some(
						(guide) =>
							Math.abs(guide.position - target.position) < EPSILON &&
							guide.kind === target.kind,
					)
				) {
					guides.push({ axis, position: target.position, kind: target.kind });
				}
			}
		}
	}
	return { delta: best.delta, guides };
}

export function keepRectOnCanvas(rect: NormalizedRect): NormalizedRect {
	const width = clamp(rect.width, MIN_ELEMENT_FRACTION, 1);
	const height = clamp(rect.height, MIN_ELEMENT_FRACTION, 1);
	return {
		x: clamp(rect.x, 0, 1 - width),
		y: clamp(rect.y, 0, 1 - height),
		width,
		height,
	};
}

export interface SnapOptions {
	canvas: CanvasSize;
	others: readonly NormalizedRect[];
	grid?: CompositionGrid | null;
	thresholdPx?: number;
	/** Holding Alt (or similar) disables snapping while dragging. */
	disabled?: boolean;
}

/** Moves a rect, snapping its edges/center to the canvas, other elements and the grid. */
export function snapMove(rect: NormalizedRect, options: SnapOptions): SnapResult {
	const moved = keepRectOnCanvas(rect);
	if (options.disabled) return { rect: moved, guides: [] };

	const threshold = options.thresholdPx ?? DEFAULT_SNAP_THRESHOLD_PX;
	const grid = options.grid ?? null;
	const xSnap = snapAxis(
		"x",
		[moved.x, moved.x + moved.width / 2, moved.x + moved.width],
		collectTargets("x", options.others, grid, options.canvas),
		threshold / options.canvas.width,
	);
	const ySnap = snapAxis(
		"y",
		[moved.y, moved.y + moved.height / 2, moved.y + moved.height],
		collectTargets("y", options.others, grid, options.canvas),
		threshold / options.canvas.height,
	);

	return {
		rect: keepRectOnCanvas({ ...moved, x: moved.x + xSnap.delta, y: moved.y + ySnap.delta }),
		guides: [...xSnap.guides, ...ySnap.guides],
	};
}

export interface ResizeOptions extends SnapOptions {
	/**
	 * Width / height of the element in canvas pixels to preserve (the video aspect ratio).
	 * `null` lets the element take any shape.
	 */
	aspectRatio?: number | null;
}

/**
 * Resizes a rect by dragging `handle` to `pointer` (fractions of the canvas). The dragged
 * edges snap; the opposite edges stay put.
 */
export function snapResize(
	rect: NormalizedRect,
	handle: ResizeHandle,
	pointer: { x: number; y: number },
	options: ResizeOptions,
): SnapResult {
	const { canvas } = options;
	const grid = options.grid ?? null;
	const threshold = options.thresholdPx ?? DEFAULT_SNAP_THRESHOLD_PX;
	const movesLeft = handle.includes("w");
	const movesRight = handle.includes("e");
	const movesTop = handle.includes("n");
	const movesBottom = handle.includes("s");

	let left = rect.x;
	let right = rect.x + rect.width;
	let top = rect.y;
	let bottom = rect.y + rect.height;
	const guides: SnapGuide[] = [];

	if (movesLeft) left = clamp(pointer.x, 0, right - MIN_ELEMENT_FRACTION);
	if (movesRight) right = clamp(pointer.x, left + MIN_ELEMENT_FRACTION, 1);
	if (movesTop) top = clamp(pointer.y, 0, bottom - MIN_ELEMENT_FRACTION);
	if (movesBottom) bottom = clamp(pointer.y, top + MIN_ELEMENT_FRACTION, 1);

	if (!options.disabled) {
		const xTargets = collectTargets("x", options.others, grid, canvas);
		const yTargets = collectTargets("y", options.others, grid, canvas);
		if (movesLeft || movesRight) {
			const edge = movesLeft ? left : right;
			const snap = snapAxis("x", [edge], xTargets, threshold / canvas.width);
			if (movesLeft) left += snap.delta;
			else right += snap.delta;
			guides.push(...snap.guides);
		}
		if (movesTop || movesBottom) {
			const edge = movesTop ? top : bottom;
			const snap = snapAxis("y", [edge], yTargets, threshold / canvas.height);
			if (movesTop) top += snap.delta;
			else bottom += snap.delta;
			guides.push(...snap.guides);
		}
	}

	let width = right - left;
	let height = bottom - top;

	const aspect = options.aspectRatio;
	if (aspect && aspect > 0) {
		// Width in fractions = aspect * height in fractions * (canvas.height / canvas.width).
		const ratio = (aspect * canvas.height) / canvas.width;
		const widthDriven = (movesLeft || movesRight) && !(movesTop || movesBottom);
		const heightDriven = (movesTop || movesBottom) && !(movesLeft || movesRight);
		if (widthDriven || (!heightDriven && width / ratio >= height)) {
			height = width / ratio;
		} else {
			width = height * ratio;
		}
		// Keep the anchored corner fixed.
		if (movesLeft) left = right - width;
		else right = left + width;
		if (movesTop) top = bottom - height;
		else bottom = top + height;
		if (!movesTop && !movesBottom) {
			// Side handle: grow vertically around the vertical center.
			const centerY = rect.y + rect.height / 2;
			top = centerY - height / 2;
			bottom = top + height;
		}
		if (!movesLeft && !movesRight) {
			const centerX = rect.x + rect.width / 2;
			left = centerX - width / 2;
			right = left + width;
		}
	}

	let result: NormalizedRect = { x: left, y: top, width, height };
	// Never let the element leave the canvas: shrink (keeping the aspect) if it would.
	if (
		result.x < 0 ||
		result.y < 0 ||
		result.x + result.width > 1 + EPSILON ||
		result.y + result.height > 1 + EPSILON
	) {
		const overflowScale = Math.min(
			1,
			result.x < 0 ? (result.x + result.width) / result.width : 1,
			result.y < 0 ? (result.y + result.height) / result.height : 1,
			result.x + result.width > 1 ? (1 - result.x) / result.width : 1,
			result.y + result.height > 1 ? (1 - result.y) / result.height : 1,
		);
		const w = Math.max(MIN_ELEMENT_FRACTION, result.width * overflowScale);
		const h = Math.max(MIN_ELEMENT_FRACTION, result.height * overflowScale);
		result = {
			x: movesLeft ? result.x + result.width - w : result.x,
			y: movesTop ? result.y + result.height - h : result.y,
			width: w,
			height: h,
		};
	}
	return { rect: keepRectOnCanvas(result), guides };
}

/**
 * Largest rect with `aspectRatio` (pixels) that fits in `box`, centered in it.
 * Used to place the screen recording inside the free rectangle chosen by the user.
 */
export function fitAspectInRect(
	box: NormalizedRect,
	aspectRatio: number,
	canvas: CanvasSize,
): NormalizedRect {
	const boxWidthPx = box.width * canvas.width;
	const boxHeightPx = box.height * canvas.height;
	if (boxWidthPx <= 0 || boxHeightPx <= 0 || !(aspectRatio > 0)) return box;
	const widthPx = Math.min(boxWidthPx, boxHeightPx * aspectRatio);
	const heightPx = widthPx / aspectRatio;
	return {
		x: box.x + (box.width - widthPx / canvas.width) / 2,
		y: box.y + (box.height - heightPx / canvas.height) / 2,
		width: widthPx / canvas.width,
		height: heightPx / canvas.height,
	};
}

/** Edges that can be "aligned" in one click: left, h-center, right, top, v-center, bottom. */
export type AlignAction = "left" | "center-x" | "right" | "top" | "center-y" | "bottom";

export function alignRect(rect: NormalizedRect, action: AlignAction): NormalizedRect {
	switch (action) {
		case "left":
			return { ...rect, x: 0 };
		case "center-x":
			return { ...rect, x: (1 - rect.width) / 2 };
		case "right":
			return { ...rect, x: 1 - rect.width };
		case "top":
			return { ...rect, y: 0 };
		case "center-y":
			return { ...rect, y: (1 - rect.height) / 2 };
		case "bottom":
			return { ...rect, y: 1 - rect.height };
	}
}
