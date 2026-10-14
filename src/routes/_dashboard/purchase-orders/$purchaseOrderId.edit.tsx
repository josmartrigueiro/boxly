import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form";
import { getPurchaseOrder, purchaseOrderQueryKey } from "@/lib/purchase-orders";

export const Route = createFileRoute(
	"/_dashboard/purchase-orders/$purchaseOrderId/edit",
)({
	component: EditPurchaseOrderPage,
});

function EditPurchaseOrderPage() {
	const { purchaseOrderId } = Route.useParams();
	const navigate = useNavigate();

	const { data: order, isLoading } = useQuery({
		queryKey: purchaseOrderQueryKey(purchaseOrderId),
		queryFn: () => getPurchaseOrder({ data: { id: purchaseOrderId } }),
		retry: false,
	});

	if (isLoading) {
		return (
			<>
				<AppHeader title="Carregando..." />
				<div className="w-full flex-1 p-4" />
			</>
		);
	}

	if (!order) {
		return (
			<>
				<AppHeader title="Pedido não encontrado" />
				<div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
					<p className="text-sm text-muted-foreground">
						Não encontramos nenhum pedido com esse código.
					</p>
					<Link
						to="/purchase-orders"
						className="text-sm font-medium text-primary hover:underline"
					>
						Voltar para Pedidos
					</Link>
				</div>
			</>
		);
	}

	return (
		<>
			<AppHeader title={`Editar pedido — ${order.supplier.name}`} />

			<div className="w-full flex-1 overflow-y-auto p-6">
				<div className="flex w-full flex-col gap-6">
					<Link
						to="/purchase-orders"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="size-4" />
						Voltar para Pedidos
					</Link>

					<PurchaseOrderForm
						order={order}
						onSuccess={() => navigate({ to: "/purchase-orders" })}
					/>
				</div>
			</div>
		</>
	);
}
