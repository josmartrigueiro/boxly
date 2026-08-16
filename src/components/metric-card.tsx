import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MetricCardProps = {
	title: string;
	value: string;
	icon: LucideIcon;
};

export function MetricCard({ title, value, icon: Icon }: MetricCardProps) {
	return (
		<Card className="w-full gap-4 p-4 shadow-none">
			<CardHeader className="flex items-center gap-2 p-0">
				<Icon className="size-4.5 text-muted-foreground" />
				<CardTitle className="text-sm font-normal tracking-wide text-muted-foreground">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
					{value}
				</span>
			</CardContent>
		</Card>
	);
}
