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

	it("keeps recording during the delay, then discards the take and starts a new one", () => {
		const { deps, controller } = setup();
		controller.trigger();
		expect(deps.onNotice).toHaveBeenCalledWith("pending");
		vi.advanceTimersByTime(2999);
		expect(deps.cancelRecording).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(deps.cancelRecording).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(100);
		expect(deps.startRecording).toHaveBeenCalledTimes(1);
	});

	it("pressing the shortcut again during the delay cancels the restart", () => {
		const { deps, controller } = setup();
		controller.trigger();
		vi.advanceTimersByTime(1500);
		controller.trigger();
		expect(deps.onNotice).toHaveBeenLastCalledWith("cancelled");
		expect(controller.isPending()).toBe(false);

		vi.advanceTimersByTime(10000);
		expect(deps.cancelRecording).not.toHaveBeenCalled();
		expect(deps.startRecording).not.toHaveBeenCalled();
	});

	it("waits for the discarded take to close before starting", () => {
		const { deps, controller, makeIdle } = setup(false);
		controller.trigger();
		vi.advanceTimersByTime(3000);
		vi.advanceTimersByTime(1000);
		expect(deps.startRecording).not.toHaveBeenCalled();

		makeIdle();
		vi.advanceTimersByTime(100);
		expect(deps.startRecording).toHaveBeenCalledTimes(1);
	});

	it("gives up if the old take never closes", () => {
		const { deps, controller } = setup(false);
		controller.trigger();
		vi.advanceTimersByTime(3000 + 9000);
		expect(deps.startRecording).not.toHaveBeenCalled();
	});

	it("can be triggered again after a restart", () => {
		const { deps, controller } = setup();
		controller.trigger();
		vi.advanceTimersByTime(3200);
		expect(deps.startRecording).toHaveBeenCalledTimes(1);
		controller.trigger();
		expect(deps.onNotice).toHaveBeenLastCalledWith("pending");
	});
});
