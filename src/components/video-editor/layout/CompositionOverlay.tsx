import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import {
	type NormalizedRect,
	type ResizeHandle,
	type SnapGuide,
	snapMove,
	snapResize,
} from "@/lib/composition/geometry";

type Drag =
	| { kind: "move"; start: NormalizedRect; pointerX: number; pointerY: number }
	| { kind: "resize"; handle: ResizeHandle; start: NormalizedRect };

type Props = {
	/** Where the screen is now, as fractions of the canvas. */
	rect: NormalizedRect;
	/** Width / height of the screen picture: the frame never gets squashed. */
	aspectRatio: number;
	/** Called while the frame is dragged or resized. */
	onChange: (rect: NormalizedRect) => void;
	label: string;
};

const CORNERS: Array<{ handle: ResizeHandle; className: string; cursor: string }> = [
	{ handle: "nw", className: "-left-1.5 -top-1.5", cursor: "nwse-resize" },
	{ handle: "ne", className: "-right-1.5 -top-1.5", cursor: "nesw-resize" },
	{ handle: "sw", className: "-bottom-1.5 -left-1.5", cursor: "nesw-resize" },
	{ handle: "se", className: "-bottom-1.5 -right-1.5", cursor: "nwse-resize" },
];

/**
 * Draggable frame drawn over the preview in composition mode. Dragging moves the screen,
 * the corners resize it (same proportions). The edges and the center snap to the canvas, and
 * guide lines show what it snapped to; hold Alt to move freely.
 */
export function CompositionOverlay({ rect, aspectRatio, onChange, label }: Props) {
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

	const beginDrag = (event: ReactPointerEvent<HTMLElement>, target: ResizeHandle | "move") => {
		const point = toFractions(event);
		if (!point) return;
		event.stopPropagation();
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		dragRef.current =
			target === "move"
				? { kind: "move", start: rect, pointerX: point.x, pointerY: point.y }
				: { kind: "resize", handle: target, start: rect };
	};

	const handleMove = (event: ReactPointerEvent<HTMLElement>) => {
		const drag = dragRef.current;
		const point = toFractions(event);
		if (!drag || !point) return;
		const snapping = { canvas: point.canvas, others: [], disabled: event.altKey };
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
			onChange(result.rect);
			return;
		}
		const result = snapResize(
			drag.start,
			drag.handle,
			{ x: point.x, y: point.y },
			{ ...snapping, aspectRatio },
		);
		setGuides(result.guides);
		onChange(result.rect);
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
			<div
				role="group"
				aria-label={label}
				className="pointer-events-auto absolute cursor-move touch-none border-2 border-[#2563EB] bg-[#2563EB]/5"
				style={{
					left: `${rect.x * 100}%`,
					top: `${rect.y * 100}%`,
					width: `${rect.width * 100}%`,
					height: `${rect.height * 100}%`,
				}}
				onPointerDown={(event) => beginDrag(event, "move")}
				onPointerMove={handleMove}
				onPointerUp={endDrag}
				onPointerCancel={endDrag}
			>
				{CORNERS.map(({ handle, className, cursor }) => (
					<div
						key={handle}
						className={`absolute size-3 rounded-sm border border-white bg-[#2563EB] ${className}`}
						style={{ cursor }}
						onPointerDown={(event) => beginDrag(event, handle)}
						onPointerMove={handleMove}
						onPointerUp={endDrag}
						onPointerCancel={endDrag}
					/>
				))}
			</div>
		</div>
	);
}
