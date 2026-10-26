import { Modal } from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadAppSetting, saveAppSetting } from "@/lib/appSettings";
import { OnboardingLayout } from "./OnboardingLayout";
import { OnboardingPermissions } from "./OnboardingPermissions";

const SEEN_KEY = "recordly.onboarding.v1.seen";
const PERMISSIONS_REQUESTED_KEY = "recordly.onboarding.permissionsRequested";

/**
 * First-run welcome: recording permissions only. No account is required to record, edit or
 * export (upstream required signing in to Recordly's service; this fork does not).
 */
export function OnboardingController({
	requestNonce,
	ready,
}: {
	requestNonce: number;
	ready: boolean;
}) {
	const [open, setOpen] = useState(false);
	const checked = useRef(false);

	const markSeenAndClose = useCallback(() => {
		saveAppSetting(SEEN_KEY, true);
		saveAppSetting(PERMISSIONS_REQUESTED_KEY, false);
		setOpen(false);
	}, []);

	// Opened on demand from the settings panel.
	useEffect(() => {
		if (requestNonce > 0) setOpen(true);
	}, [requestNonce]);

	// Opened on the very first launch, or when the main process asked for permissions.
	useEffect(() => {
		if (!ready || checked.current) return;
		checked.current = true;
		if (
			loadAppSetting<boolean>(PERMISSIONS_REQUESTED_KEY) ||
			!loadAppSetting<boolean>(SEEN_KEY)
		) {
			setOpen(true);
		}
	}, [ready]);

	useEffect(() => window.electronAPI.onRecordingPermissionsRequested?.(() => setOpen(true)), []);

	const finish = () => {
		markSeenAndClose();
		void window.electronAPI.showRecordingHud();
	};

	return (
		<Modal
			isOpen={open}
			onOpenChange={(value) => {
				if (!value) markSeenAndClose();
			}}
		>
			<Modal.Backdrop>
				<Modal.Container size="cover" placement="center" className="p-4">
					<Modal.Dialog
						aria-label="Recording permissions"
						data-onboarding-state="permissions"
						className="h-[min(760px,calc(100dvh-32px))] min-h-0 w-full max-w-[720px] gap-0 overflow-hidden rounded-3xl p-0"
					>
						<OnboardingLayout stage="permissions" showStageNav={false}>
							<div className="flex h-full min-h-0 flex-col">
								<OnboardingPermissions
									onBack={markSeenAndClose}
									onFinish={finish}
								/>
							</div>
						</OnboardingLayout>
						<Modal.CloseTrigger aria-label="Close" className="z-20" />
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
		</Modal>
	);
}
