import { getRouteApi } from "@tanstack/react-router";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Check,
	Columns3,
	Package,
	Search,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProductImagePreview } from "@/components/products/product-image-preview";
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
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/ui/number-field";
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
import { useTiktokCommission } from "@/hooks/use-tiktok-commission";
import { getMargin, type listInventory } from "@/lib/products";
import { cn } from "@/lib/utils";

type SortColumn = "createdAt" | "name" | "supplier" | "quantity" | "unitCost";
type ProductColumnKey =
	| "name"
	| "order"
	| "quantity"
	| "tangerinas"
	| "unitCost"
	| "salePrice"
	| "tiktokPrice"
	| "margin"
	| "status";

const routeApi = getRouteApi("/_dashboard/inventory/");

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

const SKELETON_ROW_WIDTHS = ["w-28", "w-20", "w-32", "w-24", "w-28"];
const COLUMN_STORAGE_KEY = "boxly:inventory-visible-columns";
const DEFAULT_COLUMNS: ProductColumnKey[] = [
	"name",
	"order",
	"quantity",
	"tangerinas",
	"unitCost",
	"salePrice",
	"tiktokPrice",
	"margin",
	"status",
];
const COLUMN_OPTIONS: Array<{ key: ProductColumnKey; label: string }> = [
	{ key: "name", label: "Nome e imagem" },
	{ key: "order", label: "Pedido" },
	{ key: "quantity", label: "Qtd. atual" },
	{ key: "tangerinas", label: "Tangerinas" },
	{ key: "unitCost", label: "Custo unit." },
	{ key: "salePrice", label: "Preço de venda" },
	{ key: "tiktokPrice", label: "Preço TikTok" },
	{ key: "margin", label: "Margem" },
	{ key: "status", label: "Status" },
];

function normalizeVisibleColumns(value: unknown): ProductColumnKey[] {
	if (!Array.isArray(value)) return DEFAULT_COLUMNS;
	const valid = value.filter((column): column is ProductColumnKey =>
		DEFAULT_COLUMNS.includes(column as ProductColumnKey),
	);
	const columns = Array.from(new Set(["name" as ProductColumnKey, ...valid]));
	return columns.length >= 3 ? columns : DEFAULT_COLUMNS;
}

type InventoryData = Awaited<ReturnType<typeof listInventory>>;

type ProductsTableProps = {
	inventory?: InventoryData;
	isLoading: boolean;
	isRefreshing: boolean;
};

