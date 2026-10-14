import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DollarSign, Plus, Receipt, ShoppingCart } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { MetricCard } from "@/components/metric-card";
import { SalesOrdersTable } from "@/components/sales/sales-orders-table";
import { Button } from "@/components/ui/button";
import { listSalesOrders, salesOrdersQueryKey } from "@/lib/sales-orders";

export const Route = createFileRoute("/_dashboard/sales/")({
	component: SalesPage,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

function SalesPage() {
	const { data: orders = [] } = useQuery({
		queryKey: salesOrdersQueryKey,
		queryFn: () => listSalesOrders(),
	});

	const completedOrders = orders.filter(
		(order) => order.status === "completed",
	);
	const totalSold = completedOrders.reduce(
		(sum, order) => sum + Number(order.totalValue),
		0,
	);
	const averageTicket =
		completedOrders.length > 0 ? totalSold / completedOrders.length : 0;

	return (
		<>
			<AppHeader title="Vendas">
				<Button size="sm" className="gap-2" render={<Link to="/sales/new" />}>
					<Plus className="size-4" />
					<span className="hidden xl:inline">Nova venda</span>
				</Button>
			</AppHeader>

			<div className="w-full flex-1 space-y-6 overflow-y-auto p-4">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<MetricCard
						title="Total vendido"
						value={currencyFormatter.format(totalSold)}
						icon={DollarSign}
					/>
					<MetricCard
						title="Nº de vendas"
						value={String(completedOrders.length)}
						icon={ShoppingCart}
					/>
					<MetricCard
						title="Ticket médio"
						value={currencyFormatter.format(averageTicket)}
						icon={Receipt}
					/>
				</div>

				<SalesOrdersTable />
			</div>
		</>
	);
}
