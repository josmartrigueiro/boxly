import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { HeaderActionsProvider } from "@/components/header-actions-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getSession, sessionQueryKey } from "@/lib/auth-functions";

export const Route = createFileRoute("/_dashboard")({
	beforeLoad: async ({ context }) => {
		const session = await context.queryClient.fetchQuery({
			queryKey: sessionQueryKey,
			queryFn: () => getSession(),
		});

		if (!session) {
			throw redirect({ to: "/sign-in" });
		}

		return { user: session.user };
	},
	component: DashboardLayout,
});

function DashboardLayout() {
	const { user } = Route.useRouteContext();

	return (
		<HeaderActionsProvider>
			<SidebarProvider className="bg-sidebar">
				<AppSidebar user={user} />
				<div className="h-svh w-full overflow-hidden lg:p-2 lg:pl-0">
					<div className="flex h-full w-full flex-col overflow-hidden bg-background lg:rounded-md lg:border lg:border-border">
						<Outlet />
					</div>
				</div>
			</SidebarProvider>
		</HeaderActionsProvider>
	);
}
