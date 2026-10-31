import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRestartController } from "./restartController";

describe("restart controller", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	function setup(idleAfterCancel = true) {
		let idle = false;
		const deps = {
			delayMs: 3000,
			cancelRecording: vi.fn(() => {
				if (idleAfterCancel) idle = true;
			}),
			isIdle: () => idle,
			startRecording: vi.fn(),
			onNotice: vi.fn(),
		};
		return {
			deps,
			controller: createRestartController(deps),
			makeIdle: () => {
				idle = true;
			},
		};
	}

	it("keeps recording during the delay, then discards the take and starts a new one", async () => {
		const { deps, controller } = setup();
		controller.trigger();
		expect(deps.onNotice).toHaveBeenCalledWith("pending");
		vi.advanceTimersByTime(2999);
		expect(deps.cancelRecording).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(deps.cancelRecording).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(100);
		expect(deps.startRecording).toHaveBeenCalledTimes(1);
	});

	it("pressing the shortcut again during the delay cancels the restart", async () => {
		const { deps, controller } = setup();
		controller.trigger();
		vi.advanceTimersByTime(1500);
		controller.trigger();
		expect(deps.onNotice).toHaveBeenLastCalledWith("cancelled");
		expect(controller.isPending()).toBe(false);

		await vi.advanceTimersByTimeAsync(10000);
		expect(deps.cancelRecording).not.toHaveBeenCalled();
		expect(deps.startRecording).not.toHaveBeenCalled();
	});

	it("waits for the discarded take to close before starting", async () => {
		const { deps, controller, makeIdle } = setup(false);
		controller.trigger();
		await vi.advanceTimersByTimeAsync(3000);
		await vi.advanceTimersByTimeAsync(1000);
		expect(deps.startRecording).not.toHaveBeenCalled();

		makeIdle();
		await vi.advanceTimersByTimeAsync(100);
		expect(deps.startRecording).toHaveBeenCalledTimes(1);
	});

	it("gives up if the old take never closes", async () => {
		const { deps, controller } = setup(false);
		controller.trigger();
		await vi.advanceTimersByTimeAsync(3000 + 9000);
		expect(deps.startRecording).not.toHaveBeenCalled();
	});

	it("can be triggered again after a restart", async () => {
		const { deps, controller } = setup();
		controller.trigger();
		await vi.advanceTimersByTimeAsync(3200);
		expect(deps.startRecording).toHaveBeenCalledTimes(1);
		controller.trigger();
		expect(deps.onNotice).toHaveBeenLastCalledWith("pending");
	});

	it("waits for the discard to finish even when it takes a while", async () => {
		let release: () => void = () => {};
		const slow = new Promise<void>((resolve) => {
			release = resolve;
		});
		let idle = false;
		const deps = {
			delayMs: 3000,
			cancelRecording: vi.fn(() =>
				slow.then(() => {
					idle = true;
				}),
			),
			isIdle: () => idle,
			startRecording: vi.fn(),
			onNotice: vi.fn(),
		};
		const controller = createRestartController(deps);
		controller.trigger();
		await vi.advanceTimersByTimeAsync(3000);
		await vi.advanceTimersByTimeAsync(2000);
		expect(deps.startRecording).not.toHaveBeenCalled();

		release();
		await vi.advanceTimersByTimeAsync(200);
		expect(deps.startRecording).toHaveBeenCalledTimes(1);
	});
});
