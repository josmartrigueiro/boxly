import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Package, PackageX, Plus, Wallet } from "lucide-react";
import { useMemo } from "react";
import { z } from "zod";

import { AppHeader } from "@/components/app-header";
import { MetricCard } from "@/components/metric-card";
import { ProductDetailsSheet } from "@/components/products/product-details-sheet";
import { ProductsTable } from "@/components/products/products-table";
import { Button } from "@/components/ui/button";
import { useLowStockThreshold } from "@/hooks/use-low-stock-threshold";
import {
	type InventorySearchInput,
	inventoryQueryKey,
	listInventory,
} from "@/lib/products";

const inventorySearchSchema = z.object({
	q: z.string().catch("").default(""),
	category: z.string().catch("all").default("all"),
	page: z.coerce.number().int().min(1).catch(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(999).catch(100).default(100),
	sort: z
		.enum(["createdAt", "name", "supplier", "quantity", "unitCost"])
		.catch("createdAt")
		.default("createdAt"),
	dir: z.enum(["asc", "desc"]).catch("desc").default("desc"),
	product: z.string().uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/_dashboard/inventory/")({
	validateSearch: inventorySearchSchema,
	component: EstoquePage,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

function EstoquePage() {
	const search = Route.useSearch();
	const { threshold } = useLowStockThreshold();
	const queryInput = useMemo<InventorySearchInput>(
		() => ({
			q: search.q,
			category: search.category,
			page: search.page,
			pageSize: search.pageSize,
			sort: search.sort,
			dir: search.dir,
			lowStockThreshold: threshold,
		}),
		[
			search.category,
			search.dir,
			search.page,
			search.pageSize,
			search.q,
			search.sort,
			threshold,
		],
	);
	const inventory = useQuery({
		queryKey: inventoryQueryKey(queryInput),
		queryFn: () => listInventory({ data: queryInput }),
		placeholderData: keepPreviousData,
		staleTime: 30_000,
	});
	const metrics = inventory.data?.metrics;

	return (
		<>
			<AppHeader title="Estoque">
				<Button
					size="sm"
					className="gap-2"
					render={<Link to="/inventory/new" />}
				>
					<Plus className="size-4" />
					<span className="hidden xl:inline">Novo produto</span>
				</Button>
			</AppHeader>

			<div className="w-full flex-1 space-y-6 overflow-y-auto p-4">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<MetricCard
						title="Total de produtos"
						value={String(metrics?.total ?? 0)}
						icon={Package}
					/>
					<MetricCard
						title="Estoque baixo"
						value={String(metrics?.low ?? 0)}
						icon={AlertTriangle}
					/>
					<MetricCard
						title="Esgotados"
						value={String(metrics?.out ?? 0)}
						icon={PackageX}
					/>
					<MetricCard
						title="Valor total em estoque"
						value={currencyFormatter.format(metrics?.value ?? 0)}
						icon={Wallet}
					/>
				</div>

				<ProductsTable
					inventory={inventory.data}
					isLoading={inventory.isLoading}
					isRefreshing={inventory.isFetching && !inventory.isLoading}
				/>
			</div>
			<ProductDetailsSheet />
		</>
	);
}
