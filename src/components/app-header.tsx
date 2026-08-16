import { SidebarTrigger } from "@/components/ui/sidebar";

type AppHeaderProps = {
	title: string;
	children?: React.ReactNode;
};

export function AppHeader({ title, children }: AppHeaderProps) {
	return (
		<div className="flex min-h-14 w-full items-center gap-2 border-b border-border bg-background px-3 py-2.5 sm:px-4">
			<SidebarTrigger />
			<h1 className="flex-1 truncate text-sm font-medium text-foreground">
				{title}
			</h1>
			{children}
		</div>
	);
}
