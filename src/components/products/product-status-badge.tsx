import { Badge } from "@/components/ui/badge";
import { useLowStockThreshold } from "@/hooks/use-low-stock-threshold";
import { getStockStatus } from "@/lib/products";

function StatusDot() {
	return <span className="size-1.5 shrink-0 rounded-full bg-current" />;
}

export function ProductStatusBadge({ quantity }: { quantity: number }) {
	const { threshold } = useLowStockThreshold();
	const status = getStockStatus(quantity, threshold);

	if (status === "esgotado") {
		return (
			<Badge variant="destructive">
				<StatusDot />
				Esgotado
			</Badge>
		);
	}

	if (status === "baixo") {
		return (
			<Badge variant="warning">
				<StatusDot />
				Estoque baixo
			</Badge>
		);
	}

	return (
		<Badge variant="secondary">
			<StatusDot />
			Em estoque
		</Badge>
	);
}
