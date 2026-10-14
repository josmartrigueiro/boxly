import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MoreVertical, ShoppingCart, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
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
	listSalesOrders,
	salesOrdersQueryKey,
} from "@/lib/sales-orders";
import { cn } from "@/lib/utils";

const CHANNEL_CONFIG = {
	tiktok: { label: "TikTok", variant: "default" as const },
	whatsapp: { label: "WhatsApp", variant: "secondary" as const },
	instagram: { label: "Instagram", variant: "outline" as const },
};

const STATUS_CONFIG = {
	completed: { label: "Concluída", variant: "secondary" as const },
	cancelled: { label: "Cancelada", variant: "destructive" as const },
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
	timeZone: "UTC",
});

const SKELETON_ROW_WIDTHS = ["w-28", "w-20", "w-32", "w-24", "w-28"];

export function SalesOrdersTable() {
	const queryClient = useQueryClient();
	const { data: orders = [], isLoading } = useQuery({
		queryKey: salesOrdersQueryKey,
		queryFn: () => listSalesOrders(),
	});

	const cancelMutation = useMutation({
		mutationFn: cancelSalesOrder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: salesOrdersQueryKey });
			toast.success("Venda cancelada e estoque revertido.");
		},
		onError: (error) => {
			toast.error(error.message || "Não foi possível cancelar essa venda.");
		},
	});

	return (
		<Card className="w-full gap-0 shadow-xs">
			<CardHeader>
				<div className="flex items-center gap-2">
					<span className="rounded-md border border-border/60 p-1.5">
						<ShoppingCart className="size-4 text-muted-foreground" />
					</span>
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Vendas registradas
						{isLoading ? (
							<Skeleton className="ml-2 inline-block size-6 rounded-full align-middle" />
						) : (
							<Badge className="ml-2 size-6 rounded-full border-border/60 bg-muted p-0.5 font-mono text-xs tabular-nums text-muted-foreground shadow-sm">
								{orders.length}
							</Badge>
						)}
					</CardTitle>
				</div>
			</CardHeader>

			<CardContent className="mt-4">
				{isLoading ? (
					<div className="overflow-hidden rounded-lg border border-border/60">
						<Table>
							<TableHeader>
								<TableRow className="bg-primary/5">
									<TableHead className="tracking-wide">Data</TableHead>
									<TableHead className="tracking-wide">Canal</TableHead>
									<TableHead className="tracking-wide">Cliente</TableHead>
									<TableHead className="text-center tracking-wide">
										Itens
									</TableHead>
									<TableHead className="text-end tracking-wide">
										Total
									</TableHead>
									<TableHead className="text-center tracking-wide">
										Status
									</TableHead>
									<TableHead className="w-10" />
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
											<Skeleton className="h-5 w-16 rounded-full" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-4 w-24" />
										</TableCell>
										<TableCell className="text-center">
											<Skeleton className="mx-auto h-4 w-6" />
										</TableCell>
										<TableCell className="text-end">
											<Skeleton className="ml-auto h-4 w-20" />
										</TableCell>
										<TableCell className="text-center">
											<Skeleton className="mx-auto h-5 w-16 rounded-full" />
										</TableCell>
										<TableCell>
											<Skeleton className="mx-auto size-6 rounded-sm" />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				) : orders.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-4 py-16 text-center">
						<h3 className="mb-2 text-lg font-semibold">
							Nenhuma venda registrada
						</h3>
						<p className="max-w-md text-sm text-muted-foreground">
							Monte a cesta com os produtos vendidos pra registrar uma venda e
							dar baixa no estoque automaticamente.
						</p>
					</div>
				) : (
					<div className="overflow-hidden rounded-lg border border-border/60">
						<Table>
							<TableHeader>
								<TableRow className="bg-primary/5">
									<TableHead className="tracking-wide">Data</TableHead>
									<TableHead className="tracking-wide">Canal</TableHead>
									<TableHead className="tracking-wide">Cliente</TableHead>
									<TableHead className="text-center tracking-wide">
										Itens
									</TableHead>
									<TableHead className="text-end tracking-wide">
										Total
									</TableHead>
									<TableHead className="text-center tracking-wide">
										Status
									</TableHead>
									<TableHead className="w-10" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{orders.map((order) => {
									const channel = CHANNEL_CONFIG[order.channel];
									const status = STATUS_CONFIG[order.status];
									const itemsCount = order.items.reduce(
										(sum, item) => sum + item.quantity,
										0,
									);

									return (
										<TableRow
											key={order.id}
											className={cn(
												"transition-opacity duration-300 motion-reduce:transition-none",
												order.status === "cancelled" && "opacity-60",
											)}
										>
											<TableCell className="font-mono text-sm text-muted-foreground">
												{dateFormatter.format(new Date(order.orderDate))}
											</TableCell>
											<TableCell>
												<Badge variant={channel.variant}>{channel.label}</Badge>
											</TableCell>
											<TableCell className="text-sm text-foreground">
												{order.customerName || (
													<span className="text-muted-foreground">—</span>
												)}
											</TableCell>
											<TableCell className="text-center font-mono text-sm tabular-nums text-foreground">
												{itemsCount}
											</TableCell>
											<TableCell className="text-end font-mono text-sm font-semibold tabular-nums text-foreground">
												{currencyFormatter.format(Number(order.totalValue))}
											</TableCell>
											<TableCell className="text-center">
												<Badge variant={status.variant}>{status.label}</Badge>
											</TableCell>
											<TableCell>
												<DropdownMenu>
													<DropdownMenuTrigger
														aria-label="Mais opções"
														className={cn(
															buttonVariants({
																variant: "ghost",
																size: "icon",
															}),
														)}
													>
														<MoreVertical className="size-4" />
													</DropdownMenuTrigger>
													<DropdownMenuContent>
														<DropdownMenuItem
															render={
																<Link
																	to="/sales/$salesOrderId"
																	params={{ salesOrderId: order.id }}
																/>
															}
														>
															Ver detalhes
														</DropdownMenuItem>
														{order.status === "completed" ? (
															<DropdownMenuItem
																variant="destructive"
																disabled={cancelMutation.isPending}
																onClick={() => {
																	if (cancelMutation.isPending) return;
																	if (
																		window.confirm(
																			"Cancelar essa venda? O estoque dos itens será revertido.",
																		)
																	) {
																		cancelMutation.mutate({
																			data: { id: order.id },
																		});
																	}
																}}
															>
																<XCircle />
																Cancelar venda
															</DropdownMenuItem>
														) : null}
													</DropdownMenuContent>
												</DropdownMenu>
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
