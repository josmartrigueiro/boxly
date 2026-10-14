import { getLocalTimeZone, today } from "@internationalized/date";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CurrencyField, NumberField } from "@/components/ui/number-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	getMargin,
	getPriceFromMargin,
	type getProduct,
	productQueryKey,
	productsQueryKey,
} from "@/lib/products";
import { computeChargesTotal } from "@/lib/purchase-order-totals";
import {
	listPurchaseOrders,
	purchaseOrdersQueryKey,
} from "@/lib/purchase-orders";
import {
	createStockMovement,
	stockMovementsQueryKey,
} from "@/lib/stock-movements";

const TYPE_OPTIONS = [
	{ value: "entrada", label: "Entrada" },
	{ value: "saida", label: "Saída" },
	{ value: "ajuste", label: "Ajuste (contagem física)" },
];

const VALUE_LABEL: Record<string, string> = {
	entrada: "Quantidade recebida",
	saida: "Quantidade retirada",
	ajuste: "Quantidade contada (total)",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

type Product = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

type StockMovementFormProps = {
	productId: string;
	product: Product;
	onSuccess?: () => void;
};

export function StockMovementForm({
	productId,
	product,
	onSuccess,
}: StockMovementFormProps) {
	const queryClient = useQueryClient();
	const [salePriceTouched, setSalePriceTouched] = useState(false);

	const { data: purchaseOrders = [] } = useQuery({
		queryKey: purchaseOrdersQueryKey,
		queryFn: () => listPurchaseOrders(),
	});

	const mutation = useMutation({
		mutationFn: createStockMovement,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: stockMovementsQueryKey(productId),
			});
			queryClient.invalidateQueries({ queryKey: productQueryKey(productId) });
			queryClient.invalidateQueries({ queryKey: productsQueryKey });
			toast.success("Movimentação registrada!");
			form.reset();
			setSalePriceTouched(false);
			onSuccess?.();
		},
		onError: (error) => {
			toast.error(
				error.message || "Não foi possível registrar a movimentação.",
			);
		},
	});

	const form = useForm({
		defaultValues: {
			type: "entrada" as "entrada" | "saida" | "ajuste",
			value: 0,
			date: today(getLocalTimeZone()),
			reason: "",
			unitCost: 0,
			purchaseOrderId: "",
			salePrice: 0,
		},
		onSubmit: async ({ value }) => {
			const isRestock = value.type === "entrada" && value.unitCost > 0;
			await mutation.mutateAsync({
				data: {
					productId,
					type: value.type,
					value: value.value,
					date: value.date.toString(),
					reason: value.reason,
					...(isRestock ? { unitCost: value.unitCost } : {}),
					...(isRestock && value.purchaseOrderId
						? { purchaseOrderId: value.purchaseOrderId }
						: {}),
					...(isRestock && value.salePrice > 0
						? { salePrice: value.salePrice }
						: {}),
				},
			});
		},
	});

	const [type, quantity, unitCost, purchaseOrderId] = useStore(
		form.store,
		(state) => [
			state.values.type,
			state.values.value,
			state.values.unitCost,
			state.values.purchaseOrderId,
		],
	);

	const currentUnitCost = Number(product.unitCost);
	const currentMargin = getMargin(currentUnitCost, Number(product.salePrice));

	const preview = useMemo(() => {
		if (type !== "entrada" || !unitCost || unitCost <= 0) return null;

		const totalQuantity = product.quantity + quantity;
		const newAvgCost =
			totalQuantity > 0
				? (product.quantity * currentUnitCost + quantity * unitCost) /
					totalQuantity
				: unitCost;

		const order = purchaseOrders.find((item) => item.id === purchaseOrderId);
		let freightPerUnit = 0;
		if (order && quantity > 0) {
			const orderCharges = computeChargesTotal(
				order.charges,
				Number(order.productsValue),
			);
			const thisValue = unitCost * quantity;
			const totalValue = Number(order.productsValue);
			const freightShare =
				totalValue > 0 ? orderCharges * (thisValue / totalValue) : 0;
			freightPerUnit = freightShare / quantity;
		}

		const suggestedPrice =
			Math.round(
				getPriceFromMargin(newAvgCost + freightPerUnit, currentMargin) * 100,
			) / 100;

		return {
			newAvgCost: Math.round(newAvgCost * 100) / 100,
			freightPerUnit,
			suggestedPrice,
		};
	}, [
		type,
		unitCost,
		quantity,
		purchaseOrderId,
		purchaseOrders,
		product.quantity,
		currentUnitCost,
		currentMargin,
	]);

	useEffect(() => {
		if (!salePriceTouched && preview) {
			form.setFieldValue("salePrice", preview.suggestedPrice);
		}
	}, [preview, salePriceTouched, form.setFieldValue]);

	return (
		<form
			noValidate
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit();
			}}
			className="flex flex-col gap-4"
		>
			<FieldGroup>
				<form.Field name="type">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Tipo</FieldLabel>
							<Select
								value={field.state.value}
								onValueChange={(value) =>
									field.handleChange(value as "entrada" | "saida" | "ajuste")
								}
							>
								<SelectTrigger id={field.name}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TYPE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
					)}
				</form.Field>

				<div className="grid grid-cols-2 gap-4">
					<form.Field
						name="value"
						validators={{
							onBlur: ({ value }) =>
								value == null || value < 0
									? "Informe um valor válido"
									: undefined,
						}}
					>
						{(field) => {
							const hasError =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<form.Subscribe selector={(state) => state.values.type}>
									{(type) => (
										<Field>
											<FieldLabel htmlFor={field.name}>
												{VALUE_LABEL[type]}
											</FieldLabel>
											<NumberField
												id={field.name}
												minValue={0}
												value={field.state.value}
												onChange={(value) => field.handleChange(value)}
												onBlur={field.handleBlur}
												invalid={hasError}
											/>
											{hasError ? (
												<FieldError
													errors={field.state.meta.errors.map((message) => ({
														message,
													}))}
												/>
											) : null}
										</Field>
									)}
								</form.Subscribe>
							);
						}}
					</form.Field>

					<form.Field name="date">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Data</FieldLabel>
								<DateField
									id={field.name}
									value={field.state.value}
									onChange={(value) => {
										if (value) field.handleChange(value);
									}}
								/>
							</Field>
						)}
					</form.Field>
				</div>

				<form.Subscribe selector={(state) => state.values.type}>
					{(currentType) =>
						currentType === "entrada" ? (
							<>
								<div className="grid grid-cols-2 gap-4">
									<form.Field name="unitCost">
										{(field) => (
											<Field>
												<FieldLabel htmlFor={field.name}>
													Custo unitário desta entrada
												</FieldLabel>
												<CurrencyField
													id={field.name}
													value={field.state.value}
													onChange={(value) => field.handleChange(value)}
												/>
											</Field>
										)}
									</form.Field>

									<form.Field name="purchaseOrderId">
										{(field) => (
											<Field>
												<FieldLabel htmlFor={field.name}>
													Pedido de compra vinculado
												</FieldLabel>
												<Select
													placeholder="Nenhum"
													value={field.state.value}
													onValueChange={(value) =>
														field.handleChange(value as string)
													}
												>
													<SelectTrigger id={field.name}>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{purchaseOrders.map((order) => (
															<SelectItem key={order.id} value={order.id}>
																{order.supplier.name} —{" "}
																{dateFormatter.format(
																	new Date(order.orderDate),
																)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</Field>
										)}
									</form.Field>
								</div>

								{preview ? (
									<div className="flex flex-col gap-3 rounded-md border border-dashed border-border/60 p-3">
										<p className="text-sm text-muted-foreground">
											Custo médio: {currencyFormatter.format(currentUnitCost)} →{" "}
											<span className="font-medium text-foreground">
												{currencyFormatter.format(preview.newAvgCost)}
											</span>
											{preview.freightPerUnit > 0 ? (
												<>
													{" "}
													(+{currencyFormatter.format(preview.freightPerUnit)}{" "}
													de frete ratado)
												</>
											) : null}
										</p>
										<form.Field name="salePrice">
											{(field) => (
												<Field>
													<FieldLabel htmlFor={field.name}>
														Novo preço de venda sugerido
													</FieldLabel>
													<CurrencyField
														id={field.name}
														value={field.state.value}
														onChange={(value) => {
															field.handleChange(value);
															setSalePriceTouched(true);
														}}
													/>
												</Field>
											)}
										</form.Field>
									</div>
								) : null}
							</>
						) : null
					}
				</form.Subscribe>

				<form.Field name="reason">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Motivo</FieldLabel>
							<Input
								id={field.name}
								placeholder="Ex: Venda via TikTok, contagem física..."
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						</Field>
					)}
				</form.Field>
			</FieldGroup>

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<Button
						type="submit"
						disabled={!canSubmit || isSubmitting}
						className="w-fit"
					>
						{isSubmitting ? "Salvando..." : "Registrar movimentação"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
