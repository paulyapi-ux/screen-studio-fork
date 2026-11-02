import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { LockIcon, LockOpenIcon } from "@/components/ui/icons";
import {
	type CanvasSize,
	type CompositionGrid,
	getGridLines,
	type NormalizedRect,
	type ResizeHandle,
	type SnapGuide,
	snapMove,
	snapResize,
} from "@/lib/composition/geometry";

export type CompositionFrame = {
	id: string;
	/** Where the source is now, as fractions of the canvas. */
	rect: NormalizedRect;
	/** Width / height of the source picture: the frame never gets squashed. */
	aspectRatio: number;
	label: string;
	/** A locked source cannot be moved or resized (its look can still be changed). */
	locked: boolean;
	lockLabel: string;
	/** Called while the frame is dragged or resized. */
	onChange: (rect: NormalizedRect) => void;
};

type Drag =
	| { id: string; kind: "move"; start: NormalizedRect; pointerX: number; pointerY: number }
	| { id: string; kind: "resize"; handle: ResizeHandle; start: NormalizedRect };

const CORNERS: Array<{ handle: ResizeHandle; className: string; cursor: string }> = [
	{ handle: "nw", className: "-left-1.5 -top-1.5", cursor: "nwse-resize" },
	{ handle: "ne", className: "-right-1.5 -top-1.5", cursor: "nesw-resize" },
	{ handle: "sw", className: "-bottom-1.5 -left-1.5", cursor: "nesw-resize" },
	{ handle: "se", className: "-bottom-1.5 -right-1.5", cursor: "nwse-resize" },
];

/**
 * Draggable frames drawn over the preview in composition mode, one per source (screen, webcam).
 * Dragging moves a source, the corners resize it (same proportions). Edges and centers snap to
 * the canvas and to the other sources, with guide lines showing what it snapped to; hold Alt
 * to move freely.
 */
export function CompositionOverlay({
	frames,
	grid,
	canvas,
	onToggleLock,
}: {
	frames: CompositionFrame[];
	grid: CompositionGrid;
	canvas: CanvasSize;
	onToggleLock: (id: string) => void;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const dragRef = useRef<Drag | null>(null);
	const [guides, setGuides] = useState<SnapGuide[]>([]);

	useEffect(() => () => setGuides([]), []);

	const toFractions = (event: ReactPointerEvent) => {
		const bounds = rootRef.current?.getBoundingClientRect();
		if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
		return {
			x: (event.clientX - bounds.left) / bounds.width,
			y: (event.clientY - bounds.top) / bounds.height,
			canvas: { width: bounds.width, height: bounds.height },
		};
	};

	const beginDrag = (
		event: ReactPointerEvent<HTMLElement>,
		frame: CompositionFrame,
		target: ResizeHandle | "move",
	) => {
		if (frame.locked) {
			event.stopPropagation();
			return;
		}
		const point = toFractions(event);
		if (!point) return;
		event.stopPropagation();
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		dragRef.current =
			target === "move"
				? {
						id: frame.id,
						kind: "move",
						start: frame.rect,
						pointerX: point.x,
						pointerY: point.y,
					}
				: { id: frame.id, kind: "resize", handle: target, start: frame.rect };
	};

	const handleMove = (event: ReactPointerEvent<HTMLElement>) => {
		const drag = dragRef.current;
		const point = toFractions(event);
		if (!drag || !point) return;
		const frame = frames.find((candidate) => candidate.id === drag.id);
		if (!frame) return;
		const snapping = {
			canvas: point.canvas,
			others: frames.filter((other) => other.id !== drag.id).map((other) => other.rect),
			disabled: event.altKey,
			grid,
		};
		if (drag.kind === "move") {
			const result = snapMove(
				{
					...drag.start,
					x: drag.start.x + (point.x - drag.pointerX),
					y: drag.start.y + (point.y - drag.pointerY),
				},
				snapping,
			);
			setGuides(result.guides);
			frame.onChange(result.rect);
			return;
		}
		const result = snapResize(
			drag.start,
			drag.handle,
			{ x: point.x, y: point.y },
			{ ...snapping, aspectRatio: frame.aspectRatio },
		);
		setGuides(result.guides);
		frame.onChange(result.rect);
	};

	const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
		if (!dragRef.current) return;
		dragRef.current = null;
		setGuides([]);
		try {
			event.currentTarget.releasePointerCapture(event.pointerId);
		} catch {
			// Capture already released.
		}
	};

	return (
		<div ref={rootRef} className="pointer-events-none absolute inset-0 z-30">
			{grid.enabled
				? ["x", "y"].flatMap((axis) =>
						getGridLines(grid, canvas, axis as "x" | "y").map((position) => (
							<div
								key={`grid-${axis}-${position}`}
								className={
									axis === "x"
										? "absolute top-0 bottom-0 w-px bg-white/25"
										: "absolute left-0 right-0 h-px bg-white/25"
								}
								style={
									axis === "x"
										? { left: `${position * 100}%` }
										: { top: `${position * 100}%` }
								}
							/>
						)),
					)
				: null}
			{guides.map((guide) =>
				guide.axis === "x" ? (
					<div
						key={`x-${guide.position}-${guide.kind}`}
						className="absolute top-0 bottom-0 w-px bg-[#f43f5e]"
						style={{ left: `${guide.position * 100}%` }}
					/>
				) : (
					<div
						key={`y-${guide.position}-${guide.kind}`}
						className="absolute left-0 right-0 h-px bg-[#f43f5e]"
						style={{ top: `${guide.position * 100}%` }}
					/>
				),
			)}
			{frames.map((frame) => (
				<div
					key={frame.id}
					role="group"
					aria-label={frame.label}
					title={frame.label}
					className={`pointer-events-auto absolute touch-none border-2 ${
						frame.locked
							? "cursor-default border-[#f59e0b] bg-[#f59e0b]/5"
							: "cursor-move border-[#2563EB] bg-[#2563EB]/5"
					}`}
					style={{
						left: `${frame.rect.x * 100}%`,
						top: `${frame.rect.y * 100}%`,
						width: `${frame.rect.width * 100}%`,
						height: `${frame.rect.height * 100}%`,
					}}
					onPointerDown={(event) => beginDrag(event, frame, "move")}
					onPointerMove={handleMove}
					onPointerUp={endDrag}
					onPointerCancel={endDrag}
				>
					<button
						type="button"
						aria-label={frame.lockLabel}
						aria-pressed={frame.locked}
						title={frame.lockLabel}
						className={`absolute left-1 top-1 flex size-6 items-center justify-center rounded-md text-white ${
							frame.locked ? "bg-[#f59e0b]" : "bg-black/60 hover:bg-black/80"
						}`}
						onPointerDown={(event) => event.stopPropagation()}
						onClick={(event) => {
							event.stopPropagation();
							onToggleLock(frame.id);
						}}
					>
						{frame.locked ? (
							<LockIcon weight="fill" className="size-3.5" />
						) : (
							<LockOpenIcon className="size-3.5" />
						)}
					</button>
					{(frame.locked ? [] : CORNERS).map(({ handle, className, cursor }) => (
						<div
							key={handle}
							className={`absolute size-3 rounded-sm border border-white bg-[#2563EB] ${className}`}
							style={{ cursor }}
							onPointerDown={(event) => beginDrag(event, frame, handle)}
							onPointerMove={handleMove}
							onPointerUp={endDrag}
							onPointerCancel={endDrag}
						/>
					))}
				</div>
			))}
		</div>
	);
}
