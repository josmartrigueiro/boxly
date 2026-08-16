import { createFileRoute } from "@tanstack/react-router";

import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/_dashboard/")({
	component: DashboardIndex,
});

function DashboardIndex() {
	return (
		<>
			<AppHeader title="Dashboard" />
			<div className="flex-1 overflow-auto" />
		</>
	);
}
