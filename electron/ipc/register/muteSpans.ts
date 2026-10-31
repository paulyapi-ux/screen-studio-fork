import fs from "node:fs/promises";
import path from "node:path";
import { ipcMain } from "electron";
import { createMuteSpansFile, type MuteSpan } from "../../../src/lib/muteSpans";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".mkv"]);

/** `<recording>.mute-spans.json`, next to the recording. */
export function getMuteSpansPath(videoPath: string): string {
	return `${videoPath.replace(/\.[^./\\]+$/u, "")}.mute-spans.json`;
}

export function sanitizeMuteSpans(value: unknown): MuteSpan[] {
	if (!Array.isArray(value)) return [];
	const spans: MuteSpan[] = [];
	for (const item of value) {
		if (!item || typeof item !== "object") continue;
		const { track, startMs, endMs } = item as Partial<MuteSpan>;
		if (track !== "mic" && track !== "system") continue;
		if (typeof startMs !== "number" || typeof endMs !== "number") continue;
		if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
		if (startMs < 0 || endMs <= startMs) continue;
		spans.push({ track, startMs: Math.round(startMs), endMs: Math.round(endMs) });
	}
	return spans.sort((a, b) => a.startMs - b.startMs);
}

export async function writeMuteSpansSidecar(
	videoPath: unknown,
	spans: unknown,
	writeFile: (filePath: string, content: string) => Promise<void> = (filePath, content) =>
		fs.writeFile(filePath, content, "utf-8"),
): Promise<{ success: boolean; path?: string; error?: string }> {
	if (typeof videoPath !== "string" || !path.isAbsolute(videoPath)) {
		return { success: false, error: "Invalid recording path" };
	}
	if (!VIDEO_EXTENSIONS.has(path.extname(videoPath).toLowerCase())) {
		return { success: false, error: "Not a recording file" };
	}
	const clean = sanitizeMuteSpans(spans);
	if (clean.length === 0) return { success: true };
	const target = getMuteSpansPath(videoPath);
	try {
		await writeFile(target, JSON.stringify(createMuteSpansFile(clean), null, 2));
		return { success: true, path: target };
	} catch (error) {
		return { success: false, error: String(error) };
	}
}

export function registerMuteSpansHandlers() {
	ipcMain.handle("recording:save-mute-spans", (_event, videoPath: unknown, spans: unknown) =>
		writeMuteSpansSidecar(videoPath, spans),
	);
}
