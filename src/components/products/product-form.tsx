import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { HeaderActionsPortal } from "@/components/header-actions-context";
import { StockMovementForm } from "@/components/products/stock-movement-form";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxSelect } from "@/components/ui/combobox";
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
import { useTiktokCommission } from "@/hooks/use-tiktok-commission";
import { DEFAULT_PRODUCT_CATEGORIES } from "@/lib/product-categories";
import type { getProduct } from "@/lib/products";
import {
	createProduct,
	getMargin,
	getPriceFromMargin,
	listProducts,
	productQueryKey,
	productsQueryKey,
	updateProduct,
} from "@/lib/products";
import { computeChargesTotal } from "@/lib/purchase-order-totals";
import {
	listPurchaseOrders,
	purchaseOrdersQueryKey,
} from "@/lib/purchase-orders";

const STATUS_OPTIONS = [
	{ value: "active", label: "Ativo" },
	{ value: "inactive", label: "Inativo" },
];

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

type Product = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

type ProductFormProps = {
	onSuccess?: () => void;
	product?: Product;
};

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function readImageAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
		reader.readAsDataURL(file);
	});
}

async function createImageThumbnail(file: File): Promise<string> {
	const sourceUrl = URL.createObjectURL(file);

	try {
		const image = await new Promise<HTMLImageElement>((resolve, reject) => {
			const element = new Image();
			element.onload = () => resolve(element);
			element.onerror = () =>
				reject(new Error("Não foi possível processar a imagem."));
			element.src = sourceUrl;
		});
		const maxSide = 160;
		const scale = Math.min(
			1,
			maxSide / Math.max(image.naturalWidth, image.naturalHeight),
		);
		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
		canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
		canvas
			.getContext("2d")
			?.drawImage(image, 0, 0, canvas.width, canvas.height);

		return canvas.toDataURL("image/webp", 0.72);
	} finally {
		URL.revokeObjectURL(sourceUrl);
	}
}

