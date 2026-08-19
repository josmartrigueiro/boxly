import { getLocalTimeZone, today } from "@internationalized/date";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { HeaderActionsPortal } from "@/components/header-actions-context";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { FieldError } from "@/components/ui/field";
import { FieldRow, FieldRowDivider } from "@/components/ui/field-row";
import { Input } from "@/components/ui/input";
import { CurrencyField, NumberField } from "@/components/ui/number-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { computeChargesTotal } from "@/lib/purchase-order-totals";
import {
	createPurchaseOrder,
	purchaseOrdersQueryKey,
} from "@/lib/purchase-orders";
import { listSuppliers, suppliersQueryKey } from "@/lib/suppliers";

const STATUS_OPTIONS = [
	{ value: "pending", label: "Pendente" },
	{ value: "in_transit", label: "Em trânsito" },
	{ value: "received", label: "Recebido" },
	{ value: "cancelled", label: "Cancelado" },
];

const CHARGE_KIND_OPTIONS = [
	{ value: "fixed", label: "Valor (R$)" },
	{ value: "percentage", label: "Porcentagem (%)" },
];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

type PurchaseOrderFormProps = {
	onSuccess?: () => void;
};

export function PurchaseOrderForm({ onSuccess }: PurchaseOrderFormProps) {
	const queryClient = useQueryClient();
	const [showNewSupplier, setShowNewSupplier] = useState(false);

	const { data: suppliers = [] } = useQuery({
		queryKey: suppliersQueryKey,
		queryFn: () => listSuppliers(),
	});

	const supplierOptions = suppliers.map((supplier) => ({
		value: supplier.id,
		label: supplier.name,
	}));

	const mutation = useMutation({
		mutationFn: createPurchaseOrder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
			toast.success("Pedido de compra registrado!");
			form.reset();
			onSuccess?.();
		},
		onError: () => {
			toast.error("Não foi possível registrar o pedido.");
		},
	});

	const form = useForm({
		defaultValues: {
			supplierId: "",
			orderDate: today(getLocalTimeZone()),
			itemsCount: 1,
			productsValue: 0,
			status: "pending" as "pending" | "in_transit" | "received" | "cancelled",
			notes: "",
			charges: [] as Array<{
				name: string;
				kind: "percentage" | "fixed";
				value: number;
			}>,
		},
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync({
				data: {
					supplierId: value.supplierId,
					orderDate: value.orderDate.toString(),
					itemsCount: value.itemsCount,
					productsValue: value.productsValue,
					status: value.status,
					notes: value.notes,
					charges: value.charges,
				},
			});
		},
	});

	return (
		<form
			noValidate
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit();
			}}
			className="flex flex-col gap-6"
		>
			<form.Field
				name="supplierId"
				validators={{
					onChange: ({ value }) =>
						!value ? "Selecione um fornecedor" : undefined,
				}}
			>
				{(field) => {
					const hasError =
						field.state.meta.isTouched && !field.state.meta.isValid;
					return (
						<>
							<FieldRow
								label="Fornecedor"
								htmlFor={field.name}
								description="Selecione o fornecedor/distribuidora responsável por este pedido"
								required
							>
								<div className="flex items-center justify-end">
									<button
										type="button"
										onClick={() => setShowNewSupplier((value) => !value)}
										className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
									>
										<Plus className="size-3" />
										Novo fornecedor
									</button>
								</div>
								<Select
									placeholder="Selecione um fornecedor"
									value={field.state.value}
									onValueChange={(value) => {
										field.handleChange(value as string);
										field.handleBlur();
									}}
								>
									<SelectTrigger id={field.name} aria-invalid={hasError}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{supplierOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{hasError ? (
									<FieldError
										errors={field.state.meta.errors.map((message) => ({
											message,
										}))}
									/>
								) : null}
							</FieldRow>

							{showNewSupplier && (
								<div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-4">
									<SupplierForm
										standalone={false}
										onSuccess={(supplierId) => {
											form.setFieldValue("supplierId", supplierId);
											setShowNewSupplier(false);
										}}
									/>
								</div>
							)}
						</>
					);
				}}
			</form.Field>

			<FieldRowDivider />

			<form.Field
				name="orderDate"
				validators={{
					onChange: ({ value }) =>
						!value ? "Informe a data do pedido" : undefined,
				}}
			>
				{(field) => {
					const hasError =
						field.state.meta.isTouched && !field.state.meta.isValid;
					return (
						<FieldRow
							label="Data do pedido"
							htmlFor={field.name}
							description="Data em que o pedido foi realizado"
							required
						>
							<DateField
								id={field.name}
								value={field.state.value}
								onChange={(value) => {
									if (value) field.handleChange(value);
								}}
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
						</FieldRow>
					);
				}}
			</form.Field>

			<FieldRowDivider />

			<form.Field
				name="itemsCount"
				validators={{
					onBlur: ({ value }) =>
						!value || value < 1 ? "Informe a quantidade de itens" : undefined,
				}}
			>
				{(field) => {
					const hasError =
						field.state.meta.isTouched && !field.state.meta.isValid;
					return (
						<FieldRow
							label="Qtd. de itens"
							htmlFor={field.name}
							description="Quantidade total de itens deste pedido"
							required
						>
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
						</FieldRow>
					);
				}}
			</form.Field>

			<FieldRowDivider />

			<form.Field
				name="productsValue"
				validators={{
					onBlur: ({ value }) =>
						!value || value <= 0 ? "Informe o valor dos produtos" : undefined,
				}}
			>
				{(field) => {
					const hasError =
						field.state.meta.isTouched && !field.state.meta.isValid;
					return (
						<FieldRow
							label="Valor dos produtos"
							htmlFor={field.name}
							description="Valor total pago pelos produtos, sem frete ou taxas"
							required
						>
							<CurrencyField
								id={field.name}
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
						</FieldRow>
					);
				}}
			</form.Field>

			<FieldRowDivider />

			<form.Field name="status">
				{(field) => (
					<FieldRow
						label="Status"
						htmlFor={field.name}
						description="Situação atual do pedido"
					>
						<Select
							value={field.state.value}
							onValueChange={(value) =>
								field.handleChange(
									value as "pending" | "in_transit" | "received" | "cancelled",
								)
							}
						>
							<SelectTrigger id={field.name}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{STATUS_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FieldRow>
				)}
			</form.Field>

			<FieldRowDivider />

			<form.Field name="charges" mode="array">
				{(chargesField) => (
					<FieldRow
						label="Impostos e taxas"
						description="Frete, alíquotas, etc. Cada taxa pode ser um valor fixo ou uma porcentagem sobre o valor dos produtos"
						contentClassName="max-w-none"
					>
						<div className="flex items-center justify-end">
							<button
								type="button"
								onClick={() =>
									chargesField.pushValue({
										name: "",
										kind: "fixed",
										value: 0,
									})
								}
								className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
							>
								<Plus className="size-3" />
								Adicionar taxa
							</button>
						</div>
						{chargesField.state.value.length === 0 ? (
							<p className="text-xs text-muted-foreground">
								Nenhuma taxa adicionada.
							</p>
						) : (
							chargesField.state.value.map((_, index) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: charge rows have no stable id before creation
									key={index}
									className="grid grid-cols-[1fr_auto_auto_auto] items-start gap-2"
								>
									<form.Field
										name={`charges[${index}].name`}
										validators={{
											onBlur: ({ value }) =>
												!value ? "Informe o nome" : undefined,
										}}
									>
										{(field) => {
											const hasError =
												field.state.meta.isTouched && !field.state.meta.isValid;
											return (
												<div className="flex flex-col gap-1">
													<Input
														placeholder="Ex: Frete, Alíquota"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(event) =>
															field.handleChange(event.target.value)
														}
														aria-invalid={hasError}
													/>
													{hasError ? (
														<FieldError
															errors={field.state.meta.errors.map(
																(message) => ({ message }),
															)}
														/>
													) : null}
												</div>
											);
										}}
									</form.Field>

									<form.Field name={`charges[${index}].kind`}>
										{(kindField) => (
											<>
												<Select
													value={kindField.state.value}
													onValueChange={(value) =>
														kindField.handleChange(
															value as "percentage" | "fixed",
														)
													}
												>
													<SelectTrigger className="w-40">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{CHARGE_KIND_OPTIONS.map((option) => (
															<SelectItem
																key={option.value}
																value={option.value}
															>
																{option.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>

												<form.Field
													name={`charges[${index}].value`}
													validators={{
														onBlur: ({ value }) =>
															value == null || value < 0
																? "Valor inválido"
																: undefined,
													}}
												>
													{(field) => {
														const hasError =
															field.state.meta.isTouched &&
															!field.state.meta.isValid;
														return (
															<div className="flex w-36 flex-col gap-1">
																{kindField.state.value === "percentage" ? (
																	<NumberField
																		minValue={0}
																		maxValue={100}
																		suffix="%"
																		value={field.state.value}
																		onChange={(value) =>
																			field.handleChange(value)
																		}
																		onBlur={field.handleBlur}
																		invalid={hasError}
																	/>
																) : (
																	<CurrencyField
																		value={field.state.value}
																		onChange={(value) =>
																			field.handleChange(value)
																		}
																		onBlur={field.handleBlur}
																		invalid={hasError}
																	/>
																)}
																{hasError ? (
																	<FieldError
																		errors={field.state.meta.errors.map(
																			(message) => ({ message }),
																		)}
																	/>
																) : null}
															</div>
														);
													}}
												</form.Field>
											</>
										)}
									</form.Field>

									<button
										type="button"
										onClick={() => chargesField.removeValue(index)}
										aria-label="Remover taxa"
										className="flex h-8 w-6 shrink-0 items-center justify-center text-muted-foreground/60 outline-none transition-colors hover:text-destructive"
									>
										<X className="size-3.5" />
									</button>
								</div>
							))
						)}
					</FieldRow>
				)}
			</form.Field>

			<FieldRowDivider />

			<form.Field name="notes">
				{(field) => (
					<FieldRow
						label="Observações"
						htmlFor={field.name}
						description="Informações adicionais sobre este pedido"
						contentClassName="max-w-2xl"
					>
						<Textarea
							id={field.name}
							value={field.state.value}
							onChange={(event) => field.handleChange(event.target.value)}
						/>
					</FieldRow>
				)}
			</form.Field>

			<FieldRowDivider />

			<form.Subscribe
				selector={(state) => [state.values.productsValue, state.values.charges]}
			>
				{([productsValue, charges]) => {
					const total =
						Number(productsValue) +
						computeChargesTotal(
							charges as Array<{
								kind: "percentage" | "fixed";
								value: number;
							}>,
							Number(productsValue),
						);
					return (
						<div className="grid grid-cols-3 items-center gap-8">
							<span className="text-sm font-medium text-foreground">
								Total estimado
							</span>
							<span className="col-span-2 font-mono text-lg font-semibold tabular-nums text-foreground">
								{currencyFormatter.format(total)}
							</span>
						</div>
					);
				}}
			</form.Subscribe>

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<HeaderActionsPortal>
						<Button
							type="button"
							size="sm"
							onClick={() => form.handleSubmit()}
							disabled={!canSubmit || isSubmitting}
						>
							{isSubmitting ? "Salvando..." : "Registrar pedido"}
						</Button>
					</HeaderActionsPortal>
				)}
			</form.Subscribe>
		</form>
	);
}
