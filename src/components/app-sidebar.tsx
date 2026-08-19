import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
	Building2,
	ClipboardList,
	LayoutDashboard,
	LogOut,
	Package,
	Settings,
} from "lucide-react";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { sessionQueryKey } from "@/lib/auth-functions";

const NAV_ITEMS = [
	{ to: "/", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/inventory", label: "Estoque", icon: Package },
	{ to: "/purchase-orders", label: "Pedidos", icon: ClipboardList },
	{ to: "/suppliers", label: "Fornecedores", icon: Building2 },
	{ to: "/settings", label: "Configurações", icon: Settings },
] as const;

function isNavItemActive(currentPath: string, to: string) {
	if (to === "/") return currentPath === "/";
	return currentPath === to || currentPath.startsWith(`${to}/`);
}

function getInitials(name: string) {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
	user: { name: string; email: string };
};

export function AppSidebar({ user, ...props }: AppSidebarProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const currentPath = useRouterState({ select: (s) => s.location.pathname });

	async function handleSignOut() {
		await authClient.signOut();
		queryClient.removeQueries({ queryKey: sessionQueryKey });
		navigate({ to: "/sign-in" });
	}

	return (
		<Sidebar {...props}>
			<SidebarHeader className="pb-0">
				<div className="flex items-center gap-2 px-2 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
					<span className="hidden text-lg font-bold text-primary group-data-[collapsible=icon]:inline">
						B
					</span>
					<span className="text-lg font-bold text-primary group-data-[collapsible=icon]:hidden">
						Boxly
					</span>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Menu</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{NAV_ITEMS.map((item) => (
								<SidebarMenuItem key={item.to}>
									<SidebarMenuButton
										isActive={isNavItemActive(currentPath, item.to)}
										render={<Link to={item.to} />}
									>
										<item.icon className="size-4" />
										<span className="group-data-[collapsible=icon]:hidden">
											{item.label}
										</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
				<div className="flex items-center gap-2 rounded-md p-1.5 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:p-0">
					<div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
						{getInitials(user.name)}
					</div>
					<div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
						<span className="truncate text-sm font-medium text-sidebar-foreground">
							{user.name}
						</span>
						<span className="truncate text-xs text-sidebar-foreground/70">
							{user.email}
						</span>
					</div>
					<button
						type="button"
						onClick={handleSignOut}
						aria-label="Sair"
						className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
					>
						<LogOut className="size-4" />
					</button>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
