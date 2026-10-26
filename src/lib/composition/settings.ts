import {
	type CompositionGrid,
	type CompositionLocks,
	DEFAULT_COMPOSITION_GRID,
	DEFAULT_COMPOSITION_LOCKS,
	keepRectOnCanvas,
	type NormalizedRect,
} from "./geometry";

/**
 * Free composition of a project. `screenRect` is the box the screen recording is fitted in
 * (fractions of the canvas); `null` keeps the classic padded layout. The webcam keeps using
 * its own position/size settings, the editor converts them when the user drags it.
 */
export interface CompositionSettings {
	screenRect: NormalizedRect | null;
	locks: CompositionLocks;
	grid: CompositionGrid;
}

export const DEFAULT_COMPOSITION: CompositionSettings = {
	screenRect: null,
	locks: DEFAULT_COMPOSITION_LOCKS,
	grid: DEFAULT_COMPOSITION_GRID,
};

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function normalizeRect(value: unknown): NormalizedRect | null {
	if (!value || typeof value !== "object") return null;
	const { x, y, width, height } = value as Partial<NormalizedRect>;
	if (
		!isFiniteNumber(x) ||
		!isFiniteNumber(y) ||
		!isFiniteNumber(width) ||
		!isFiniteNumber(height)
	) {
		return null;
	}
	return keepRectOnCanvas({ x, y, width, height });
}

/** Reads a composition from a saved project, falling back to defaults for anything invalid. */
export function normalizeComposition(value: unknown): CompositionSettings {
	if (!value || typeof value !== "object") return DEFAULT_COMPOSITION;
	const raw = value as Partial<Record<keyof CompositionSettings, unknown>>;
	const locks = (raw.locks && typeof raw.locks === "object" ? raw.locks : {}) as Partial<
		Record<keyof CompositionLocks, unknown>
	>;
	const grid = (raw.grid && typeof raw.grid === "object" ? raw.grid : {}) as Partial<
		Record<keyof CompositionGrid, unknown>
	>;

	return {
		screenRect: normalizeRect(raw.screenRect),
		locks: {
			all: typeof locks.all === "boolean" ? locks.all : DEFAULT_COMPOSITION_LOCKS.all,
			screen:
				typeof locks.screen === "boolean" ? locks.screen : DEFAULT_COMPOSITION_LOCKS.screen,
			webcam:
				typeof locks.webcam === "boolean" ? locks.webcam : DEFAULT_COMPOSITION_LOCKS.webcam,
		},
		grid: {
			enabled:
				typeof grid.enabled === "boolean" ? grid.enabled : DEFAULT_COMPOSITION_GRID.enabled,
			columns: isFiniteNumber(grid.columns)
				? Math.min(48, Math.max(2, Math.round(grid.columns)))
				: DEFAULT_COMPOSITION_GRID.columns,
			snap: typeof grid.snap === "boolean" ? grid.snap : DEFAULT_COMPOSITION_GRID.snap,
		},
	};
}
