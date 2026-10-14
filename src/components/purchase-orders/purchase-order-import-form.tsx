import { parseDate } from "@internationalized/date";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	FileWarning,
	PackagePlus,
	Plus,
	RotateCcw,
	Upload,
	X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { HeaderActionsPortal } from "@/components/header-actions-context";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
import { formatCnpj } from "@/lib/cnpj";
import {
	checkNfeAlreadyImported,
	findSupplierByCnpj,
	normalizeWords,
	type ParsedNfe,
	parseNfeXml,
} from "@/lib/nfe";
import { DEFAULT_PRODUCT_CATEGORIES } from "@/lib/product-categories";
import {
	createProduct,
	getMargin,
	getPriceFromMargin,
	listProducts,
	productsQueryKey,
} from "@/lib/products";
import { computeChargesTotal } from "@/lib/purchase-order-totals";
import {
	createPurchaseOrder,
	purchaseOrdersQueryKey,
} from "@/lib/purchase-orders";
import { createStockMovement } from "@/lib/stock-movements";
import { listSuppliers, suppliersQueryKey } from "@/lib/suppliers";

function findMatchingProduct<T extends { id: string; name: string }>(
	itemName: string,
	products: T[],
): T | null {
	const itemWords = new Set(normalizeWords(itemName));
	let best: { product: T; score: number } | null = null;

	for (const product of products) {
		const productWords = normalizeWords(product.name);
		const score = productWords.filter((word) => itemWords.has(word)).length;
		if (score >= 2 && (!best || score > best.score)) {
			best = { product, score };
		}
	}

	return best?.product ?? null;
}

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

type DuplicateOrder = NonNullable<
	Awaited<ReturnType<typeof checkNfeAlreadyImported>>
>;

type PurchaseOrderImportFormProps = {
	onSuccess?: () => void;
};

