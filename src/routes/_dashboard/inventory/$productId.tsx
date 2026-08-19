import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, History, Package, Plus } from "lucide-react";
import { useState } from "react";

import { AppHeader } from "@/components/app-header";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { StockMovementForm } from "@/components/products/stock-movement-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useTiktokCommission } from "@/hooks/use-tiktok-commission";
import { getMargin, getProduct, productQueryKey } from "@/lib/products";
import {
	listMovementsForProduct,
	stockMovementsQueryKey,
} from "@/lib/stock-movements";

const MOVEMENT_LABELS: Record<
	"entrada" | "saida" | "ajuste",
	{ label: string; variant: "secondary" | "warning" | "outline" }
> = {
	entrada: { label: "Entrada", variant: "secondary" },
	saida: { label: "Saída", variant: "outline" },
	ajuste: { label: "Ajuste", variant: "warning" },
};

export const Route = createFileRoute("/_dashboard/inventory/$productId")({
	component: ProductDetailPage,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

function ProductDetailPage() {
	const { productId } = Route.useParams();
	const [movementDialogOpen, setMovementDialogOpen] = useState(false);
	const { commission } = useTiktokCommission();

	const { data: product, isLoading } = useQuery({
		queryKey: productQueryKey(productId),
		queryFn: () => getProduct({ data: { id: productId } }),
		retry: false,
	});

	const { data: movements = [] } = useQuery({
		queryKey: stockMovementsQueryKey(productId),
		queryFn: () => listMovementsForProduct({ data: { productId } }),
		enabled: !!product,
	});

	if (isLoading) {
		return (
			<>
				<AppHeader title="Carregando..." />
				<div className="w-full flex-1 p-4" />
			</>
		);
	}

	if (!product) {
		return (
			<>
				<AppHeader title="Produto não encontrado" />
				<div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
					<p className="text-sm text-muted-foreground">
						Não encontramos nenhum produto com esse código.
					</p>
					<Link
						to="/inventory"
						className="text-sm font-medium text-primary hover:underline"
					>
						Voltar para o estoque
					</Link>
				</div>
			</>
		);
	}

	const unitCost = Number(product.unitCost);
	const salePrice = Number(product.salePrice);
	const margin = getMargin(unitCost, salePrice);
	const profit = salePrice - unitCost;
	const tiktokPrice = salePrice * (1 + commission / 100);

	return (
		<>
			<AppHeader title={product.name}>
				<Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
					<Button
						size="sm"
						className="gap-2"
						onClick={() => setMovementDialogOpen(true)}
					>
						<Plus className="size-4" />
						<span className="hidden xl:inline">Nova movimentação</span>
					</Button>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Registrar movimentação</DialogTitle>
							<DialogDescription>
								Entrada, saída ou ajuste de contagem para {product.name}.
							</DialogDescription>
						</DialogHeader>
						<StockMovementForm
							productId={product.id}
							onSuccess={() => setMovementDialogOpen(false)}
						/>
					</DialogContent>
				</Dialog>
			</AppHeader>

			<div className="w-full flex-1 space-y-6 overflow-y-auto p-4">
				<Link
					to="/inventory"
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="size-4" />
					Voltar para Estoque
				</Link>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
					<Card className="shadow-xs">
						<CardHeader>
							<div className="flex items-center gap-2">
								<span className="rounded-md border border-border/60 p-1.5">
									<Package className="size-4 text-muted-foreground" />
								</span>
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Produto
								</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<p className="font-medium text-foreground">{product.name}</p>
								<p className="font-mono text-xs text-muted-foreground">
									{product.sku}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">{product.category}</Badge>
								<ProductStatusBadge quantity={product.quantity} />
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
							{product.saleLink ? (
								<a
									href={product.saleLink}
									target="_blank"
									rel="noreferrer"
									className="block text-sm text-primary hover:underline"
								>
									Link de venda
								</a>
							) : null}
							{product.notes ? (
								<p className="text-sm text-muted-foreground">{product.notes}</p>
							) : null}
						</CardContent>
					</Card>

					<Card className="shadow-xs">
						<CardHeader>
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Custo e precificação
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Custo unit.</span>
								<span className="font-mono tabular-nums text-foreground">
									{currencyFormatter.format(unitCost)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Preço de venda</span>
								<span className="font-mono tabular-nums text-foreground">
									{currencyFormatter.format(salePrice)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Lucro unit.</span>
								<span className="font-mono tabular-nums text-foreground">
									{currencyFormatter.format(profit)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Margem</span>
								<span className="font-mono tabular-nums font-semibold text-primary">
									{margin.toFixed(0)}%
								</span>
							</div>
							<div className="flex items-center justify-between border-t border-dashed border-border pt-2">
								<span className="text-muted-foreground">
									Preço TikTok Shop ({commission}%)
								</span>
								<span className="font-mono tabular-nums text-foreground">
									{currencyFormatter.format(tiktokPrice)}
								</span>
							</div>
						</CardContent>
					</Card>

					<Card className="shadow-xs">
						<CardHeader>
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Fornecedor e pedido
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							{product.purchaseOrder ? (
								<>
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Fornecedor</span>
										<span className="text-foreground">
											{product.purchaseOrder.supplier.name}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">
											Data do pedido
										</span>
										<span className="font-mono text-foreground">
											{dateFormatter.format(
												new Date(product.purchaseOrder.orderDate),
											)}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">
											Valor dos produtos
										</span>
										<span className="font-mono tabular-nums text-foreground">
											{currencyFormatter.format(
												Number(product.purchaseOrder.productsValue),
											)}
										</span>
									</div>
									<Link
										to="/purchase-orders"
										className="inline-block pt-1 text-xs text-primary hover:underline"
									>
										Ver pedidos de compra
									</Link>
								</>
							) : (
								<p className="text-muted-foreground">
									Nenhum pedido associado a este produto.
								</p>
							)}
						</CardContent>
					</Card>
				</div>

				<Card className="shadow-xs">
					<CardHeader>
						<div className="flex items-center gap-2">
							<span className="rounded-md border border-border/60 p-1.5">
								<History className="size-4 text-muted-foreground" />
							</span>
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Movimentações
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						{movements.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								Nenhuma movimentação registrada ainda.
							</p>
						) : (
							<div className="overflow-hidden rounded-lg border border-border/60">
								<Table>
									<TableHeader>
										<TableRow className="bg-primary/5">
											<TableHead className="tracking-wide">Data</TableHead>
											<TableHead className="tracking-wide">Tipo</TableHead>
											<TableHead className="tracking-wide">Motivo</TableHead>
											<TableHead className="text-end tracking-wide">
												Quantidade
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{movements.map((movement) => {
											const config = MOVEMENT_LABELS[movement.type];
											const signedQuantity =
												movement.quantity > 0
													? `+${movement.quantity}`
													: String(movement.quantity);

											return (
												<TableRow key={movement.id}>
													<TableCell className="font-mono text-sm text-muted-foreground">
														{dateFormatter.format(new Date(movement.date))}
													</TableCell>
													<TableCell>
														<Badge variant={config.variant}>
															{config.label}
														</Badge>
													</TableCell>
													<TableCell className="text-sm text-muted-foreground">
														{movement.reason || "—"}
													</TableCell>
													<TableCell className="text-end font-mono text-sm font-semibold tabular-nums text-foreground">
														{signedQuantity}
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</>
	);
}
