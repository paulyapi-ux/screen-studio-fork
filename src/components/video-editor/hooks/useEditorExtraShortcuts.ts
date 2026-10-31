import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import {
	getSeekTarget,
	isEditorShortcutTargetIgnored,
	resolveEditorExtraShortcut,
} from "@/lib/editorExtraShortcuts";

type Input = {
	isMac: boolean;
	playheadSeconds: number;
	durationSeconds: number;
	seekTo: (seconds: number) => void;
	openExport: () => void;
	previewVolume: number;
	setPreviewVolume: Dispatch<SetStateAction<number>>;
};

/** Export, playhead movement and preview mute: the usual keys of a video tool. */
export function useEditorExtraShortcuts(input: Input) {
	const inputRef = useRef(input);
	inputRef.current = input;
	const volumeBeforeMute = useRef(1);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.isComposing) return;
			if (isEditorShortcutTargetIgnored(event.target)) return;
			const current = inputRef.current;
			const action = resolveEditorExtraShortcut(event, current.isMac);
			if (!action) return;

			if (action === "export") {
				event.preventDefault();
				current.openExport();
				return;
			}
			if (action === "toggleMutePreview") {
				event.preventDefault();
				if (current.previewVolume > 0) {
					volumeBeforeMute.current = current.previewVolume;
					current.setPreviewVolume(0);
				} else {
					current.setPreviewVolume(volumeBeforeMute.current || 1);
				}
				return;
			}
			const target = getSeekTarget(action, current.playheadSeconds, current.durationSeconds);
			if (target === null) return;
			event.preventDefault();
			current.seekTo(target);
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);
}
