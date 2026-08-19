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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getMargin, MOCK_PRODUCTS } from "@/lib/mock-products";

const PAGE_SIZE = 10;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

const CATEGORIES = Array.from(
	new Set(MOCK_PRODUCTS.map((product) => product.category)),
).sort((a, b) => a.localeCompare(b));

const CATEGORY_OPTIONS = [
	{ value: "all", label: "Todas as linhas" },
	...CATEGORIES.map((category) => ({ value: category, label: category })),
];

export function ProductsTable() {
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("all");
	const [page, setPage] = useState(1);

	const hasActiveFilters = search.trim() !== "" || category !== "all";

	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase();
		return MOCK_PRODUCTS.filter((product) => {
			const matchesSearch =
				term === "" ||
				product.name.toLowerCase().includes(term) ||
				product.id.toLowerCase().includes(term);
			const matchesCategory =
				category === "all" || product.category === category;
			return matchesSearch && matchesCategory;
		});
	}, [search, category]);

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
						<Badge className="ml-2 size-6 rounded-full border-border/60 bg-muted p-0.5 font-mono text-xs tabular-nums text-muted-foreground shadow-sm">
							{filtered.length}
						</Badge>
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
							{CATEGORY_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</CardAction>
			</CardHeader>

			<CardContent className="mt-4 space-y-4">
				{paginated.length === 0 ? (
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
									<TableHead className="tracking-wide">Lote</TableHead>
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
									const margin = getMargin(product.unitCost, product.salePrice);
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
													{product.id}
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
											<TableCell className="font-mono text-sm text-muted-foreground">
												{product.lotId}
											</TableCell>
											<TableCell className="text-center font-mono text-sm tabular-nums font-semibold text-foreground">
												{product.quantity}
											</TableCell>
											<TableCell className="text-end font-mono text-sm tabular-nums text-muted-foreground">
												{currencyFormatter.format(product.unitCost)}
											</TableCell>
											<TableCell className="text-end font-mono text-sm tabular-nums font-medium text-foreground">
												{currencyFormatter.format(product.salePrice)}
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

				{filtered.length > 0 && (
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
