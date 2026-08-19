import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Package, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getMargin, listProducts, productsQueryKey } from "@/lib/products";

const PAGE_SIZE = 10;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

const SKELETON_ROW_WIDTHS = ["w-28", "w-20", "w-32", "w-24", "w-28"];

export function ProductsTable() {
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("all");
	const [page, setPage] = useState(1);

	const { data: products = [], isLoading } = useQuery({
		queryKey: productsQueryKey,
		queryFn: () => listProducts(),
	});

	const categoryOptions = useMemo(() => {
		const categories = Array.from(
			new Set(products.map((product) => product.category)),
		).sort((a, b) => a.localeCompare(b));
		return [
			{ value: "all", label: "Todas as linhas" },
			...categories.map((value) => ({ value, label: value })),
		];
	}, [products]);

	const hasActiveFilters = search.trim() !== "" || category !== "all";

	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase();
		return products.filter((product) => {
			const matchesSearch =
				term === "" ||
				product.name.toLowerCase().includes(term) ||
				product.sku.toLowerCase().includes(term);
			const matchesCategory =
				category === "all" || product.category === category;
			return matchesSearch && matchesCategory;
		});
	}, [products, search, category]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const paginated = filtered.slice(
		(currentPage - 1) * PAGE_SIZE,
		currentPage * PAGE_SIZE,
	);

	function handleSearchChange(value: string) {
		setSearch(value);
		setPage(1);
	}

	function handleCategoryChange(value: string) {
		setCategory(value);
		setPage(1);
	}

	return (
		<Card className="w-full gap-0 shadow-xs">
			<CardHeader>
				<div className="flex items-center gap-2">
					<span className="rounded-md border border-border/60 p-1.5">
						<Package className="size-4 text-muted-foreground" />
					</span>
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Listagem de produtos
						{isLoading ? (
							<Skeleton className="ml-2 inline-block size-6 rounded-full align-middle" />
						) : (
							<Badge className="ml-2 size-6 rounded-full border-border/60 bg-muted p-0.5 font-mono text-xs tabular-nums text-muted-foreground shadow-sm">
								{filtered.length}
							</Badge>
						)}
					</CardTitle>
				</div>
				<CardAction className="flex items-center gap-2">
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Buscar por nome ou código..."
							value={search}
							onChange={(event) => handleSearchChange(event.target.value)}
							className="w-[240px] pl-8"
						/>
					</div>
					<Select
						value={category}
						onValueChange={(value) => handleCategoryChange(value as string)}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{categoryOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</CardAction>
			</CardHeader>

			<CardContent className="mt-4 space-y-4">
				{isLoading ? (
					<div className="overflow-hidden rounded-lg border border-border/60">
						<Table>
							<TableHeader>
								<TableRow className="bg-primary/5">
									<TableHead className="tracking-wide">Produto</TableHead>
									<TableHead className="tracking-wide">Linha</TableHead>
									<TableHead className="tracking-wide">Pedido</TableHead>
									<TableHead className="text-center tracking-wide">
										Qtd. Atual
									</TableHead>
									<TableHead className="text-end tracking-wide">
										Custo Unit.
									</TableHead>
									<TableHead className="text-end tracking-wide">
										Preço de Venda
									</TableHead>
									<TableHead className="text-end tracking-wide">
										Margem
									</TableHead>
									<TableHead className="text-center tracking-wide">
										Status
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{SKELETON_ROW_WIDTHS.map((width, index) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered
									<TableRow key={`skeleton-row-${index}`}>
										<TableCell>
											<Skeleton className={`h-4 ${width}`} />
										</TableCell>
										<TableCell>
											<Skeleton className="h-4 w-24" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-4 w-20" />
										</TableCell>
										<TableCell className="text-center">
											<Skeleton className="mx-auto h-4 w-6" />
										</TableCell>
										<TableCell className="text-end">
											<Skeleton className="ml-auto h-4 w-16" />
										</TableCell>
										<TableCell className="text-end">
											<Skeleton className="ml-auto h-4 w-16" />
										</TableCell>
										<TableCell className="text-end">
											<Skeleton className="ml-auto h-4 w-10" />
										</TableCell>
										<TableCell className="text-center">
											<Skeleton className="mx-auto h-5 w-20 rounded-full" />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				) : paginated.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-4 py-16">
						<div className="grid size-14 place-items-center rounded-xl border border-border/60 p-2 shadow-xs">
							<Search className="size-6 text-muted-foreground" />
						</div>
						<h3 className="mt-6 mb-2 text-lg font-semibold">
							Nenhum produto encontrado
						</h3>
						<p className="max-w-md text-center text-sm text-muted-foreground">
							{hasActiveFilters
								? "Não encontramos produtos que correspondam aos filtros selecionados. Tente ajustar a busca ou a linha."
								: "Você ainda não possui produtos cadastrados no estoque."}
						</p>
					</div>
				) : (
					<div className="overflow-hidden rounded-lg border border-border/60">
						<Table>
							<TableHeader>
								<TableRow className="bg-primary/5">
									<TableHead className="tracking-wide">Produto</TableHead>
									<TableHead className="tracking-wide">Linha</TableHead>
									<TableHead className="tracking-wide">Pedido</TableHead>
									<TableHead className="text-center tracking-wide">
										Qtd. Atual
									</TableHead>
									<TableHead className="text-end tracking-wide">
										Custo Unit.
									</TableHead>
									<TableHead className="text-end tracking-wide">
										Preço de Venda
									</TableHead>
									<TableHead className="text-end tracking-wide">
										Margem
									</TableHead>
									<TableHead className="text-center tracking-wide">
										Status
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginated.map((product) => {
									const unitCost = Number(product.unitCost);
									const salePrice = Number(product.salePrice);
									const margin = getMargin(unitCost, salePrice);
									return (
										<TableRow key={product.id}>
											<TableCell className="font-medium">
												<Link
													to="/inventory/$productId"
													params={{ productId: product.id }}
													className="block max-w-[200px] truncate text-foreground hover:text-primary hover:underline"
													title={product.name}
												>
													{product.name}
												</Link>
												<div className="font-mono text-xs text-muted-foreground">
													{product.sku}
												</div>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												<div
													className="max-w-[140px] truncate"
													title={product.category}
												>
													{product.category}
												</div>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{product.purchaseOrder?.supplier.name ?? "—"}
											</TableCell>
											<TableCell className="text-center font-mono text-sm tabular-nums font-semibold text-foreground">
												{product.quantity}
											</TableCell>
											<TableCell className="text-end font-mono text-sm tabular-nums text-muted-foreground">
												{currencyFormatter.format(unitCost)}
											</TableCell>
											<TableCell className="text-end font-mono text-sm tabular-nums font-medium text-foreground">
												{currencyFormatter.format(salePrice)}
											</TableCell>
											<TableCell className="text-end font-mono text-sm tabular-nums text-muted-foreground">
												{margin.toFixed(0)}%
											</TableCell>
											<TableCell className="text-center">
												<ProductStatusBadge quantity={product.quantity} />
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				)}

				{!isLoading && filtered.length > 0 && (
					<div className="flex items-center justify-between pt-2">
						<p className="flex gap-2 text-sm text-muted-foreground">
							Mostrando
							<span className="font-mono font-semibold tabular-nums text-foreground">
								{paginated.length}
							</span>
							de
							<span className="font-mono font-semibold tabular-nums text-foreground">
								{filtered.length}
							</span>
							produto{filtered.length !== 1 ? "s" : ""}
						</p>

						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								disabled={currentPage <= 1}
								onClick={() => setPage((value) => Math.max(1, value - 1))}
							>
								Anterior
							</Button>
							<span className="font-mono text-sm tabular-nums text-muted-foreground">
								Página {currentPage} de {totalPages}
							</span>
							<Button
								variant="outline"
								disabled={currentPage >= totalPages}
								onClick={() =>
									setPage((value) => Math.min(totalPages, value + 1))
								}
							>
								Próxima
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
