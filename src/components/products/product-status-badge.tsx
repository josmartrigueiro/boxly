import { Badge } from "@/components/ui/badge";
import { getStockStatus } from "@/lib/mock-products";

export function ProductStatusBadge({ quantity }: { quantity: number }) {
	const status = getStockStatus(quantity);

	if (status === "esgotado") {
		return <Badge variant="destructive">Esgotado</Badge>;
	}

	if (status === "baixo") {
		return <Badge variant="warning">Estoque baixo</Badge>;
	}

	return <Badge variant="secondary">Em estoque</Badge>;
}