export function ProductForm({ onSuccess, product }: ProductFormProps) {
	const mode = product ? "edit" : "create";
	const queryClient = useQueryClient();
	const [salePriceTouched, setSalePriceTouched] = useState(mode === "edit");
	const [restockProductId, setRestockProductId] = useState("");
	const imageInputRef = useRef<HTMLInputElement>(null);
	const { commission } = useTiktokCommission();

	const { data: purchaseOrders = [], isLoading: isLoadingOrders } = useQuery({
		queryKey: purchaseOrdersQueryKey,
		queryFn: () => listPurchaseOrders(),
	});

	const { data: existingProducts = [] } = useQuery({
		queryKey: productsQueryKey,
		queryFn: () => listProducts(),
	});

	const restockTarget =
		mode === "create"
			? (existingProducts.find((item) => item.id === restockProductId) ?? null)
			: null;

	const restockOptions = [...existingProducts].sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	const purchaseOrderOptions = purchaseOrders.map((order) => ({
		value: order.id,
		label: `${order.supplier.name} — ${dateFormatter.format(new Date(order.orderDate))}`,
	}));

	const categoryOptions = Array.from(
		new Set([
			...DEFAULT_PRODUCT_CATEGORIES,
			...existingProducts.map((product) => product.category),
		]),
	)
		.sort((a, b) => a.localeCompare(b))
		.map((category) => ({ id: category, label: category }));

	const createMutation = useMutation({
		mutationFn: createProduct,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: productsQueryKey });
			toast.success("Produto cadastrado!");
			form.reset();
			setSalePriceTouched(false);
			onSuccess?.();
		},
		onError: (error) => {
			toast.error(error.message || "Não foi possível cadastrar o produto.");
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateProduct,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: productsQueryKey });
			if (product) {
				queryClient.invalidateQueries({
					queryKey: productQueryKey(product.id),
				});
			}
			toast.success("Produto atualizado!");
			onSuccess?.();
		},
		onError: (error) => {
			toast.error(error.message || "Não foi possível atualizar o produto.");
		},
	});

	const defaultUnitCost = product ? Number(product.unitCost) : 0;
	const defaultSalePrice = product ? Number(product.salePrice) : 0;

	const form = useForm({
		defaultValues: {
			name: product?.name ?? "",
			brand: product?.brand ?? "",
			category: product?.category ?? "",
			unitCost: defaultUnitCost,
			salePrice: defaultSalePrice,
			margin: product
				? Math.round(getMargin(defaultUnitCost, defaultSalePrice) * 10) / 10
				: 50,
			tiktokPrice: product
				? Math.round(defaultSalePrice * (1 + commission / 100) * 100) / 100
				: 0,
			initialQuantity: product?.receivedQuantity ?? 0,
			purchaseOrderId: product?.purchaseOrderId ?? "",
			photoUrl: product?.photoUrl ?? "",
			photoThumbnailUrl: product?.photoThumbnailUrl ?? "",
			saleLink: product?.saleLink ?? "",
			status: product?.status ?? ("active" as "active" | "inactive"),
			notes: product?.notes ?? "",
		},
		onSubmit: async ({ value }) => {
			if (product) {
				await updateMutation.mutateAsync({
					data: { ...value, id: product.id },
				});
			} else {
				await createMutation.mutateAsync({ data: value });
			}
		},
	});

	const [unitCost, initialQuantity, purchaseOrderId] = useStore(
		form.store,
		(state) => [
			state.values.unitCost,
			state.values.initialQuantity,
			state.values.purchaseOrderId,
		],
	);

	const pricing = useMemo(() => {
		if (!unitCost || unitCost <= 0) return null;

		const order = purchaseOrders.find((item) => item.id === purchaseOrderId);
		if (!order) {
			return {
				freightPerUnit: 0,
				suggestedPrice: getPriceFromMargin(unitCost, 50),
			};
		}

		const orderCharges = computeChargesTotal(
			order.charges,
			Number(order.productsValue),
		);
		const thisValue = unitCost * initialQuantity;
		const totalValue = Number(order.productsValue);
		const freightShare =
			totalValue > 0 ? orderCharges * (thisValue / totalValue) : 0;
		const freightPerUnit =
			initialQuantity > 0 ? freightShare / initialQuantity : 0;

		return {
			freightPerUnit,
			suggestedPrice: getPriceFromMargin(unitCost + freightPerUnit, 50),
		};
	}, [unitCost, initialQuantity, purchaseOrderId, purchaseOrders]);

	useEffect(() => {
		if (!salePriceTouched && pricing) {
			const price = Math.round(pricing.suggestedPrice * 100) / 100;
			form.setFieldValue("salePrice", price);
			form.setFieldValue(
				"tiktokPrice",
				Math.round(price * (1 + commission / 100) * 100) / 100,
			);
		}
	}, [pricing, salePriceTouched, commission, form.setFieldValue]);

	const restockPicker = (
		<>
			<FieldRow
				label="Reposição de produto existente"
				description="Se essa entrada for reposição de um produto já cadastrado, procure e selecione ele aqui — vamos calcular o novo custo médio automaticamente em vez de duplicar o cadastro."
				contentClassName="max-w-lg"
			>
				<div className="flex items-center gap-2">
					<ComboboxSelect
						placeholder="Buscar produto por nome ou SKU..."
						items={restockOptions.map((option) => ({
							id: option.id,
							label: option.name,
							description: option.sku,
						}))}
						value={restockProductId}
						onValueChange={setRestockProductId}
						className="flex-1"
					/>
					{restockProductId ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setRestockProductId("")}
						>
							Cancelar
						</Button>
					) : null}
				</div>
			</FieldRow>

			<FieldRowDivider />
		</>
	);

	if (restockTarget) {
		return (
			<div className="flex flex-col gap-6">
				{restockPicker}
				<StockMovementForm
					productId={restockTarget.id}
					product={restockTarget}
					onSuccess={onSuccess}
				/>
			</div>
		);
	}

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
			{mode === "create" ? restockPicker : null}

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
							description={
								mode === "edit"
									? `SKU: ${product?.sku} (gerado automaticamente, não muda)`
									: "Nome do produto como vai aparecer na listagem. O código/SKU é gerado automaticamente."
							}
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

			<form.Field name="brand">
				{(field) => (
					<FieldRow
						label="Marca"
						htmlFor={field.name}
						description="Marca/fabricante do produto, se houver"
					>
						<Input
							id={field.name}
							placeholder="Ex: SKYPAPER"
							value={field.state.value}
							onChange={(event) => field.handleChange(event.target.value)}
						/>
					</FieldRow>
				)}
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
							description="Agrupamento usado no filtro da listagem e na geração do código. Escolha uma existente ou digite uma nova."
							required
						>
							<Combobox
								id={field.name}
								items={categoryOptions}
								placeholder="Ex: Borracha Decorada"
								value={field.state.value}
								onValueChange={(value) => field.handleChange(value)}
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

			{mode === "create" ? (
				<form.Field name="initialQuantity">
					{(field) => (
						<FieldRow
							label="Quantidade inicial"
							htmlFor={field.name}
							description="Se preenchido, já registra uma entrada de estoque com esse valor. Também é usada para ratear o frete do pedido entre os produtos."
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
			) : (
				<FieldRow
					label="Quantidade atual"
					description="Para mudar o estoque, use 'Nova movimentação' na página do produto — editar aqui não altera a quantidade."
				>
					<p className="flex h-8 items-center text-sm font-medium text-foreground">
						{product?.quantity} un.
					</p>
				</FieldRow>
			)}

			<FieldRowDivider />

			<form.Field name="purchaseOrderId">
				{(field) => (
					<FieldRow
						label="Fornecedor/Pedido de compra"
						htmlFor={field.name}
						description="De qual pedido este produto veio. Usado também pra ratear o frete e as taxas do pedido proporcionalmente ao valor de cada produto (custo × quantidade recebida)."
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
				name="salePrice"
				validators={{
					onBlur: ({ value }) =>
						!value || value <= 0 ? "Informe o preço de venda" : undefined,
				}}
			>
				{(priceField) => {
					const hasError =
						priceField.state.meta.isTouched && !priceField.state.meta.isValid;
					const costWithFreight = unitCost + (pricing?.freightPerUnit ?? 0);
					const commissionDivisor = 1 + commission / 100;

					function applyFromSalePrice(value: number) {
						priceField.handleChange(value);
						setSalePriceTouched(true);
						if (value > 0) {
							form.setFieldValue(
								"margin",
								Math.round(getMargin(costWithFreight, value) * 10) / 10,
							);
							form.setFieldValue(
								"tiktokPrice",
								Math.round(value * commissionDivisor * 100) / 100,
							);
						}
					}

					function applyFromMargin(value: number) {
						setSalePriceTouched(true);
						if (costWithFreight <= 0) return;
						const newPrice =
							Math.round(getPriceFromMargin(costWithFreight, value) * 100) /
							100;
						form.setFieldValue("salePrice", newPrice);
						form.setFieldValue(
							"tiktokPrice",
							Math.round(newPrice * commissionDivisor * 100) / 100,
						);
					}

					function applyFromTiktokPrice(value: number) {
						setSalePriceTouched(true);
						if (value <= 0) return;
						const newSalePrice =
							Math.round((value / commissionDivisor) * 100) / 100;
						form.setFieldValue("salePrice", newSalePrice);
						form.setFieldValue(
							"margin",
							Math.round(getMargin(costWithFreight, newSalePrice) * 10) / 10,
						);
					}

					return (
						<FieldRow
							label="Preço de venda, margem e TikTok"
							htmlFor={priceField.name}
							description={`Ligados: mude o preço, a margem ou o preço no TikTok (comissão de ${commission}%) que os outros recalculam sozinhos. Sugerido com 50% de margem sobre o custo já com o rateio do frete/taxas — ajuste livremente.`}
							contentClassName="max-w-xl"
							required
						>
							<div className="flex gap-2">
								<div className="flex-1">
									<span className="mb-1 block text-xs text-muted-foreground">
										Venda
									</span>
									<CurrencyField
										id={priceField.name}
										value={priceField.state.value}
										onChange={applyFromSalePrice}
										onBlur={priceField.handleBlur}
										invalid={hasError}
									/>
								</div>
								<form.Field name="margin">
									{(marginField) => (
										<div className="w-32">
											<span className="mb-1 block text-xs text-muted-foreground">
												Margem
											</span>
											<NumberField
												aria-label="Margem"
												suffix="%"
												minValue={0}
												maxValue={99}
												value={marginField.state.value}
												onChange={(value) => {
													marginField.handleChange(value);
													applyFromMargin(value);
												}}
											/>
										</div>
									)}
								</form.Field>
								<form.Field name="tiktokPrice">
									{(tiktokField) => (
										<div className="flex-1">
											<span className="mb-1 block text-xs text-muted-foreground">
												TikTok
											</span>
											<CurrencyField
												aria-label="Preço no TikTok Shop"
												value={tiktokField.state.value}
												onChange={(value) => {
													tiktokField.handleChange(value);
													applyFromTiktokPrice(value);
												}}
											/>
										</div>
									)}
								</form.Field>
							</div>
							{hasError ? (
								<FieldError
									errors={priceField.state.meta.errors.map((message) => ({
										message,
									}))}
								/>
							) : null}
							{pricing && pricing.freightPerUnit > 0 ? (
								<p className="text-xs text-muted-foreground">
									Frete/taxas ratados:{" "}
									{currencyFormatter.format(pricing.freightPerUnit)}
									/un.
								</p>
							) : null}
						</FieldRow>
					);
				}}
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
							label="Imagem do produto"
							htmlFor={field.name}
							description="Envie JPG, PNG ou WebP de até 2 MB. Você também pode usar um link."
						>
							<div className="flex items-start gap-3">
								{field.state.value ? (
									<div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/40">
										<img
											src={field.state.value}
											alt="Prévia da imagem do produto"
											className="size-full object-cover"
										/>
									</div>
								) : (
									<div className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground">
										<ImagePlus className="size-4" />
									</div>
								)}

								<div className="min-w-0 flex-1 space-y-2">
									<div className="flex items-center gap-2">
										<Input
											ref={imageInputRef}
											id={field.name}
											type="file"
											accept="image/jpeg,image/png,image/webp"
											className="min-w-0 flex-1"
											onChange={async (event) => {
												const file = event.target.files?.[0];
												if (!file) return;
												if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
													toast.error("Use uma imagem JPG, PNG ou WebP.");
													event.target.value = "";
													return;
												}
												if (file.size > MAX_IMAGE_SIZE) {
													toast.error("A imagem deve ter no máximo 2 MB.");
													event.target.value = "";
													return;
												}
												try {
													const [photoUrl, photoThumbnailUrl] =
														await Promise.all([
															readImageAsDataUrl(file),
															createImageThumbnail(file),
														]);
													field.handleChange(photoUrl);
													form.setFieldValue(
														"photoThumbnailUrl",
														photoThumbnailUrl,
													);
												} catch (error) {
													toast.error(
														error instanceof Error
															? error.message
															: "Não foi possível adicionar a imagem.",
													);
												}
											}}
										/>
										{field.state.value ? (
											<Button
												type="button"
												variant="ghost"
												size="icon"
												aria-label="Remover imagem"
												onClick={() => {
													field.handleChange("");
													form.setFieldValue("photoThumbnailUrl", "");
													if (imageInputRef.current)
														imageInputRef.current.value = "";
												}}
											>
												<X className="size-4" />
											</Button>
										) : null}
									</div>
									<Input
										placeholder="Ou cole o link da imagem: https://..."
										value={
											field.state.value.startsWith("data:")
												? ""
												: field.state.value
										}
										onBlur={field.handleBlur}
										onChange={(event) => {
											field.handleChange(event.target.value);
											form.setFieldValue(
												"photoThumbnailUrl",
												event.target.value,
											);
										}}
										aria-invalid={hasError}
									/>
								</div>
							</div>
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
							{isSubmitting
								? "Salvando..."
								: mode === "edit"
									? "Salvar alterações"
									: "Cadastrar produto"}
						</Button>
					</HeaderActionsPortal>
				)}
			</form.Subscribe>
		</form>
	);
}
