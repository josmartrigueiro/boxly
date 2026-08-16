import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Package } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLotById } from "@/lib/mock-inventory";
import { getMargin, MOCK_PRODUCTS } from "@/lib/mock-products";

export const Route = createFileRoute("/_dashboard/estoque/$productId")({
	component: ProductDetailPage,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

function ProductDetailPage() {
	const { productId } = Route.useParams();
	const product = MOCK_PRODUCTS.find((item) => item.id === productId);

	if (!product) {
		return (
			<>
				<AppHeader title="Produto não encontrado" />
				<div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
					<p className="text-sm text-muted-foreground">
						Não encontramos nenhum produto com o código "{productId}".
					</p>
					<Link
						to="/estoque"
						className="text-sm font-medium text-primary hover:underline"
					>
						Voltar para o estoque
					</Link>
				</div>
			</>
		);
	}

	const lot = getLotById(product.lotId);
	const margin = getMargin(product.unitCost, product.salePrice);
	const profit = product.salePrice - product.unitCost;

	return (
		<>
			<AppHeader title={product.name} />

			<div className="w-full flex-1 space-y-6 overflow-y-auto p-4">
				<Link
					to="/estoque"
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
									{product.id}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">{product.category}</Badge>
								<ProductStatusBadge quantity={product.quantity} />
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
						<CardHeader>
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Custo e precificação
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Custo unit.</span>
								<span className="font-mono tabular-nums text-foreground">
									{currencyFormatter.format(product.unitCost)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Preço de venda</span>
								<span className="font-mono tabular-nums text-foreground">
									{currencyFormatter.format(product.salePrice)}
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
						</CardContent>
					</Card>

					<Card className="shadow-xs">
						<CardHeader>
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Fornecedor e lote
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							{lot ? (
								<>
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Lote</span>
										<span className="font-mono text-foreground">{lot.id}</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Fornecedor</span>
										<span className="text-foreground">{lot.supplier}</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Plataforma</span>
										<span className="text-foreground">{lot.platform}</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">
											Data da compra
										</span>
										<span className="font-mono text-foreground">
											{lot.purchaseDate}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Frete do lote</span>
										<span className="font-mono tabular-nums text-foreground">
											{currencyFormatter.format(lot.freightValue)}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Taxas do lote</span>
										<span className="font-mono tabular-nums text-foreground">
											{currencyFormatter.format(lot.feesValue)}
										</span>
									</div>
									<p className="pt-1 text-xs text-muted-foreground/80">
										Frete e taxas são do lote inteiro ({lot.itemsCount} itens),
										rateados entre todos os produtos comprados junto.
									</p>
								</>
							) : (
								<p className="text-muted-foreground">
									Nenhum lote associado a este produto.
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</>
	);
}