export function PurchaseOrderImportForm({
	onSuccess,
}: PurchaseOrderImportFormProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isParsing, setIsParsing] = useState(false);
	const [parsed, setParsed] = useState<ParsedNfe | null>(null);
	const [rawXml, setRawXml] = useState("");
	const [matchedSupplierId, setMatchedSupplierId] = useState<string | null>(
		null,
	);
	const [duplicateOrder, setDuplicateOrder] = useState<DuplicateOrder | null>(
		null,
	);

	async function handleFile(file: File) {
		setIsParsing(true);
		setDuplicateOrder(null);
		try {
			const xml = await file.text();
			const result = await parseNfeXml({ data: { xml } });

			if (result.nfeKey) {
				const existing = await checkNfeAlreadyImported({
					data: { nfeKey: result.nfeKey },
				});
				if (existing) {
					setDuplicateOrder(existing);
					setIsParsing(false);
					return;
				}
			}

			let supplierId: string | null = null;
			if (result.supplier.cnpj) {
				const supplier = await findSupplierByCnpj({
					data: { cnpj: result.supplier.cnpj },
				});
				supplierId = supplier?.id ?? null;
			}

			setRawXml(xml);
			setMatchedSupplierId(supplierId);
			setParsed(result);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Não foi possível ler esse arquivo.",
			);
		} finally {
			setIsParsing(false);
		}
	}

	function reset() {
		setParsed(null);
		setRawXml("");
		setMatchedSupplierId(null);
		setDuplicateOrder(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}

	if (parsed) {
		return (
			<NfeReviewForm
				parsed={parsed}
				rawXml={rawXml}
				matchedSupplierId={matchedSupplierId}
				onCancel={reset}
				onSuccess={onSuccess}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 px-6 py-16 text-center">
				<span className="rounded-full border border-border/60 p-3">
					<Upload className="size-5 text-muted-foreground" />
				</span>
				<div>
					<p className="text-sm font-medium text-foreground">
						{isParsing
							? "Lendo o arquivo..."
							: "Envie o XML da nota ou do pedido"}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Aceita o XML da NFe ou o XML de pedido exportado pela loja. Vamos
						ler o fornecedor, os itens e os valores automaticamente. Você revisa
						tudo antes de confirmar.
					</p>
				</div>
				<input
					ref={fileInputRef}
					type="file"
					accept=".xml,text/xml"
					className="hidden"
					onChange={(event) => {
						const file = event.target.files?.[0];
						if (file) handleFile(file);
					}}
				/>
				<Button
					type="button"
					size="sm"
					disabled={isParsing}
					onClick={() => fileInputRef.current?.click()}
				>
					{isParsing ? "Lendo..." : "Escolher arquivo XML"}
				</Button>
			</div>

			{duplicateOrder ? (
				<div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-900/20">
					<FileWarning className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
					<div>
						<p className="font-medium text-foreground">
							Essa nota já foi importada
						</p>
						<p className="mt-1 text-muted-foreground">
							Já existe um pedido de {duplicateOrder.supplier.name} com essa
							nota fiscal.{" "}
							<Link
								to="/purchase-orders"
								className="font-medium text-primary hover:underline"
							>
								Ver pedidos
							</Link>
						</p>
					</div>
				</div>
			) : null}
		</div>
	);
}

type ReviewItem = {
	name: string;
	brand: string;
	quantity: number;
	baseUnitCost: number;
	unitCost: number;
	category: string;
	salePrice: number;
	margin: number;
	restockProductId: string | null;
};

type NfeReviewFormProps = {
	parsed: ParsedNfe;
	rawXml: string;
	matchedSupplierId: string | null;
	onCancel: () => void;
	onSuccess?: () => void;
};

function NfeReviewForm({
	parsed,
	rawXml,
	matchedSupplierId,
	onCancel,
	onSuccess,
}: NfeReviewFormProps) {
	const queryClient = useQueryClient();
	const [showNewSupplier, setShowNewSupplier] = useState(!matchedSupplierId);
	const [progress, setProgress] = useState<{
		current: number;
		total: number;
	} | null>(null);
	const [failedItems, setFailedItems] = useState<string[]>([]);

	const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery({
		queryKey: suppliersQueryKey,
		queryFn: () => listSuppliers(),
	});

	const { data: existingProducts = [] } = useQuery({
		queryKey: productsQueryKey,
		queryFn: () => listProducts(),
	});

	const categoryOptions = Array.from(
		new Set([
			...DEFAULT_PRODUCT_CATEGORIES,
			...existingProducts.map((product) => product.category),
		]),
	)
		.sort((a, b) => a.localeCompare(b))
		.map((category) => ({ id: category, label: category }));

	const supplierOptions = suppliers.map((supplier) => ({
		value: supplier.id,
		label: supplier.name,
	}));

	const initialCharges: Array<{
		name: string;
		kind: "percentage" | "fixed";
		value: number;
	}> = [
		...(parsed.freight > 0
			? [{ name: "Frete", kind: "fixed" as const, value: parsed.freight }]
			: []),
		...(parsed.taxesSummary.ipi > 0
			? [
					{
						name: "IPI",
						kind: "fixed" as const,
						value: parsed.taxesSummary.ipi,
					},
				]
			: []),
		...(parsed.taxesSummary.outros > 0
			? [
					{
						name: "Outras despesas",
						kind: "fixed" as const,
						value: parsed.taxesSummary.outros,
					},
				]
			: []),
	];

	const chargesTotal = computeChargesTotal(
		initialCharges,
		parsed.productsValue,
	);
	const usesItemIpi = parsed.items.some((item) => item.ipi !== null);
	const chargesToAllocate =
		chargesTotal - (usesItemIpi ? parsed.taxesSummary.ipi : 0);

	function getLandedUnitCost(item: ParsedNfe["items"][number]) {
		const thisValue = item.unitCost * item.quantity;
		const allocatedCharge =
			parsed.productsValue > 0
				? chargesToAllocate * (thisValue / parsed.productsValue)
				: 0;
		const itemIpi = item.ipi ?? 0;
		const landedUnitCost =
			item.quantity > 0
				? item.unitCost + (allocatedCharge + itemIpi) / item.quantity
				: item.unitCost;

		return Math.round(landedUnitCost * 100) / 100;
	}

	function buildNewProductItem(item: ParsedNfe["items"][number]): ReviewItem {
		const landedUnitCost = getLandedUnitCost(item);
		const salePrice =
			Math.round(getPriceFromMargin(landedUnitCost, 50) * 100) / 100;

		return {
			name: item.name,
			brand: item.brand ?? "",
			quantity: item.quantity,
			baseUnitCost: item.unitCost,
			unitCost: landedUnitCost,
			category: item.suggestedCategory ?? "",
			salePrice,
			margin: 50,
			restockProductId: null,
		};
	}

	const initialItems: ReviewItem[] = parsed.items.map((item) => {
		const match = findMatchingProduct(item.name, existingProducts);
		if (!match) return buildNewProductItem(item);

		const incomingLandedUnitCost = getLandedUnitCost(item);
		const existingQty = match.quantity;
		const existingCost = Number(match.unitCost);
		const totalQty = existingQty + item.quantity;
		const newAvgCost =
			totalQty > 0
				? (existingQty * existingCost +
						item.quantity * incomingLandedUnitCost) /
					totalQty
				: incomingLandedUnitCost;
		const existingMargin = getMargin(existingCost, Number(match.salePrice));
		const salePrice =
			Math.round(getPriceFromMargin(newAvgCost, existingMargin) * 100) / 100;

		return {
			name: item.name,
			brand: item.brand ?? "",
			quantity: item.quantity,
			baseUnitCost: item.unitCost,
			unitCost: incomingLandedUnitCost,
			category: match.category,
			salePrice,
			margin: Math.round(existingMargin * 10) / 10,
			restockProductId: match.id,
		};
	});

	const createOrderMutation = useMutation({ mutationFn: createPurchaseOrder });
	const createProductMutation = useMutation({ mutationFn: createProduct });
	const createMovementMutation = useMutation({
		mutationFn: createStockMovement,
	});

	const form = useForm({
		defaultValues: {
			supplierId: matchedSupplierId ?? "",
			orderDate: parseDate(parsed.orderDate),
			status: "pending" as "pending" | "in_transit" | "received" | "cancelled",
			notes: parsed.nfeKey
				? `Importado da NFe ${parsed.nfeKey}`
				: `Importado do pedido de ${parsed.supplier.name}`,
			charges: initialCharges,
			items: initialItems,
		},
		onSubmit: async ({ value }) => {
			if (value.items.length === 0) {
				toast.error("Inclua pelo menos um item pra importar o pedido.");
				return;
			}
			if (!value.supplierId) {
				toast.error("Selecione ou cadastre um fornecedor.");
				return;
			}

			const productsValue = value.items.reduce(
				(sum, item) => sum + item.baseUnitCost * item.quantity,
				0,
			);

			let order: Awaited<ReturnType<typeof createPurchaseOrder>>;
			try {
				order = await createOrderMutation.mutateAsync({
					data: {
						supplierId: value.supplierId,
						orderDate: value.orderDate.toString(),
						itemsCount: value.items.length,
						productsValue,
						status: value.status,
						notes: value.notes,
						charges: value.charges,
						sourceXml: rawXml,
						nfeKey: parsed.nfeKey ?? undefined,
					},
				});
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Não foi possível registrar o pedido.",
				);
				return;
			}

			setProgress({ current: 0, total: value.items.length });
			const failed: string[] = [];

			for (let i = 0; i < value.items.length; i++) {
				const item = value.items[i];
				try {
					if (item.restockProductId) {
						await createMovementMutation.mutateAsync({
							data: {
								productId: item.restockProductId,
								type: "entrada",
								value: item.quantity,
								date: value.orderDate.toString(),
								reason: "Reposição via importação de nota",
								unitCost: item.unitCost,
								purchaseOrderId: order.id,
								salePrice: item.salePrice,
							},
						});
					} else {
						await createProductMutation.mutateAsync({
							data: {
								name: item.name,
								brand: item.brand,
								category: item.category,
								unitCost: item.unitCost,
								salePrice: item.salePrice,
								initialQuantity: item.quantity,
								purchaseOrderId: order.id,
								status: "active",
							},
						});
					}
				} catch {
					failed.push(item.name);
				}
				setProgress({ current: i + 1, total: value.items.length });
			}

			queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
			queryClient.invalidateQueries({ queryKey: productsQueryKey });

			if (failed.length > 0) {
				setFailedItems(failed);
				toast.error(
					`Pedido criado, mas ${failed.length} item(ns) falharam. Você pode cadastrá-los manualmente vinculando a este pedido.`,
				);
			} else {
				toast.success("Pedido e produtos importados!");
				onSuccess?.();
			}
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
			<div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm">
				<span className="text-muted-foreground">
					Nota lida: {parsed.items.length} itens, valor total{" "}
					{currencyFormatter.format(parsed.productsValue)}
				</span>
				<button
					type="button"
					onClick={onCancel}
					className="text-xs font-medium text-muted-foreground hover:text-foreground"
				>
					Trocar arquivo
				</button>
			</div>

			<form.Field name="supplierId">
				{(field) => (
					<>
						<FieldRow
							label="Fornecedor"
							htmlFor={field.name}
							description={
								matchedSupplierId
									? "Identificado pelo CNPJ da nota. Pode trocar se não for o certo."
									: "Não encontramos um fornecedor com esse CNPJ — cadastre um novo abaixo."
							}
							required
						>
							{!showNewSupplier ? (
								<div className="flex items-center justify-end">
									<button
										type="button"
										onClick={() => setShowNewSupplier(true)}
										className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
									>
										<Plus className="size-3" />
										Novo fornecedor
									</button>
								</div>
							) : null}
							{isLoadingSuppliers ? (
								<Skeleton className="h-8 w-full" />
							) : !showNewSupplier ? (
								<Select
									placeholder="Selecione um fornecedor"
									value={field.state.value}
									onValueChange={(value) => field.handleChange(value as string)}
								>
									<SelectTrigger id={field.name}>
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
							) : null}
						</FieldRow>

						{showNewSupplier && (
							<div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-4">
								<SupplierForm
									standalone={false}
									defaultValues={{
										name: parsed.supplier.name,
										cnpj: parsed.supplier.cnpj
											? formatCnpj(parsed.supplier.cnpj)
											: "",
										phone: parsed.supplier.phone ?? "",
										location: parsed.supplier.location ?? "",
									}}
									onSuccess={(supplierId) => {
										field.handleChange(supplierId);
										setShowNewSupplier(false);
									}}
								/>
							</div>
						)}
					</>
				)}
			</form.Field>

			<FieldRowDivider />

			<form.Field name="orderDate">
				{(field) => (
					<FieldRow
						label="Data do pedido"
						description="Data de emissão da nota"
					>
						<Input
							value={field.state.value.toString()}
							readOnly
							className="max-w-[160px] bg-muted/40"
						/>
					</FieldRow>
				)}
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
						description="Frete já veio da nota. Adicione outras taxas se quiser."
						contentClassName="max-w-none"
					>
						<div className="flex items-center justify-end">
							<button
								type="button"
								onClick={() =>
									chargesField.pushValue({ name: "", kind: "fixed", value: 0 })
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
									<form.Field name={`charges[${index}].name`}>
										{(field) => (
											<Input
												placeholder="Ex: Frete, Alíquota"
												value={field.state.value}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
											/>
										)}
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
												<form.Field name={`charges[${index}].value`}>
													{(field) => (
														<div className="w-36">
															{kindField.state.value === "percentage" ? (
																<NumberField
																	minValue={0}
																	maxValue={100}
																	suffix="%"
																	value={field.state.value}
																	onChange={(value) =>
																		field.handleChange(value)
																	}
																/>
															) : (
																<CurrencyField
																	value={field.state.value}
																	onChange={(value) =>
																		field.handleChange(value)
																	}
																/>
															)}
														</div>
													)}
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
						{Object.values(parsed.taxesSummary).some((value) => value > 0) ? (
							<p className="text-xs text-muted-foreground">
								Impostos na nota (referência, não somados automaticamente): ICMS{" "}
								{currencyFormatter.format(parsed.taxesSummary.icms)} · IPI{" "}
								{currencyFormatter.format(parsed.taxesSummary.ipi)} · PIS{" "}
								{currencyFormatter.format(parsed.taxesSummary.pis)} · COFINS{" "}
								{currencyFormatter.format(parsed.taxesSummary.cofins)}
							</p>
						) : null}
					</FieldRow>
				)}
			</form.Field>

			<FieldRowDivider />

			<form.Field name="items" mode="array">
				{(itemsField) => (
					<FieldRow
						label="Itens"
						description="Confira nome, quantidade, custo e categoria de cada item. Itens que parecem já existir no estoque são marcados como reposição (soma no produto existente com custo médio recalculado); os demais viram produto novo, com preço já sugerido pela margem + frete ratado."
						contentClassName="max-w-none"
					>
						<div className="flex flex-col gap-3">
							{itemsField.state.value.map((_, index) => (
								<form.Field
									// biome-ignore lint/suspicious/noArrayIndexKey: item rows have no stable id before creation
									key={index}
									name={`items[${index}]`}
								>
									{(rowField) => {
										const row = rowField.state.value;
										const restockTarget = row.restockProductId
											? existingProducts.find(
													(product) => product.id === row.restockProductId,
												)
											: null;

										return (
											<div className="flex flex-col gap-2 rounded-md border border-border/60 p-2">
												{restockTarget ? (
													<div className="flex items-center justify-between">
														<Badge variant="secondary" className="gap-1.5">
															<PackagePlus className="size-3" />
															Reposição de "{restockTarget.name}"
														</Badge>
														<button
															type="button"
															onClick={() =>
																rowField.handleChange(
																	buildNewProductItem(parsed.items[index]),
																)
															}
															className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
														>
															<RotateCcw className="size-3" />
															Tratar como produto novo
														</button>
													</div>
												) : null}
												<div className="flex items-end gap-2">
													<div className="flex flex-1 flex-col gap-1">
														<span className="text-xs text-muted-foreground">
															Nome
														</span>
														<Input
															value={row.name}
															onChange={(event) =>
																rowField.handleChange({
																	...row,
																	name: event.target.value,
																})
															}
														/>
													</div>
													<div className="flex w-40 flex-col gap-1">
														<span className="text-xs text-muted-foreground">
															Marca
														</span>
														<Input
															placeholder="—"
															value={row.brand}
															onChange={(event) =>
																rowField.handleChange({
																	...row,
																	brand: event.target.value,
																})
															}
														/>
													</div>
													<button
														type="button"
														onClick={() => itemsField.removeValue(index)}
														aria-label="Remover item"
														className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground/60 outline-none transition-colors hover:text-destructive"
													>
														<X className="size-4" />
													</button>
												</div>

												<div className="grid grid-cols-[5rem_9rem_1fr_9rem_7rem] items-end gap-2">
													<div className="flex flex-col gap-1">
														<span className="text-xs text-muted-foreground">
															Qtd.
														</span>
														<NumberField
															minValue={0}
															value={row.quantity}
															onChange={(value) =>
																rowField.handleChange({
																	...row,
																	quantity: value,
																})
															}
														/>
													</div>
													<div className="flex flex-col gap-1">
														<span className="text-xs text-muted-foreground">
															Custo unit.
														</span>
														<CurrencyField
															value={row.unitCost}
															onChange={(value) =>
																rowField.handleChange({
																	...row,
																	unitCost: value,
																})
															}
														/>
													</div>
													<div className="flex flex-col gap-1">
														<span className="text-xs text-muted-foreground">
															Categoria
														</span>
														{restockTarget ? (
															<div className="flex h-8 items-center truncate rounded-sm border border-input bg-muted/40 px-2.5 text-sm text-muted-foreground">
																{row.category}
															</div>
														) : (
															<Combobox
																items={categoryOptions}
																placeholder="Categoria"
																value={row.category}
																onValueChange={(value) =>
																	rowField.handleChange({
																		...row,
																		category: value,
																	})
																}
															/>
														)}
													</div>
													<div className="flex flex-col gap-1">
														<span className="text-xs text-muted-foreground">
															Venda
														</span>
														<CurrencyField
															value={row.salePrice}
															onChange={(value) => {
																const margin =
																	row.unitCost > 0 && value > 0
																		? Math.round(
																				((value - row.unitCost) / value) * 1000,
																			) / 10
																		: row.margin;
																rowField.handleChange({
																	...row,
																	salePrice: value,
																	margin,
																});
															}}
														/>
													</div>
													<div className="flex flex-col gap-1">
														<span className="text-xs text-muted-foreground">
															Margem
														</span>
														<NumberField
															suffix="%"
															minValue={0}
															maxValue={99}
															value={row.margin}
															onChange={(value) => {
																const salePrice =
																	row.unitCost > 0
																		? Math.round(
																				getPriceFromMargin(
																					row.unitCost,
																					value,
																				) * 100,
																			) / 100
																		: row.salePrice;
																rowField.handleChange({
																	...row,
																	margin: value,
																	salePrice,
																});
															}}
														/>
													</div>
												</div>
											</div>
										);
									}}
								</form.Field>
							))}
						</div>
					</FieldRow>
				)}
			</form.Field>

			<FieldRowDivider />

			<form.Field name="notes">
				{(field) => (
					<FieldRow
						label="Observações"
						htmlFor={field.name}
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

			<form.Subscribe selector={(state) => state.values.items}>
				{(items) => {
					const total = items.reduce(
						(sum, item) => sum + item.baseUnitCost * item.quantity,
						0,
					);
					const restockCount = items.filter(
						(item) => item.restockProductId,
					).length;
					return (
						<div className="grid grid-cols-3 items-center gap-8">
							<span className="text-sm font-medium text-foreground">
								{items.length} item(ns) a importar
								{restockCount > 0
									? ` (${restockCount} reposição${restockCount > 1 ? "ões" : ""}, ${items.length - restockCount} novo(s))`
									: ""}
							</span>
							<span className="col-span-2 font-mono text-lg font-semibold tabular-nums text-foreground">
								{currencyFormatter.format(total)}
							</span>
						</div>
					);
				}}
			</form.Subscribe>

			{progress ? (
				<p className="text-sm text-muted-foreground">
					Cadastrando produtos... {progress.current}/{progress.total}
				</p>
			) : null}

			{failedItems.length > 0 ? (
				<div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
					Não foi possível cadastrar: {failedItems.join(", ")}. O pedido foi
					criado — cadastre esses itens manualmente vinculando a ele.
				</div>
			) : null}

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
							{isSubmitting ? "Importando..." : "Confirmar importação"}
						</Button>
					</HeaderActionsPortal>
				)}
			</form.Subscribe>
		</form>
	);
}
