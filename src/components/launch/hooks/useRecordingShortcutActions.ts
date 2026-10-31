import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/toast";
import { useScopedT } from "@/contexts/I18nContext";
import type { RecordingShortcutAction } from "@/lib/recordingShortcuts";
import { createRestartController } from "../restartController";

const RESTART_DELAY_MS = 3000;

interface RecordingShortcutState {
	recording: boolean;
	paused: boolean;
	finalizing: boolean;
	countdownActive: boolean;
	hasSelectedSource: boolean;
	toggleRecording: () => void;
	pauseRecording: () => void;
	resumeRecording: () => void;
	cancelRecording: () => void;
}

/** Runs the global recording shortcuts (start/stop, pause/resume, restart) on the recording bar. */
export function useRecordingShortcutActions(state: RecordingShortcutState) {
	const t = useScopedT("launch");
	const stateRef = useRef(state);
	stateRef.current = state;
	const tRef = useRef(t);
	tRef.current = t;

	useEffect(() => {
		const restart = createRestartController({
			delayMs: RESTART_DELAY_MS,
			cancelRecording: () => stateRef.current.cancelRecording(),
			isIdle: () => {
				const { recording, finalizing } = stateRef.current;
				return !recording && !finalizing;
			},
			startRecording: () => stateRef.current.toggleRecording(),
			onNotice: (notice) => {
				if (notice === "pending") {
					toast.info(
						tRef.current("recording.restartPending", undefined, {
							seconds: String(RESTART_DELAY_MS / 1000),
						}),
					);
				} else {
					toast.info(tRef.current("recording.restartCancelled"));
				}
			},
		});

		const unsubscribe = window.electronAPI?.onRecordingShortcut?.(
			(action: RecordingShortcutAction) => {
				const current = stateRef.current;
				switch (action) {
					case "toggleRecording": {
						if (current.finalizing || current.countdownActive) return;
						if (!current.recording && !current.hasSelectedSource) {
							toast.info(tRef.current("recording.shortcutNeedSource"));
							return;
						}
						current.toggleRecording();
						return;
					}
					case "pauseResume": {
						if (!current.recording) return;
						if (current.paused) current.resumeRecording();
						else current.pauseRecording();
						return;
					}
					case "restartRecording": {
						if (!current.recording && !restart.isPending()) return;
						restart.trigger();
						return;
					}
				}
			},
		);

		return () => {
			unsubscribe?.();
			restart.dispose();
		};
	}, []);
}
