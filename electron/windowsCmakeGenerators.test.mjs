import { describe, expect, it, vi } from "vitest";

import {
	configureWithWindowsCmakeGenerator,
	WINDOWS_CMAKE_GENERATORS,
	WINDOWS_VISUAL_STUDIO_INSTALL_DIRS,
} from "../scripts/windows-cmake-generators.mjs";

describe("configureWithWindowsCmakeGenerator", () => {
	it("uses Visual Studio 2026 first", () => {
		const configure = vi.fn();
		const clearCache = vi.fn();

		const selected = configureWithWindowsCmakeGenerator({
			prefix: "test",
			configure,
			clearCache,
		});

		expect(selected).toBe("Visual Studio 18 2026");
		expect(WINDOWS_VISUAL_STUDIO_INSTALL_DIRS[0]).toBe("18");
		expect(configure).toHaveBeenCalledWith("Visual Studio 18 2026", "v143");
		expect(clearCache).toHaveBeenCalledTimes(1);
	});

	it("retries Visual Studio 2026 with its own toolset when the v143 toolset is missing", () => {
		const attempted = [];

		const selected = configureWithWindowsCmakeGenerator({
			prefix: "test",
			clearCache: vi.fn(),
			log: vi.fn(),
			configure: (generator, toolset) => {
				attempted.push({ name: generator, toolset });
				if (toolset === "v143") throw new Error("MSB8020: v143 build tools cannot be found");
			},
		});

		expect(selected).toBe("Visual Studio 18 2026");
		expect(attempted).toEqual([
			{ name: "Visual Studio 18 2026", toolset: "v143" },
			{ name: "Visual Studio 18 2026", toolset: undefined },
		]);
	});

	it("falls back in supported-version order and clears stale CMake state", () => {
		const attempted = [];
		const clearCache = vi.fn();
		const log = vi.fn();

		const selected = configureWithWindowsCmakeGenerator({
			prefix: "test",
			clearCache,
			log,
			configure: (generator, toolset) => {
				attempted.push({ name: generator, toolset });
				if (generator !== "Visual Studio 16 2019") {
					throw new Error(`${generator} unavailable`);
				}
			},
		});

		expect(attempted).toEqual(
			WINDOWS_CMAKE_GENERATORS.map(({ name, toolset }) => ({ name, toolset })),
		);
		expect(clearCache).toHaveBeenCalledTimes(WINDOWS_CMAKE_GENERATORS.length);
		expect(log).toHaveBeenCalledTimes(WINDOWS_CMAKE_GENERATORS.length - 1);
		expect(selected).toBe("Visual Studio 16 2019");
	});

	it("rethrows the final configure error when no supported generator exists", () => {
		const finalError = new Error("VS 2019 unavailable");

		expect(() =>
			configureWithWindowsCmakeGenerator({
				prefix: "test",
				clearCache: vi.fn(),
				log: vi.fn(),
				configure: (generator) => {
					if (generator === "Visual Studio 16 2019") throw finalError;
					throw new Error(`${generator} unavailable`);
				},
			}),
		).toThrow(finalError);
	});
});
