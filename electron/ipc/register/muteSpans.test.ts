import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ ipcMain: { handle: vi.fn() } }));

import { getMuteSpansPath, sanitizeMuteSpans, writeMuteSpansSidecar } from "./muteSpans";

const video = path.resolve("/recordings/take-1.mp4");

describe("mute spans sidecar", () => {
	it("is named after the recording", () => {
		expect(getMuteSpansPath("/a/b/take-1.mp4")).toBe("/a/b/take-1.mute-spans.json");
	});

	it("keeps valid spans, sorted, and drops the rest", () => {
		expect(
			sanitizeMuteSpans([
				{ track: "system", startMs: 5000.4, endMs: 8000 },
				{ track: "mic", startMs: 1000, endMs: 2000 },
				{ track: "webcam", startMs: 0, endMs: 10 },
				{ track: "mic", startMs: 500, endMs: 500 },
				{ track: "mic", startMs: -1, endMs: 5 },
				"junk",
			]),
		).toEqual([
			{ track: "mic", startMs: 1000, endMs: 2000 },
			{ track: "system", startMs: 5000, endMs: 8000 },
		]);
		expect(sanitizeMuteSpans(undefined)).toEqual([]);
	});

	it("writes the file next to the recording", async () => {
		const writeFile = vi.fn(async () => {});
		const result = await writeMuteSpansSidecar(
			video,
			[{ track: "mic", startMs: 100, endMs: 900 }],
			writeFile,
		);
		expect(result.success).toBe(true);
		expect(writeFile).toHaveBeenCalledTimes(1);
		const [filePath, content] = writeFile.mock.calls[0] as unknown as [string, string];
		expect(filePath).toBe(getMuteSpansPath(video));
		expect(JSON.parse(content)).toEqual({
			version: 1,
			spans: [{ track: "mic", startMs: 100, endMs: 900 }],
		});
	});

	it("writes nothing when there is nothing muted, and refuses other paths", async () => {
		const writeFile = vi.fn(async () => {});
		await expect(writeMuteSpansSidecar(video, [], writeFile)).resolves.toEqual({
			success: true,
		});
		expect(writeFile).not.toHaveBeenCalled();
		expect(
			(
				await writeMuteSpansSidecar(
					"relative.mp4",
					[{ track: "mic", startMs: 1, endMs: 2 }],
					writeFile,
				)
			).success,
		).toBe(false);
		expect(
			(
				await writeMuteSpansSidecar(
					path.resolve("/x/notes.txt"),
					[{ track: "mic", startMs: 1, endMs: 2 }],
					writeFile,
				)
			).success,
		).toBe(false);
	});
});
