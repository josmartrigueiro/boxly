import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Receipt, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	cancelSalesOrder,
	getSalesOrder,
	salesOrderQueryKey,
	salesOrdersQueryKey,
} from "@/lib/sales-orders";

export const Route = createFileRoute("/_dashboard/sales/$salesOrderId")({
	component: SalesOrderDetailPage,
});

const CHANNEL_LABELS = {
	tiktok: "TikTok",
	whatsapp: "WhatsApp",
	instagram: "Instagram",
};

const STATUS_CONFIG = {
	completed: { label: "Concluída", variant: "secondary" as const },
	cancelled: { label: "Cancelada", variant: "destructive" as const },
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

function SalesOrderDetailPage() {
	const { salesOrderId } = Route.useParams();
	const queryClient = useQueryClient();

	const { data: order, isLoading } = useQuery({
		queryKey: salesOrderQueryKey(salesOrderId),
		queryFn: () => getSalesOrder({ data: { id: salesOrderId } }),
		retry: false,
	});

	const cancelMutation = useMutation({
		mutationFn: cancelSalesOrder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: salesOrdersQueryKey });
			queryClient.invalidateQueries({
				queryKey: salesOrderQueryKey(salesOrderId),
			});
			toast.success("Venda cancelada e estoque revertido.");
		},
		onError: (error) => {
			toast.error(error.message || "Não foi possível cancelar essa venda.");
		},
	});

	if (isLoading) {
		return (
			<>
				<AppHeader title="Carregando..." />
				<div className="w-full flex-1 p-4" />
			</>
		);
	}

	if (!order) {
		return (
			<>
				<AppHeader title="Venda não encontrada" />
				<div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
					<p className="text-sm text-muted-foreground">
						Não encontramos nenhuma venda com esse código.
					</p>
					<Link
						to="/sales"
						className="text-sm font-medium text-primary hover:underline"
					>
						Voltar para Vendas
					</Link>
				</div>
			</>
		);
	}

	const status = STATUS_CONFIG[order.status];
	const itemsSubtotal = order.items.reduce(
		(sum, item) => sum + Number(item.unitPrice) * item.quantity,
		0,
	);
	const subtotal = Number(order.subtotalValue) || itemsSubtotal;
	const discountAmount = Number(order.discountAmount);

	return (
		<>
			<AppHeader
				title={`Venda — ${dateFormatter.format(new Date(order.orderDate))}`}
			>
				{order.status === "completed" ? (
					<Button
						size="sm"
						variant="outline"
						className="gap-2"
						disabled={cancelMutation.isPending}
						onClick={() => {
							if (
								window.confirm(
									"Cancelar essa venda? O estoque dos itens será revertido.",
								)
							) {
								cancelMutation.mutate({ data: { id: order.id } });
							}
						}}
					>
						<XCircle className="size-4" />
						{cancelMutation.isPending ? "Cancelando..." : "Cancelar venda"}
					</Button>
				) : null}
			</AppHeader>

			<div className="w-full flex-1 space-y-6 overflow-y-auto p-4">
				<Link
					to="/sales"
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="size-4" />
					Voltar para Vendas
				</Link>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
					<Card className="shadow-xs">
						<CardHeader>
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Canal
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Badge>{CHANNEL_LABELS[order.channel]}</Badge>
						</CardContent>
					</Card>
					<Card className="shadow-xs">
						<CardHeader>
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Cliente
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-foreground">
								{order.customerName || "—"}
							</p>
						</CardContent>
					</Card>
					<Card className="shadow-xs">
						<CardHeader>
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Status
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Badge variant={status.variant}>{status.label}</Badge>
						</CardContent>
					</Card>
				</div>

				<Card className="shadow-xs">
					<CardHeader>
						<div className="flex items-center gap-2">
							<span className="rounded-md border border-border/60 p-1.5">
								<Receipt className="size-4 text-muted-foreground" />
							</span>
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Itens da venda
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						<div className="overflow-hidden rounded-lg border border-border/60">
							<Table>
								<TableHeader>
									<TableRow className="bg-primary/5">
										<TableHead className="tracking-wide">Produto</TableHead>
										<TableHead className="text-center tracking-wide">
											Quantidade
										</TableHead>
										<TableHead className="text-end tracking-wide">
											Preço unit.
										</TableHead>
										<TableHead className="text-end tracking-wide">
											Subtotal
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{order.items.map((item) => (
										<TableRow key={item.id}>
											<TableCell>
												<p className="text-sm font-medium text-foreground">
													{item.productName}
												</p>
												{item.product ? (
													<Link
														to="/inventory/$productId"
														params={{ productId: item.product.id }}
														className="font-mono text-xs text-primary hover:underline"
													>
														{item.product.sku}
													</Link>
												) : null}
											</TableCell>
											<TableCell className="text-center font-mono text-sm tabular-nums text-foreground">
												{item.quantity}
											</TableCell>
											<TableCell className="text-end font-mono text-sm tabular-nums text-muted-foreground">
												{currencyFormatter.format(Number(item.unitPrice))}
											</TableCell>
											<TableCell className="text-end font-mono text-sm font-semibold tabular-nums text-foreground">
												{currencyFormatter.format(
													Number(item.unitPrice) * item.quantity,
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
						<div className="ml-auto w-full max-w-xs space-y-1.5 pt-4 font-mono text-sm tabular-nums">
							<div className="flex items-center justify-between text-muted-foreground">
								<span>Subtotal</span>
								<span>{currencyFormatter.format(subtotal)}</span>
							</div>
							{discountAmount > 0 ? (
								<div className="flex items-center justify-between text-secondary">
									<span>Desconto</span>
									<span>−{currencyFormatter.format(discountAmount)}</span>
								</div>
							) : null}
							<div className="flex items-center justify-between border-t border-border/60 pt-2 text-foreground">
								<span className="font-sans text-sm font-medium">Total</span>
								<span className="text-lg font-semibold">
									{currencyFormatter.format(Number(order.totalValue))}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				{order.notes ? (
					<Card className="shadow-xs">
						<CardHeader>
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Observações
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">{order.notes}</p>
						</CardContent>
					</Card>
				) : null}
			</div>
		</>
	);
}
