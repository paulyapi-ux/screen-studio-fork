import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	applyHardwareEncoderVerdict,
	getHardwareEncoderVerdict,
	parseEncoderProbeOutput,
	resetHardwareEncoderVerdictForTests,
	startHardwareEncoderProbe,
} from "./encoderProbe";

function fakeChild() {
	const child = new EventEmitter() as EventEmitter & {
		stdout: EventEmitter;
		kill: ReturnType<typeof vi.fn>;
	};
	child.stdout = new EventEmitter();
	child.kill = vi.fn();
	return child;
}

describe("parseEncoderProbeOutput", () => {
	it("reads the helper's JSON line", () => {
		expect(parseEncoderProbeOutput('{"hardware":true,"ms":180}\n')).toEqual({
			hardware: true,
			ms: 180,
		});
		expect(parseEncoderProbeOutput('noise\r\n{"hardware":false,"ms":3012}\r\n')).toEqual({
			hardware: false,
			ms: 3012,
		});
	});

	it("rejects missing or malformed answers", () => {
		expect(parseEncoderProbeOutput("")).toBeNull();
		expect(parseEncoderProbeOutput("{not json")).toBeNull();
		expect(parseEncoderProbeOutput('{"ms":5}')).toBeNull();
	});
});

describe("startHardwareEncoderProbe", () => {
	beforeEach(() => {
		resetHardwareEncoderVerdictForTests();
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("stores a positive verdict and passes it to recordings", async () => {
		const child = fakeChild();
		const spawnProcess = vi.fn(() => child as unknown as ChildProcess);
		const promise = startHardwareEncoderProbe({
			exePath: "wgc-capture.exe",
			width: 3840,
			height: 2160,
			spawnProcess,
			log: () => {},
		});
		child.stdout.emit("data", Buffer.from('{"hardware":true,"ms":120}\n'));
		child.emit("close", 0);

		await expect(promise).resolves.toBe("yes");
		expect(spawnProcess).toHaveBeenCalledWith("wgc-capture.exe", [
			"--probe-encoder",
			"3840",
			"2160",
			"60",
		]);

		const config: Record<string, unknown> = {};
		applyHardwareEncoderVerdict(config);
		expect(config).toEqual({
			hardwareEncoder: 1,
			hardwareProbeWidth: 3840,
			hardwareProbeHeight: 2160,
		});
	});

	it("stores a negative verdict", async () => {
		const child = fakeChild();
		const promise = startHardwareEncoderProbe({
			exePath: "x",
			width: 1920,
			height: 1080,
			spawnProcess: () => child as unknown as ChildProcess,
			log: () => {},
		});
		child.stdout.emit("data", Buffer.from('{"hardware":false,"ms":3000}\n'));
		child.emit("close", 0);
		await expect(promise).resolves.toBe("no");

		const config: Record<string, unknown> = {};
		applyHardwareEncoderVerdict(config);
		expect(config.hardwareEncoder).toBe(0);
	});

	it("counts a helper that never answers as no, and kills it", async () => {
		const child = fakeChild();
		const promise = startHardwareEncoderProbe({
			exePath: "x",
			width: 1920,
			height: 1080,
			timeoutMs: 5000,
			spawnProcess: () => child as unknown as ChildProcess,
			log: () => {},
		});
		await vi.advanceTimersByTimeAsync(5000);
		await expect(promise).resolves.toBe("no");
		expect(child.kill).toHaveBeenCalled();
		expect(getHardwareEncoderVerdict()).toBe("no");
	});

	it("stays unknown when the helper cannot run", async () => {
		const child = fakeChild();
		const promise = startHardwareEncoderProbe({
			exePath: "x",
			width: 1920,
			height: 1080,
			spawnProcess: () => child as unknown as ChildProcess,
			log: () => {},
		});
		child.emit("error", new Error("ENOENT"));
		await expect(promise).resolves.toBe("unknown");

		const config: Record<string, unknown> = {};
		applyHardwareEncoderVerdict(config);
		expect(config).toEqual({});
	});
});
