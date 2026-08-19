import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { computeChargesTotal } from "@/lib/purchase-order-totals";
import {
	listPurchaseOrders,
	purchaseOrdersQueryKey,
} from "@/lib/purchase-orders";

const STATUS_CONFIG = {
	pending: { label: "Pendente", variant: "outline" as const },
	in_transit: { label: "Em trânsito", variant: "warning" as const },
	received: { label: "Recebido", variant: "secondary" as const },
	cancelled: { label: "Cancelado", variant: "destructive" as const },
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
	timeZone: "UTC",
});

export function PurchaseOrdersTable() {
	const { data: orders = [], isLoading } = useQuery({
		queryKey: purchaseOrdersQueryKey,
		queryFn: () => listPurchaseOrders(),
	});

	return (
		<Card className="w-full gap-0 shadow-xs">
			<CardHeader>
				<div className="flex items-center gap-2">
					<span className="rounded-md border border-border/60 p-1.5">
						<ClipboardList className="size-4 text-muted-foreground" />
					</span>
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Pedidos registrados
						<Badge className="ml-2 size-6 rounded-full border-border/60 bg-muted p-0.5 font-mono text-xs tabular-nums text-muted-foreground shadow-sm">
							{orders.length}
						</Badge>
					</CardTitle>
				</div>
			</CardHeader>

			<CardContent className="mt-4">
				{isLoading ? (
					<p className="py-8 text-center text-sm text-muted-foreground">
						Carregando...
					</p>
				) : orders.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-4 py-16 text-center">
						<h3 className="mb-2 text-lg font-semibold">
							Nenhum pedido registrado
						</h3>
						<p className="max-w-md text-sm text-muted-foreground">
							Registre os pedidos que você faz nos seus fornecedores pra
							acompanhar valores, fretes e status de entrega.
						</p>
					</div>
				) : (
					<div className="overflow-hidden rounded-lg border border-border/60">
						<Table>
							<TableHeader>
								<TableRow className="bg-primary/5">
									<TableHead className="tracking-wide">Fornecedor</TableHead>
									<TableHead className="tracking-wide">Data</TableHead>
									<TableHead className="text-center tracking-wide">
										Itens
									</TableHead>
									<TableHead className="text-end tracking-wide">
										Produtos
									</TableHead>
									<TableHead className="text-end tracking-wide">
										Taxas
									</TableHead>
									<TableHead className="text-end tracking-wide">
										Total
									</TableHead>
									<TableHead className="text-center tracking-wide">
										Status
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{orders.map((order) => {
									const products = Number(order.productsValue);
									const chargesTotal = computeChargesTotal(
										order.charges,
										products,
									);
									const total = products + chargesTotal;
									const status = STATUS_CONFIG[order.status];

									return (
										<TableRow key={order.id}>
											<TableCell className="font-medium">
												{order.supplier.name}
											</TableCell>
											<TableCell className="font-mono text-sm text-muted-foreground">
												{dateFormatter.format(new Date(order.orderDate))}
											</TableCell>
											<TableCell className="text-center font-mono text-sm tabular-nums text-foreground">
												{order.itemsCount}
											</TableCell>
											<TableCell className="text-end font-mono text-sm tabular-nums text-muted-foreground">
												{currencyFormatter.format(products)}
											</TableCell>
											<TableCell className="text-end font-mono text-sm tabular-nums text-muted-foreground">
												{currencyFormatter.format(chargesTotal)}
											</TableCell>
											<TableCell className="text-end font-mono text-sm tabular-nums font-semibold text-foreground">
												{currencyFormatter.format(total)}
											</TableCell>
											<TableCell className="text-center">
												<Badge variant={status.variant}>{status.label}</Badge>
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
	);
}
