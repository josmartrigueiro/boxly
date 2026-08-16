import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Package, PackageX, Plus, Wallet } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { MetricCard } from "@/components/metric-card";
import { ProductsTable } from "@/components/products/products-table";
import { Button } from "@/components/ui/button";
import { useLowStockThreshold } from "@/hooks/use-low-stock-threshold";
import { getStockStatus, MOCK_PRODUCTS } from "@/lib/mock-products";

export const Route = createFileRoute("/_dashboard/estoque/")({
	component: EstoquePage,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

function EstoquePage() {
	const { threshold } = useLowStockThreshold();
	const total = MOCK_PRODUCTS.length;
	const baixo = MOCK_PRODUCTS.filter(
		(product) => getStockStatus(product.quantity, threshold) === "baixo",
	).length;
	const esgotado = MOCK_PRODUCTS.filter(
		(product) => getStockStatus(product.quantity, threshold) === "esgotado",
	).length;
	const valorEmEstoque = MOCK_PRODUCTS.reduce(
		(total, product) => total + product.quantity * product.unitCost,
		0,
	);

	return (
		<>
			<AppHeader title="Estoque">
				<Button size="sm" disabled className="gap-2">
					<Plus className="size-4" />
					<span className="hidden xl:inline">Novo produto</span>
				</Button>
			</AppHeader>

			<div className="w-full flex-1 space-y-6 overflow-y-auto p-4">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<MetricCard
						title="Total de produtos"
						value={String(total)}
						icon={Package}
					/>
					<MetricCard
						title="Estoque baixo"
						value={String(baixo)}
						icon={AlertTriangle}
					/>
					<MetricCard
						title="Esgotados"
						value={String(esgotado)}
						icon={PackageX}
					/>
					<MetricCard
						title="Valor total em estoque"
						value={currencyFormatter.format(valorEmEstoque)}
						icon={Wallet}
					/>
				</div>

				<ProductsTable />
			</div>
		</>
	);
}
