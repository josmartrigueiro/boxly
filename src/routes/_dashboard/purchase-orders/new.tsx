import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form";

export const Route = createFileRoute("/_dashboard/purchase-orders/new")({
	component: NewPurchaseOrderPage,
});

function NewPurchaseOrderPage() {
	const navigate = useNavigate();

	return (
		<>
			<AppHeader title="Novo pedido de compra" />

			<div className="w-full flex-1 overflow-y-auto p-4">
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
					<Link
						to="/purchase-orders"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="size-4" />
						Voltar para Pedidos
					</Link>

					<p className="text-sm text-muted-foreground">
						Registre o pedido que você fez num fornecedor/distribuidora.
					</p>

					<PurchaseOrderForm
						onSuccess={() => navigate({ to: "/purchase-orders" })}
					/>
				</div>
			</div>
		</>
	);
}
