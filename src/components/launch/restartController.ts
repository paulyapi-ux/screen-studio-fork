/**
 * "Restart from zero" asks for a short delay first, so that a shortcut pressed by mistake can
 * be taken back: the recording keeps running during the delay, and pressing the shortcut again
 * cancels the restart. Once the delay is over the current take is discarded and a new one starts.
 */
export interface RestartControllerDeps {
	delayMs: number;
	/** Discards the take in progress; may return a promise that resolves once it is released. */
	cancelRecording: () => void | Promise<void>;
	/** True once the discarded take is fully closed and a new one can start. */
	isIdle: () => boolean;
	startRecording: () => void;
	/** Called with "pending" when the delay starts, "cancelled" when it is taken back. */
	onNotice: (notice: "pending" | "cancelled") => void;
	setTimer?: (callback: () => void, ms: number) => unknown;
	clearTimer?: (handle: unknown) => void;
	pollIntervalMs?: number;
	maxWaitMs?: number;
}

export interface RestartController {
	trigger: () => void;
	isPending: () => boolean;
	dispose: () => void;
}

export function createRestartController({
	delayMs,
	cancelRecording,
	isIdle,
	startRecording,
	onNotice,
	setTimer = (callback, ms) => setTimeout(callback, ms),
	clearTimer = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
	pollIntervalMs = 100,
	maxWaitMs = 8000,
}: RestartControllerDeps): RestartController {
	let pendingHandle: unknown = null;
	let pollHandle: unknown = null;

	const stopPolling = () => {
		if (pollHandle !== null) {
			clearTimer(pollHandle);
			pollHandle = null;
		}
	};

	const waitUntilIdleThenStart = (waitedMs: number) => {
		if (isIdle()) {
			pollHandle = null;
			startRecording();
			return;
		}
		if (waitedMs >= maxWaitMs) {
			pollHandle = null;
			return;
		}
		pollHandle = setTimer(
			() => waitUntilIdleThenStart(waitedMs + pollIntervalMs),
			pollIntervalMs,
		);
	};

	return {
		trigger() {
			if (pendingHandle !== null) {
				clearTimer(pendingHandle);
				pendingHandle = null;
				onNotice("cancelled");
				return;
			}
			onNotice("pending");
			pendingHandle = setTimer(() => {
				pendingHandle = null;
				// The old take must be fully released (native capture closed) before a new one
				// starts, otherwise the new start is refused as "already recording".
				void Promise.resolve(cancelRecording())
					.catch(() => undefined)
					.then(() => waitUntilIdleThenStart(0));
			}, delayMs);
		},
		isPending: () => pendingHandle !== null,
		dispose() {
			if (pendingHandle !== null) clearTimer(pendingHandle);
			pendingHandle = null;
			stopPolling();
		},
	};
}
