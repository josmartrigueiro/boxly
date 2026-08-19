import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { PurchaseOrdersTable } from "@/components/purchase-orders/purchase-orders-table";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_dashboard/purchase-orders/")({
	component: PurchaseOrdersPage,
});

function PurchaseOrdersPage() {
	return (
		<>
			<AppHeader title="Pedidos de Compra">
				<Button
					size="sm"
					className="gap-2"
					render={<Link to="/purchase-orders/new" />}
				>
					<Plus className="size-4" />
					<span className="hidden xl:inline">Novo pedido</span>
				</Button>
			</AppHeader>

			<div className="w-full flex-1 space-y-6 overflow-y-auto p-4">
				<PurchaseOrdersTable />
			</div>
		</>
	);
}
