import { type ChildProcess, spawn } from "node:child_process";

/**
 * Hardware H.264 encoder check, run once in the background when the app starts (Windows).
 *
 * Some machines accept frames on their GPU encoder but never produce any, which would hang a
 * recording. The native helper tests the encoder (`wgc-capture.exe --probe-encoder`); the result
 * is handed to every recording so that pressing Record never waits for the test. Without a result
 * yet (or for a capture larger than the tested size) the helper runs the test itself.
 */

export type HardwareEncoderVerdict = "yes" | "no" | "unknown";

export const ENCODER_PROBE_TIMEOUT_MS = 10_000;

interface ProbeState {
	verdict: HardwareEncoderVerdict;
	width: number;
	height: number;
}

let state: ProbeState = { verdict: "unknown", width: 0, height: 0 };

export function parseEncoderProbeOutput(output: string): { hardware: boolean; ms: number } | null {
	for (const line of output.split(/\r?\n/u).reverse()) {
		const trimmed = line.trim();
		if (!trimmed.startsWith("{")) continue;
		try {
			const parsed = JSON.parse(trimmed) as { hardware?: unknown; ms?: unknown };
			if (typeof parsed.hardware !== "boolean") return null;
			return {
				hardware: parsed.hardware,
				ms: typeof parsed.ms === "number" && Number.isFinite(parsed.ms) ? parsed.ms : 0,
			};
		} catch {
			return null;
		}
	}
	return null;
}

export function getHardwareEncoderVerdict(): HardwareEncoderVerdict {
	return state.verdict;
}

/** Adds the start-up test result to the helper's JSON config when there is one. */
export function applyHardwareEncoderVerdict(config: Record<string, unknown>): void {
	if (state.verdict === "unknown") return;
	config.hardwareEncoder = state.verdict === "yes" ? 1 : 0;
	config.hardwareProbeWidth = state.width;
	config.hardwareProbeHeight = state.height;
}

export function resetHardwareEncoderVerdictForTests(): void {
	state = { verdict: "unknown", width: 0, height: 0 };
}

export interface EncoderProbeOptions {
	exePath: string;
	width: number;
	height: number;
	fps?: number;
	timeoutMs?: number;
	spawnProcess?: (command: string, args: string[]) => ChildProcess;
	log?: (message: string) => void;
}

/**
 * Starts the test and stores its result. A helper that does not answer in time is killed and
 * counts as "no": an encoder that hangs cannot be used for recording anyway.
 */
export function startHardwareEncoderProbe({
	exePath,
	width,
	height,
	fps = 60,
	timeoutMs = ENCODER_PROBE_TIMEOUT_MS,
	spawnProcess = (command, args) =>
		spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }),
	log = (message) => console.log(message),
}: EncoderProbeOptions): Promise<HardwareEncoderVerdict> {
	return new Promise((resolve) => {
		let settled = false;
		let output = "";
		let child: ChildProcess;

		const finish = (verdict: HardwareEncoderVerdict, detail: string) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			state = { verdict, width, height };
			log(`[encoder-probe] hardware H.264: ${verdict} (${detail})`);
			resolve(verdict);
		};

		const timer = setTimeout(() => {
			try {
				child?.kill();
			} catch {
				// Already gone.
			}
			finish("no", `no answer within ${timeoutMs} ms`);
		}, timeoutMs);

		try {
			child = spawnProcess(exePath, [
				"--probe-encoder",
				String(width),
				String(height),
				String(fps),
			]);
		} catch (error) {
			clearTimeout(timer);
			settled = true;
			log(`[encoder-probe] could not start: ${String(error)}`);
			resolve("unknown");
			return;
		}

		child.stdout?.on("data", (chunk: Buffer) => {
			output += chunk.toString();
		});
		child.on("error", (error) => {
			if (settled) return;
			clearTimeout(timer);
			settled = true;
			log(`[encoder-probe] helper error: ${String(error)}`);
			resolve("unknown");
		});
		child.on("close", () => {
			const parsed = parseEncoderProbeOutput(output);
			if (!parsed) {
				if (settled) return;
				clearTimeout(timer);
				settled = true;
				log("[encoder-probe] no usable answer from the helper");
				resolve("unknown");
				return;
			}
			finish(parsed.hardware ? "yes" : "no", `${parsed.ms} ms`);
		});
	});
}
