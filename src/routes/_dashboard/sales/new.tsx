import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { SalesOrderForm } from "@/components/sales/sales-order-form";

export const Route = createFileRoute("/_dashboard/sales/new")({
	component: NewSalesOrderPage,
});

function NewSalesOrderPage() {
	const navigate = useNavigate();

	return (
		<>
			<AppHeader title="Nova venda" />

			<div className="w-full flex-1 overflow-y-auto p-6">
				<div className="flex w-full flex-col gap-6">
					<Link
						to="/sales"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="size-4" />
						Voltar para Vendas
					</Link>

					<SalesOrderForm onSuccess={() => navigate({ to: "/sales" })} />
				</div>
			</div>
		</>
	);
}
