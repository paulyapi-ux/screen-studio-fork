import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { useScopedT } from "@/contexts/I18nContext";
import { recordingMuteLog } from "@/lib/muteSpans";
import type { RecordingShortcutAction } from "@/lib/recordingShortcuts";
import { createRestartController } from "../restartController";

const RESTART_DELAY_MS = 3000;

interface RecordingShortcutState {
	recording: boolean;
	paused: boolean;
	finalizing: boolean;
	countdownActive: boolean;
	hasSelectedSource: boolean;
	microphoneEnabled: boolean;
	systemAudioEnabled: boolean;
	toggleRecording: () => void;
	pauseRecording: () => void;
	resumeRecording: () => void;
	cancelRecording: () => void;
}

/** Runs the global recording shortcuts (start/stop, pause/resume, restart) on the recording bar. */
export function useRecordingShortcutActions(state: RecordingShortcutState) {
	const t = useScopedT("launch");
	const [micMuted, setMicMuted] = useState(false);
	const [systemMuted, setSystemMuted] = useState(false);
	const stateRef = useRef(state);
	stateRef.current = state;
	const tRef = useRef(t);
	tRef.current = t;

	// A new take starts with nothing muted; the log restarts with it.
	const { recording, paused } = state;
	useEffect(() => {
		if (recording) {
			recordingMuteLog.start(Date.now());
		}
		setMicMuted(false);
		setSystemMuted(false);
	}, [recording]);
	useEffect(() => {
		recordingMuteLog.setPaused(paused, Date.now());
	}, [paused]);

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
					case "toggleMicrophone": {
						if (!current.recording || !current.microphoneEnabled) return;
						setMicMuted(recordingMuteLog.toggle("mic", Date.now()));
						return;
					}
					case "toggleSystemAudio": {
						if (!current.recording || !current.systemAudioEnabled) return;
						setSystemMuted(recordingMuteLog.toggle("system", Date.now()));
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

	return { micMuted, systemMuted };
}
