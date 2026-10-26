export const WINDOWS_CMAKE_GENERATORS = Object.freeze([
	// VS 2026 with the VS 2022 toolset (v143) first: it keeps builds consistent with VS 2022.
	{ name: "Visual Studio 18 2026", label: "VS 2026 (v143 toolset)", toolset: "v143" },
	// Machines with only the VS 2026 Build Tools do not have the v143 component installed
	// (MSB8020 "build tools for Visual Studio 2022 cannot be found"): use VS 2026's own toolset.
	{ name: "Visual Studio 18 2026", label: "VS 2026" },
	{ name: "Visual Studio 17 2022", label: "VS 2022" },
	{ name: "Visual Studio 16 2019", label: "VS 2019" },
]);

export const WINDOWS_VISUAL_STUDIO_INSTALL_DIRS = Object.freeze(["18", "2022", "2019"]);

export function configureWithWindowsCmakeGenerator({
	prefix,
	configure,
	clearCache,
	log = console.log,
}) {
	let lastError;

	for (let index = 0; index < WINDOWS_CMAKE_GENERATORS.length; index += 1) {
		const generator = WINDOWS_CMAKE_GENERATORS[index];
		clearCache();

		try {
			configure(generator.name, generator.toolset);
			return generator.name;
		} catch (error) {
			lastError = error;
			const nextGenerator = WINDOWS_CMAKE_GENERATORS[index + 1];
			if (nextGenerator) {
				log(
					`[${prefix}] ${generator.label} generator unavailable, trying ${nextGenerator.label}...`,
				);
			}
		}
	}

	throw lastError;
}
