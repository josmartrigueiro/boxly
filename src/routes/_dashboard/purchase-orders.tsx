import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import { AppHeader } from "@/components/app-header";
import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form";
import { PurchaseOrdersTable } from "@/components/purchase-orders/purchase-orders-table";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_dashboard/purchase-orders")({
	component: PurchaseOrdersPage,
});

function PurchaseOrdersPage() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<AppHeader title="Pedidos de Compra">
				<Dialog open={open} onOpenChange={setOpen}>
					<Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
						<Plus className="size-4" />
						<span className="hidden xl:inline">Novo pedido</span>
					</Button>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>Novo pedido de compra</DialogTitle>
							<DialogDescription>
								Registre o pedido que você fez num fornecedor/distribuidora.
							</DialogDescription>
						</DialogHeader>
						<PurchaseOrderForm onSuccess={() => setOpen(false)} />
					</DialogContent>
				</Dialog>
			</AppHeader>

			<div className="w-full flex-1 space-y-6 overflow-y-auto p-4">
				<PurchaseOrdersTable />
			</div>
		</>
	);
}
