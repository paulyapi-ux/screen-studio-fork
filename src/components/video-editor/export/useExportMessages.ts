import { useEffect, useMemo, useState } from "react";
import type { useI18n } from "@/contexts/I18nContext";

const MESSAGE_DURATION_SECONDS = 6;

/** Short tips shown, one after the other, while an export runs. */
export function useExportMessages({
	t,
	active,
}: {
	t: ReturnType<typeof useI18n>["t"];
	active: boolean;
}): string | null {
	const [currentIndex, setCurrentIndex] = useState(0);
	const tips = useMemo(
		() => [
			t("editor.exportTips.autoZooms", "Tip: Turn off auto-applied zooms in settings"),
			t(
				"editor.exportTips.cursorAppearance",
				"Tip: You can customise your cursor appearance",
			),
		],
		[t],
	);
	const current = tips[currentIndex % tips.length];

	useEffect(() => {
		if (!active) return;
		const timeout = window.setTimeout(
			() => setCurrentIndex((index) => (index + 1) % tips.length),
			MESSAGE_DURATION_SECONDS * 1_000,
		);
		return () => window.clearTimeout(timeout);
	}, [active, tips.length]);

	return active ? current : null;
}
