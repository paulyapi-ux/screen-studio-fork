import { APP_NAME, ATTRIBUTION } from "@/lib/appInfo";

function ExternalLink({ href, children }: { href: string; children: string }) {
	return (
		<a
			href={href}
			className="text-accent underline underline-offset-2"
			onClick={(event) => {
				event.preventDefault();
				void window.electronAPI?.openExternalUrl?.(href);
			}}
		>
			{children}
		</a>
	);
}

/** Credits and licence notice required by the AGPL-3.0 terms of the project this app is built on. */
export function AboutSettings() {
	return (
		<section aria-label="About" className="space-y-3 text-sm leading-relaxed">
			<h2 className="text-[13px] font-semibold text-foreground">{APP_NAME}</h2>
			<p className="text-muted">
				{APP_NAME} is built on{" "}
				<ExternalLink href={ATTRIBUTION.upstreamUrl}>
					{ATTRIBUTION.upstreamName}
				</ExternalLink>{" "}
				by {ATTRIBUTION.upstreamAuthor}, which itself started as a fork of the{" "}
				{ATTRIBUTION.originName} project by {ATTRIBUTION.originAuthor}.
			</p>
			<p className="text-muted">
				Free software under the {ATTRIBUTION.license} license. You can read, change and
				share the source code:{" "}
				<ExternalLink href={ATTRIBUTION.sourceUrl}>{ATTRIBUTION.sourceUrl}</ExternalLink>
			</p>
		</section>
	);
}
