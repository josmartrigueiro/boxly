import { useQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { History, Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { ProductImagePreview } from "@/components/products/product-image-preview";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { StockMovementForm } from "@/components/products/stock-movement-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useTiktokCommission } from "@/hooks/use-tiktok-commission";
import { getMargin, getProduct, productQueryKey } from "@/lib/products";
import {
	listMovementsForProduct,
	stockMovementsQueryKey,
} from "@/lib/stock-movements";

const routeApi = getRouteApi("/_dashboard/inventory/");
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

export function ProductDetailsSheet() {
	const { product: productId } = routeApi.useSearch();
	const routeNavigate = routeApi.useNavigate();
	const navigate = useNavigate();
	const { commission } = useTiktokCommission();
	const [movementOpen, setMovementOpen] = useState(false);
	const { data: product, isLoading } = useQuery({
		queryKey: productQueryKey(productId ?? ""),
		queryFn: () => getProduct({ data: { id: productId ?? "" } }),
		enabled: Boolean(productId),
	});
	const { data: movements = [] } = useQuery({
		queryKey: stockMovementsQueryKey(productId ?? ""),
		queryFn: () =>
			listMovementsForProduct({ data: { productId: productId ?? "" } }),
		enabled: Boolean(productId),
	});

	function handleOpenChange(open: boolean) {
		if (!open) {
			routeNavigate({
				search: (previous) => ({ ...previous, product: undefined }),
				replace: true,
			});
		}
	}

	const unitCost = Number(product?.unitCost ?? 0);
	const salePrice = Number(product?.salePrice ?? 0);
	const margin = getMargin(unitCost, salePrice);
	const tiktokPrice = salePrice * (1 + commission / 100);

	return (
		<Sheet open={Boolean(productId)} onOpenChange={handleOpenChange}>
			<SheetContent>
				<div className="border-b border-border/60 px-6 pt-6 pb-5">
					<SheetTitle>{product?.name ?? "Detalhes do produto"}</SheetTitle>
					<SheetDescription>
						{product
							? `${product.sku} · visão rápida do estoque`
							: "Carregando produto…"}
					</SheetDescription>
					{product ? (
						<div className="mt-4 flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									navigate({
										to: "/inventory/$productId/edit",
										params: { productId: product.id },
									})
								}
							>
								<Pencil className="size-3.5" />
								Editar
							</Button>
							<Button size="sm" onClick={() => setMovementOpen(true)}>
								<Plus className="size-3.5" />
								Movimentar
							</Button>
						</div>
					) : null}
				</div>

				<div className="flex-1 space-y-4 overflow-y-auto p-6">
					{isLoading && !product ? (
						<SheetSkeleton />
					) : product ? (
						<>
							<Card className="shadow-xs">
								<CardContent className="space-y-4 pt-5">
									<div className="flex items-center gap-3">
										<ProductImagePreview
											alt={`Imagem de ${product.name}`}
											src={product.photoUrl}
											className="size-20"
										/>
										<div className="min-w-0">
											<p className="font-medium text-foreground">
												{product.name}
											</p>
											<p className="font-mono text-xs text-muted-foreground">
												{product.sku}
												{product.brand ? ` · ${product.brand}` : ""}
											</p>
										</div>
									</div>
									<div className="flex flex-wrap gap-2">
										<Badge variant="outline">{product.category}</Badge>
										<ProductStatusBadge quantity={product.quantity} />
										{product.tangerinas > 0 ? (
											<Badge variant="secondary">
												{product.tangerinas}{" "}
												{product.tangerinas === 1 ? "Tangerina" : "Tangerinas"}
											</Badge>
										) : null}
										{product.status === "inactive" ? (
											<Badge variant="destructive">Inativo</Badge>
										) : null}
									</div>
									<p className="text-sm text-muted-foreground">
										Qtd. atual:{" "}
										<span className="font-mono font-semibold text-foreground">
											{product.quantity}
										</span>
									</p>
								</CardContent>
							</Card>

							<Card className="shadow-xs">
								<CardContent className="space-y-2 pt-5 text-sm">
									<InfoRow
										label="Custo unit."
										value={currencyFormatter.format(unitCost)}
									/>
									<InfoRow
										label="Preço de venda"
										value={currencyFormatter.format(salePrice)}
										strong
									/>
									<InfoRow
										label={`TikTok Shop (${commission}%)`}
										value={currencyFormatter.format(tiktokPrice)}
									/>
									<InfoRow
										label="Margem"
										value={`${margin.toFixed(0)}%`}
										highlight
									/>
									<InfoRow
										label="Tangerinas para kits"
										value={`${product.tangerinas} por unidade`}
									/>
								</CardContent>
							</Card>

							<Card className="shadow-xs">
								<CardContent className="pt-5">
									<div className="mb-3 flex items-center gap-2">
										<History className="size-4 text-muted-foreground" />
										<p className="text-sm font-medium">Últimas movimentações</p>
									</div>
									{movements.length ? (
										<div className="space-y-2">
											{movements.slice(0, 6).map((movement) => (
												<div
													key={movement.id}
													className="flex items-center justify-between gap-3 rounded-md bg-muted/45 px-3 py-2 text-sm"
												>
													<div className="min-w-0">
														<p className="font-medium capitalize">
															{movement.type}
														</p>
														<p className="truncate text-xs text-muted-foreground">
															{movement.reason || "Sem motivo"}
														</p>
													</div>
													<div className="text-right">
														<p className="font-mono font-semibold tabular-nums">
															{movement.quantity > 0 ? "+" : ""}
															{movement.quantity}
														</p>
														<p className="text-xs text-muted-foreground">
															{dateFormatter.format(new Date(movement.date))}
														</p>
													</div>
												</div>
											))}
										</div>
									) : (
										<p className="py-3 text-sm text-muted-foreground">
											Nenhuma movimentação registrada.
										</p>
									)}
								</CardContent>
							</Card>
						</>
					) : null}
				</div>

				{product ? (
					<Dialog open={movementOpen} onOpenChange={setMovementOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Registrar movimentação</DialogTitle>
								<DialogDescription>
									Entrada, saída ou ajuste para {product.name}.
								</DialogDescription>
							</DialogHeader>
							<StockMovementForm
								productId={product.id}
								product={product}
								onSuccess={() => setMovementOpen(false)}
							/>
						</DialogContent>
					</Dialog>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function InfoRow({
	label,
	value,
	strong = false,
	highlight = false,
}: {
	label: string;
	value: string;
	strong?: boolean;
	highlight?: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<span className="text-muted-foreground">{label}</span>
			<span
				className={`font-mono tabular-nums ${strong ? "font-semibold text-foreground" : highlight ? "font-semibold text-primary" : "text-foreground"}`}
			>
				{value}
			</span>
		</div>
	);
}

function SheetSkeleton() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-32 w-full" />
			<Skeleton className="h-28 w-full" />
			<Skeleton className="h-44 w-full" />
		</div>
	);
}
