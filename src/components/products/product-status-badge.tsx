import { Badge } from "@/components/ui/badge";
import { useLowStockThreshold } from "@/hooks/use-low-stock-threshold";
import { getStockStatus } from "@/lib/products";

export function ProductStatusBadge({ quantity }: { quantity: number }) {
	const { threshold } = useLowStockThreshold();
	const status = getStockStatus(quantity, threshold);

	if (status === "esgotado") {
		return <Badge variant="destructive">Esgotado</Badge>;
	}

	if (status === "baixo") {
		return <Badge variant="warning">Estoque baixo</Badge>;
	}

	return <Badge variant="secondary">Em estoque</Badge>;
}
