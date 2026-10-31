/**
 * Mute spans: when the user mutes the microphone or the system sound during a recording, the
 * audio keeps being recorded. Only the muted stretches are noted, so nothing is lost and the
 * editor can silence (or restore) them later. Times are in recording time: milliseconds since
 * the start of the take, with paused stretches left out (as in the video).
 */
export type MuteTrack = "mic" | "system";

export interface MuteSpan {
	track: MuteTrack;
	startMs: number;
	endMs: number;
}

export interface MuteSpansFile {
	version: 1;
	spans: MuteSpan[];
}

export function createMuteSpansFile(spans: MuteSpan[]): MuteSpansFile {
	return { version: 1, spans };
}

export class MuteSpanLog {
	private startedAtMs: number | null = null;
	private pausedAtMs: number | null = null;
	private pausedTotalMs = 0;
	private openSince = new Map<MuteTrack, number>();
	private spans: MuteSpan[] = [];

	isActive(): boolean {
		return this.startedAtMs !== null;
	}

	start(nowMs: number) {
		this.startedAtMs = nowMs;
		this.pausedAtMs = null;
		this.pausedTotalMs = 0;
		this.openSince.clear();
		this.spans = [];
	}

	setPaused(paused: boolean, nowMs: number) {
		if (this.startedAtMs === null) return;
		if (paused && this.pausedAtMs === null) {
			this.pausedAtMs = nowMs;
		} else if (!paused && this.pausedAtMs !== null) {
			this.pausedTotalMs += nowMs - this.pausedAtMs;
			this.pausedAtMs = null;
		}
	}

	isMuted(track: MuteTrack): boolean {
		return this.openSince.has(track);
	}

	/** Mutes or unmutes `track`. Returns whether it is muted now. */
	toggle(track: MuteTrack, nowMs: number): boolean {
		if (this.startedAtMs === null) return false;
		const at = this.recordingTime(nowMs);
		const since = this.openSince.get(track);
		if (since === undefined) {
			this.openSince.set(track, at);
			return true;
		}
		this.openSince.delete(track);
		if (at > since) this.spans.push({ track, startMs: since, endMs: at });
		return false;
	}

	/** Ends the take: closes any open span and returns every span, in time order. */
	take(nowMs: number): MuteSpan[] {
		if (this.startedAtMs === null) return [];
		const at = this.recordingTime(nowMs);
		for (const [track, since] of this.openSince) {
			if (at > since) this.spans.push({ track, startMs: since, endMs: at });
		}
		const result = [...this.spans].sort((a, b) => a.startMs - b.startMs);
		this.startedAtMs = null;
		this.pausedAtMs = null;
		this.pausedTotalMs = 0;
		this.openSince.clear();
		this.spans = [];
		return result;
	}

	private recordingTime(nowMs: number): number {
		const pausedNow = this.pausedAtMs !== null ? nowMs - this.pausedAtMs : 0;
		return Math.max(0, nowMs - (this.startedAtMs ?? nowMs) - this.pausedTotalMs - pausedNow);
	}
}

/** Shared by the recording bar and the recorder hook, which live in the same window. */
export const recordingMuteLog = new MuteSpanLog();