export function ProductsTable({
	inventory,
	isLoading,
	isRefreshing,
}: ProductsTableProps) {
	const { q, category, page, pageSize, sort, dir } = routeApi.useSearch();
	const navigate = routeApi.useNavigate();
	const { commission } = useTiktokCommission();
	const [visibleColumns, setVisibleColumns] =
		useState<ProductColumnKey[]>(DEFAULT_COLUMNS);
	const [searchDraft, setSearchDraft] = useState(q);

	useEffect(() => {
		try {
			const stored = window.localStorage.getItem(COLUMN_STORAGE_KEY);
			if (stored) {
				const parsed = normalizeVisibleColumns(JSON.parse(stored));
				const migrated: ProductColumnKey[] = parsed.includes("tangerinas")
					? parsed
					: [...parsed, "tangerinas"];
				setVisibleColumns(migrated);
				window.localStorage.setItem(
					COLUMN_STORAGE_KEY,
					JSON.stringify(migrated),
				);
			}
		} catch {
			setVisibleColumns(DEFAULT_COLUMNS);
		}
	}, []);

	useEffect(() => {
		setSearchDraft(q);
	}, [q]);

	useEffect(() => {
		if (searchDraft === q) return;

		const timeout = window.setTimeout(() => {
			navigate({
				search: (prev) => ({ ...prev, q: searchDraft, page: 1 }),
				replace: true,
			});
		}, 300);

		return () => window.clearTimeout(timeout);
	}, [navigate, q, searchDraft]);

	const categoryOptions = useMemo(() => {
		return [
			{ value: "all", label: "Todas as linhas" },
			...(inventory?.categories ?? []).map((value) => ({
				value,
				label: value,
			})),
		];
	}, [inventory?.categories]);

	const isDefaultSort = sort === "createdAt" && dir === "desc";
	const hasActiveFilters =
		q.trim() !== "" || category !== "all" || !isDefaultSort;

	const products = inventory?.items ?? [];
	const total = inventory?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const currentPage = Math.min(page, totalPages);

	function handleSearchChange(value: string) {
		setSearchDraft(value);
	}

	function handleCategoryChange(value: string) {
		navigate({
			search: (prev) => ({ ...prev, category: value, page: 1 }),
			replace: true,
		});
	}

	function handleSort(column: SortColumn) {
		navigate({
			search: (prev) => ({
				...prev,
				sort: column,
				dir: prev.sort === column && prev.dir === "asc" ? "desc" : "asc",
				page: 1,
			}),
			replace: true,
		});
	}

	function handlePageChange(newPage: number) {
		navigate({
			search: (prev) => ({ ...prev, page: newPage }),
			replace: true,
		});
	}

	function handlePageSizeChange(newSize: number) {
		const clamped = Math.min(999, Math.max(1, Math.round(newSize)));
		navigate({
			search: (prev) => ({ ...prev, pageSize: clamped, page: 1 }),
			replace: true,
		});
	}

	function handleClearFilters() {
		navigate({
			search: {
				q: "",
				category: "all",
				sort: "createdAt",
				dir: "desc",
				page: 1,
				pageSize,
				product: undefined,
			},
			replace: true,
		});
	}

	function handleOpenProduct(productId: string) {
		navigate({
			search: (prev) => ({ ...prev, product: productId }),
		});
	}

	function isColumnVisible(column: ProductColumnKey) {
		return visibleColumns.includes(column);
	}

	function toggleColumn(column: ProductColumnKey, checked: boolean) {
		if (column === "name") return;
		if (!checked && visibleColumns.length <= 3) return;

		const next = checked
			? [...visibleColumns, column]
			: visibleColumns.filter((item) => item !== column);
		const normalized = normalizeVisibleColumns(next);
		setVisibleColumns(normalized);
		try {
			window.localStorage.setItem(
				COLUMN_STORAGE_KEY,
				JSON.stringify(normalized),
			);
		} catch {
			// A tabela segue funcionando mesmo se o navegador bloquear o armazenamento.
		}
	}

	function SortableHead({
		column,
		children,
		align = "start",
	}: {
		column: SortColumn;
		children: React.ReactNode;
		align?: "start" | "end";
	}) {
		const isActive = sort === column;
		const Icon = isActive ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

		return (
			<TableHead className={align === "end" ? "text-end" : undefined}>
				<button
					type="button"
					onClick={() => handleSort(column)}
					className={cn(
						"inline-flex items-center gap-1 tracking-wide transition-colors hover:text-foreground",
						align === "end" && "flex-row-reverse",
						isActive ? "text-foreground" : "text-muted-foreground",
					)}
				>
					{children}
					<Icon className="size-3 text-foreground" />
				</button>
			</TableHead>
		);
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
								{total}
							</Badge>
						)}
						{isRefreshing ? (
							<span className="ml-2 text-xs font-normal text-muted-foreground animate-in fade-in-0 duration-200">
								Atualizando…
							</span>
						) : null}
					</CardTitle>
				</div>
				<CardAction className="flex items-center gap-2">
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Buscar por nome ou código..."
							value={searchDraft}
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
					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label="Selecionar colunas visíveis"
							className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-input bg-background/70 px-2.5 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground"
						>
							<Columns3 className="size-3.5" />
							Colunas
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-56 p-1.5">
							<div className="flex items-center justify-between px-1.5 py-1">
								<div>
									<p className="text-xs font-medium text-foreground">
										Exibir colunas
									</p>
									<p className="text-[11px] text-muted-foreground">
										Salvo neste navegador
									</p>
								</div>
								<span className="rounded-full border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
									{visibleColumns.length}/{COLUMN_OPTIONS.length}
								</span>
							</div>
							<div className="my-1 h-px bg-border/60" />
							{COLUMN_OPTIONS.map((column) => {
								const checked = isColumnVisible(column.key);
								const disabled =
									column.key === "name" ||
									(checked && visibleColumns.length <= 3);
								return (
									<DropdownMenuCheckboxItem
										key={column.key}
										checked={checked}
										disabled={disabled}
										className="data-checked:bg-transparent data-highlighted:bg-transparent"
										onCheckedChange={(nextChecked) =>
											toggleColumn(column.key, nextChecked)
										}
									>
										<span
											className={cn(
												"flex size-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
												checked
													? "border-primary bg-primary text-primary-foreground"
													: "border-border bg-background text-transparent",
											)}
										>
											<Check className="size-3" strokeWidth={2.5} />
										</span>
										{column.label}
									</DropdownMenuCheckboxItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>
					<div
						className={cn(
							"grid overflow-hidden transition-all duration-200 ease-out",
							hasActiveFilters
								? "grid-cols-[1fr] opacity-100"
								: "grid-cols-[0fr] opacity-0",
						)}
					>
						<div className="min-w-0">
							<Button
								variant="ghost"
								size="sm"
								className={cn(
									"gap-1.5 whitespace-nowrap text-muted-foreground transition-transform duration-200 ease-out",
									hasActiveFilters ? "scale-100" : "scale-90",
								)}
								onClick={handleClearFilters}
								tabIndex={hasActiveFilters ? 0 : -1}
							>
								<X className="size-3.5" />
								Limpar filtros
							</Button>
						</div>
					</div>
				</CardAction>
			</CardHeader>

			<CardContent className="mt-4 space-y-4">
				{isLoading ? (
					<div className="overflow-hidden rounded-lg border border-border/60">
						<Table>
							<TableHeader>
								<TableRow className="bg-primary/5">
									<TableHead className="tracking-wide">Nome</TableHead>
									<TableHead className="tracking-wide">Pedido</TableHead>
									<TableHead className="text-end tracking-wide">
										Qtd. Atual
									</TableHead>
									<TableHead className="text-center tracking-wide">
										Tangerinas
									</TableHead>
									<TableHead className="text-end tracking-wide">
										Custo Unit.
									</TableHead>
									<TableHead className="text-end tracking-wide">
										Preço de Venda
									</TableHead>
									<TableHead className="text-end tracking-wide">
										Preço TikTok
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
											<Skeleton className="h-4 w-20" />
										</TableCell>
										<TableCell className="text-end">
											<Skeleton className="ml-auto h-4 w-6" />
										</TableCell>
										<TableCell className="text-center">
											<Skeleton className="mx-auto h-5 w-10 rounded-full" />
										</TableCell>
										<TableCell className="text-end">
											<Skeleton className="ml-auto h-4 w-16" />
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
				) : products.length === 0 ? (
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
									{isColumnVisible("name") ? (
										<SortableHead column="name">Nome</SortableHead>
									) : null}
									{isColumnVisible("order") ? (
										<SortableHead column="supplier">Pedido</SortableHead>
									) : null}
									{isColumnVisible("quantity") ? (
										<SortableHead column="quantity" align="end">
											Qtd. Atual
										</SortableHead>
									) : null}
									{isColumnVisible("tangerinas") ? (
										<TableHead className="text-center tracking-wide">
											Tangerinas
										</TableHead>
									) : null}
									{isColumnVisible("unitCost") ? (
										<SortableHead column="unitCost" align="end">
											Custo Unit.
										</SortableHead>
									) : null}
									{isColumnVisible("salePrice") ? (
										<TableHead className="text-end tracking-wide">
											Preço de Venda
										</TableHead>
									) : null}
									{isColumnVisible("tiktokPrice") ? (
										<TableHead className="text-end tracking-wide">
											Preço TikTok
										</TableHead>
									) : null}
									{isColumnVisible("margin") ? (
										<TableHead className="text-end tracking-wide">
											Margem
										</TableHead>
									) : null}
									{isColumnVisible("status") ? (
										<TableHead className="text-center tracking-wide">
											Status
										</TableHead>
									) : null}
								</TableRow>
							</TableHeader>
							<TableBody>
								{products.map((product) => {
									const unitCost = Number(product.unitCost);
									const salePrice = Number(product.salePrice);
									const margin = getMargin(unitCost, salePrice);
									const tiktokPrice = salePrice * (1 + commission / 100);
									return (
										<TableRow key={product.id}>
											{isColumnVisible("name") ? (
												<TableCell className="min-w-[320px] whitespace-normal font-medium">
													<div className="flex items-center gap-2.5">
														<ProductImagePreview
															alt={`Imagem de ${product.name}`}
															src={product.photoThumbnailUrl}
															className="size-11"
														/>
														<div className="min-w-0">
															<button
																type="button"
																onClick={() => handleOpenProduct(product.id)}
																className="block w-full text-left leading-snug text-foreground transition-colors hover:text-primary hover:underline"
															>
																{product.name}
															</button>
															<div className="font-mono text-xs text-muted-foreground">
																{product.sku}
															</div>
														</div>
													</div>
												</TableCell>
											) : null}
											{isColumnVisible("order") ? (
												<TableCell className="text-sm text-muted-foreground">
													<span
														className="block max-w-[140px] truncate"
														title={product.purchaseOrder?.supplier.name}
													>
														{product.purchaseOrder?.supplier.name ?? "—"}
													</span>
												</TableCell>
											) : null}
											{isColumnVisible("quantity") ? (
												<TableCell className="text-end font-mono text-sm tabular-nums font-semibold text-foreground">
													{product.quantity}
												</TableCell>
											) : null}
											{isColumnVisible("tangerinas") ? (
												<TableCell className="text-center">
													{product.tangerinas > 0 ? (
														<Badge
															variant="secondary"
															className="min-w-8 justify-center font-mono tabular-nums"
														>
															{product.tangerinas}
														</Badge>
													) : (
														<span className="font-mono text-sm tabular-nums text-muted-foreground">
															—
														</span>
													)}
												</TableCell>
											) : null}
											{isColumnVisible("unitCost") ? (
												<TableCell className="text-end font-mono text-sm tabular-nums text-muted-foreground">
													{currencyFormatter.format(unitCost)}
												</TableCell>
											) : null}
											{isColumnVisible("salePrice") ? (
												<TableCell className="text-end font-mono text-sm tabular-nums font-medium text-foreground">
													{currencyFormatter.format(salePrice)}
												</TableCell>
											) : null}
											{isColumnVisible("tiktokPrice") ? (
												<TableCell className="text-end font-mono text-sm tabular-nums text-muted-foreground">
													{currencyFormatter.format(tiktokPrice)}
												</TableCell>
											) : null}
											{isColumnVisible("margin") ? (
												<TableCell className="text-end font-mono text-sm tabular-nums text-muted-foreground">
													{margin.toFixed(0)}%
												</TableCell>
											) : null}
											{isColumnVisible("status") ? (
												<TableCell className="text-center">
													<ProductStatusBadge quantity={product.quantity} />
												</TableCell>
											) : null}
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				)}

				{!isLoading && total > 0 && (
					<div className="flex items-center justify-between pt-2">
						<div className="flex items-center gap-4">
							<p className="flex gap-2 text-sm text-muted-foreground">
								Mostrando
								<span className="font-mono font-semibold tabular-nums text-foreground">
									{products.length}
								</span>
								de
								<span className="font-mono font-semibold tabular-nums text-foreground">
									{total}
								</span>
								produto{total !== 1 ? "s" : ""}
							</p>

							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">
									Por página
								</span>
								<NumberField
									aria-label="Itens por página"
									minValue={1}
									maxValue={999}
									value={pageSize}
									onChange={(value) => handlePageSizeChange(value)}
									className="w-24"
								/>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								disabled={currentPage <= 1}
								onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
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
									handlePageChange(Math.min(totalPages, currentPage + 1))
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
