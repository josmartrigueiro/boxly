import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { HeaderActionsPortal } from "@/components/header-actions-context";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { createProduct, productsQueryKey } from "@/lib/products";
import {
	listPurchaseOrders,
	purchaseOrdersQueryKey,
} from "@/lib/purchase-orders";

const STATUS_OPTIONS = [
	{ value: "active", label: "Ativo" },
	{ value: "inactive", label: "Inativo" },
];

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

type ProductFormProps = {
	onSuccess?: () => void;
};

export function ProductForm({ onSuccess }: ProductFormProps) {
	const queryClient = useQueryClient();

	const { data: purchaseOrders = [], isLoading: isLoadingOrders } = useQuery({
		queryKey: purchaseOrdersQueryKey,
		queryFn: () => listPurchaseOrders(),
	});

	const purchaseOrderOptions = purchaseOrders.map((order) => ({
		value: order.id,
		label: `${order.supplier.name} — ${dateFormatter.format(new Date(order.orderDate))}`,
	}));

	const mutation = useMutation({
		mutationFn: createProduct,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: productsQueryKey });
			toast.success("Produto cadastrado!");
			form.reset();
			onSuccess?.();
		},
		onError: (error) => {
			toast.error(error.message || "Não foi possível cadastrar o produto.");
		},
	});

	const form = useForm({
		defaultValues: {
			sku: "",
			name: "",
			category: "",
			unitCost: 0,
			salePrice: 0,
			initialQuantity: 0,
			purchaseOrderId: "",
			photoUrl: "",
			saleLink: "",
			status: "active" as "active" | "inactive",
			notes: "",
		},
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync({ data: value });
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
				name="sku"
				validators={{
					onBlur: ({ value }) => (!value ? "Informe o código/SKU" : undefined),
				}}
			>
				{(field) => {
					const hasError =
						field.state.meta.isTouched && !field.state.meta.isValid;
					return (
						<FieldRow
							label="Código/SKU"
							htmlFor={field.name}
							description="Identificador único do produto, usado em toda a listagem"
							required
						>
							<Input
								id={field.name}
								placeholder="Ex: P266"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={hasError}
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
				name="name"
				validators={{
					onBlur: ({ value }) =>
						!value ? "Informe o nome do produto" : undefined,
				}}
			>
				{(field) => {
					const hasError =
						field.state.meta.isTouched && !field.state.meta.isValid;
					return (
						<FieldRow
							label="Nome"
							htmlFor={field.name}
							description="Nome do produto como vai aparecer na listagem"
							required
						>
							<Input
								id={field.name}
								placeholder="Ex: Borracha Shine"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={hasError}
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
				name="category"
				validators={{
					onBlur: ({ value }) =>
						!value ? "Informe a categoria/linha" : undefined,
				}}
			>
				{(field) => {
					const hasError =
						field.state.meta.isTouched && !field.state.meta.isValid;
					return (
						<FieldRow
							label="Categoria/Linha"
							htmlFor={field.name}
							description="Agrupamento usado no filtro da listagem"
							required
						>
							<Input
								id={field.name}
								placeholder="Ex: Borracha Decorada"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={hasError}
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
				name="unitCost"
				validators={{
					onBlur: ({ value }) =>
						!value || value <= 0 ? "Informe o custo unitário" : undefined,
				}}
			>
				{(field) => {
					const hasError =
						field.state.meta.isTouched && !field.state.meta.isValid;
					return (
						<FieldRow
							label="Custo unitário"
							htmlFor={field.name}
							description="Quanto você paga por unidade deste produto"
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

			<form.Field
				name="salePrice"
				validators={{
					onBlur: ({ value }) =>
						!value || value <= 0 ? "Informe o preço de venda" : undefined,
				}}
			>
				{(field) => {
					const hasError =
						field.state.meta.isTouched && !field.state.meta.isValid;
					return (
						<FieldRow
							label="Preço de venda"
							htmlFor={field.name}
							description="Preço final cobrado do cliente"
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

			<form.Field name="initialQuantity">
				{(field) => (
					<FieldRow
						label="Quantidade inicial"
						htmlFor={field.name}
						description="Se preenchido, já registra uma entrada de estoque com esse valor"
					>
						<NumberField
							id={field.name}
							minValue={0}
							value={field.state.value}
							onChange={(value) => field.handleChange(value)}
						/>
					</FieldRow>
				)}
			</form.Field>

			<FieldRowDivider />

			<form.Field name="purchaseOrderId">
				{(field) => (
					<FieldRow
						label="Fornecedor/Pedido de compra"
						htmlFor={field.name}
						description="De qual pedido este produto veio, se aplicável"
					>
						{isLoadingOrders ? (
							<Skeleton className="h-8 w-full" />
						) : (
							<Select
								placeholder="Nenhum vínculo"
								value={field.state.value}
								onValueChange={(value) => field.handleChange(value as string)}
							>
								<SelectTrigger id={field.name}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{purchaseOrderOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</FieldRow>
				)}
			</form.Field>

			<FieldRowDivider />

			<form.Field
				name="photoUrl"
				validators={{
					onBlur: ({ value }) => {
						if (!value) return undefined;
						try {
							new URL(value);
							return undefined;
						} catch {
							return "URL inválida";
						}
					},
				}}
			>
				{(field) => {
					const hasError =
						field.state.meta.isTouched && !field.state.meta.isValid;
					return (
						<FieldRow
							label="Foto do produto"
							htmlFor={field.name}
							description="Link de uma imagem do produto (upload de arquivo ainda não disponível)"
						>
							<Input
								id={field.name}
								placeholder="https://..."
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={hasError}
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
				name="saleLink"
				validators={{
					onBlur: ({ value }) => {
						if (!value) return undefined;
						try {
							new URL(value);
							return undefined;
						} catch {
							return "URL inválida";
						}
					},
				}}
			>
				{(field) => {
					const hasError =
						field.state.meta.isTouched && !field.state.meta.isValid;
					return (
						<FieldRow
							label="Link de venda"
							htmlFor={field.name}
							description="Link do anúncio, se houver (TikTok Shop, Instagram Shop, etc.)"
						>
							<Input
								id={field.name}
								placeholder="https://..."
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={hasError}
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
						description="Produtos inativos ficam fora da listagem padrão"
					>
						<Select
							value={field.state.value}
							onValueChange={(value) =>
								field.handleChange(value as "active" | "inactive")
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

			<form.Field name="notes">
				{(field) => (
					<FieldRow
						label="Observações"
						htmlFor={field.name}
						description="Qualquer detalhe adicional sobre este produto"
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
							{isSubmitting ? "Salvando..." : "Cadastrar produto"}
						</Button>
					</HeaderActionsPortal>
				)}
			</form.Subscribe>
		</form>
	);
}
