import { getLocalTimeZone, today } from "@internationalized/date";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Camera,
	CircleCheck,
	Clock3,
	Loader2,
	MessageCircle,
	Music2,
	ShoppingBasket,
	Trash2,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { HeaderActionsPortal } from "@/components/header-actions-context";
import { ProductImagePreview } from "@/components/products/product-image-preview";
import { Button } from "@/components/ui/button";

import { Checkbox } from "@/components/ui/checkbox";
import { ComboboxSelect } from "@/components/ui/combobox";
import { DateField } from "@/components/ui/date-field";
import { FieldRow, FieldRowDivider } from "@/components/ui/field-row";
import { Input } from "@/components/ui/input";
import { CurrencyField, NumberField } from "@/components/ui/number-field";
import { Textarea } from "@/components/ui/textarea";
import { useTiktokCommission } from "@/hooks/use-tiktok-commission";
import { listProducts, productsQueryKey } from "@/lib/products";
import { createSalesOrder, salesOrdersQueryKey } from "@/lib/sales-orders";
import { cn } from "@/lib/utils";

type SalesChannel = "tiktok" | "whatsapp" | "instagram";
type SalesDiscountType = "percentage" | "fixed";

const CHANNEL_OPTIONS: Array<{
	value: SalesChannel;
	label: string;
	icon: typeof Music2;
}> = [
	{ value: "tiktok", label: "TikTok", icon: Music2 },
	{ value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
	{ value: "instagram", label: "Instagram", icon: Camera },
];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

type CartItem = {
	productId: string;
	productName: string;
	sku: string;
	availableStock: number;
	photoUrl: string | null;
	basePrice: number;
	quantity: number;
	unitPrice: number;
	priceTouched: boolean;
	checked: boolean;
};

function suggestPrice(
	basePrice: number,
	channel: SalesChannel,
	commission: number,
) {
	if (channel === "tiktok") {
		return Math.round(basePrice * (1 + commission / 100) * 100) / 100;
	}
	return Math.round(basePrice * 100) / 100;
}

function getDiscountAmount(
	subtotal: number,
	type: SalesDiscountType,
	value: number,
) {
	const amount = type === "percentage" ? subtotal * (value / 100) : value;
	return Math.min(subtotal, Math.max(0, amount));
}

/**
 * Presentational only: pulses when its `total` prop changes, so quantity
 * or price edits on a cart row feel acknowledged. Does not read or write
 * any form state itself.
 */
function LineTotalCell({ total }: { total: number }) {
	const [pulseKey, setPulseKey] = useState(0);
	const previousTotal = useRef(total);

	useEffect(() => {
		if (previousTotal.current !== total) {
			previousTotal.current = total;
			setPulseKey((key) => key + 1);
		}
	}, [total]);

	return (
		<span
			key={pulseKey}
			className={cn(
				"text-end font-mono text-sm font-medium tabular-nums text-foreground",
				pulseKey > 0 && "motion-safe:animate-pulse-once",
			)}
		>
			{currencyFormatter.format(total)}
		</span>
	);
}

/**
 * Presentational only: pulses the grand total when it changes, same
 * pattern as `LineTotalCell`.
 */
function GrandTotalAmount({ total }: { total: number }) {
	const [pulseKey, setPulseKey] = useState(0);
	const previousTotal = useRef(total);

	useEffect(() => {
		if (previousTotal.current !== total) {
			previousTotal.current = total;
			setPulseKey((key) => key + 1);
		}
	}, [total]);

	return (
		<span
			key={pulseKey}
			className={cn(
				"font-mono text-lg font-semibold tabular-nums text-foreground",
				pulseKey > 0 && "motion-safe:animate-pulse-once",
			)}
		>
			{currencyFormatter.format(total)}
		</span>
	);
}

type SalesOrderFormProps = {
	onSuccess?: () => void;
};

export function SalesOrderForm({ onSuccess }: SalesOrderFormProps) {
	const queryClient = useQueryClient();
	const { commission } = useTiktokCommission();
	const [pickerValue, setPickerValue] = useState("");
	const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

	const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
	const [indicator, setIndicator] = useState({ left: 0, width: 0 });

	// Purely presentational: a brief flash on the row that was just
	// added to (or bumped in) the cart, so the add feels acknowledged.
	const searchContainerRef = useRef<HTMLDivElement>(null);
	const [flashRow, setFlashRow] = useState<{
		productId: string;
		nonce: number;
	} | null>(null);
	const flashTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	function triggerRowFlash(productId: string) {
		clearTimeout(flashTimeoutRef.current);
		setFlashRow((prev) => ({
			productId,
			nonce: prev?.productId === productId ? prev.nonce + 1 : 0,
		}));
		flashTimeoutRef.current = setTimeout(() => {
			setFlashRow(null);
		}, 700);
	}

	// Purely presentational: highlights unit prices that were just
	// auto-recomputed by a channel switch (never the manually-edited ones).
	const [recomputedIds, setRecomputedIds] = useState<Set<string>>(new Set());
	const recomputeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	// Purely presentational: a brief success pulse on the submit button
	// once the sale is registered.
	const [justSucceeded, setJustSucceeded] = useState(false);

	const { data: allProducts = [] } = useQuery({
		queryKey: productsQueryKey,
		queryFn: () => listProducts(),
	});

	const productOptions = [...allProducts]
		.filter((product) => product.status === "active" && product.quantity > 0)
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((product) => ({
			id: product.id,
			label: product.name,
			description: product.sku,
		}));

	const mutation = useMutation({
		mutationFn: createSalesOrder,
		onSuccess: ({ failedItems }) => {
			queryClient.invalidateQueries({ queryKey: salesOrdersQueryKey });
			queryClient.invalidateQueries({ queryKey: productsQueryKey });
			if (failedItems.length > 0) {
				toast.warning(
					`Venda registrada, mas sem baixa de estoque para: ${failedItems
						.map((item) => item.productName)
						.join(", ")}.`,
				);
			} else {
				toast.success("Venda registrada!");
			}
			setJustSucceeded(true);
			form.reset();
			// Give the success pulse a moment to actually be seen before we
			// navigate away (onSuccess typically redirects to /sales).
			window.setTimeout(() => {
				setJustSucceeded(false);
				onSuccess?.();
			}, 550);
		},
		onError: (error) => {
			toast.error(error.message || "Não foi possível registrar a venda.");
		},
	});

	const form = useForm({
		defaultValues: {
			channel: "tiktok" as SalesChannel,
			customerName: "",
			orderDate: today(getLocalTimeZone()),
			discountType: "percentage" as SalesDiscountType,
			discountValue: 0,
			notes: "",
			items: [] as CartItem[],
		},
		onSubmit: async ({ value }) => {
			if (value.items.length === 0) {
				toast.error("Adicione ao menos um produto à cesta antes de finalizar.");
				return;
			}
			const uncheckedItems = value.items.filter((item) => !item.checked);
			if (uncheckedItems.length > 0) {
				toast.error(
					`Confira ${uncheckedItems.length} ${uncheckedItems.length === 1 ? "item" : "itens"} antes de finalizar a venda.`,
				);
				return;
			}
			await mutation.mutateAsync({
				data: {
					channel: value.channel,
					customerName: value.customerName,
					orderDate: value.orderDate.toString(),
					discountType: value.discountValue > 0 ? value.discountType : null,
					discountValue: value.discountValue,
					notes: value.notes,
					items: value.items.map((item) => ({
						productId: item.productId,
						productName: item.productName,
						quantity: item.quantity,
						unitPrice: item.unitPrice,
					})),
				},
			});
		},
	});

	const channel = useStore(form.store, (state) => state.values.channel);

	function setItemChecked(productId: string, checked: boolean) {
		form.setFieldValue(
			"items",
			form.state.values.items.map((item) =>
				item.productId === productId ? { ...item, checked } : item,
			),
		);
	}

	function setAllItemsChecked(checked: boolean) {
		form.setFieldValue(
			"items",
			form.state.values.items.map((item) => ({ ...item, checked })),
		);
	}

	useLayoutEffect(() => {
		const activeButton = buttonRefs.current[channel];
		if (!activeButton) return;
		setIndicator({
			left: activeButton.offsetLeft,
			width: activeButton.offsetWidth,
		});
	}, [channel]);

	useEffect(() => {
		return () => {
			clearTimeout(flashTimeoutRef.current);
			clearTimeout(recomputeTimeoutRef.current);
		};
	}, []);

	function handleChannelChange(nextChannel: SalesChannel) {
		form.setFieldValue("channel", nextChannel);
		const currentItems = form.state.values.items;
		const recomputed = new Set<string>();
		form.setFieldValue(
			"items",
			currentItems.map((item) => {
				if (item.priceTouched) return item;
				recomputed.add(item.productId);
				return {
					...item,
					unitPrice: suggestPrice(item.basePrice, nextChannel, commission),
					checked: false,
				};
			}),
		);
		if (recomputed.size > 0) {
			clearTimeout(recomputeTimeoutRef.current);
			setRecomputedIds(recomputed);
			recomputeTimeoutRef.current = setTimeout(() => {
				setRecomputedIds(new Set());
			}, 700);
		}
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
			<FieldRow
				label="Canal de venda"
				description="Define o preço sugerido de cada item. No TikTok, o preço já inclui a comissão configurada."
				contentClassName="max-w-fit"
			>
				<div className="relative inline-flex w-fit items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
					<div
						aria-hidden
						className="absolute inset-y-1 left-0 rounded-md bg-primary shadow-[inset_0_1px_0_oklch(1_0_0_/_0.2),_0_0_0_1px_color-mix(in_oklch,_var(--color-primary)_60%,_black),_0_0.3px_0.4px_oklch(0.12_0.13_0.12_/_0.02),_0_0.9px_1.5px_oklch(0.12_0.13_0.12_/_0.045),_0_3.5px_6px_oklch(0.12_0.13_0.12_/_0.09)] transition-[transform,width] duration-300 ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none"
						style={{
							width: indicator.width,
							transform: `translateX(${indicator.left}px)`,
						}}
					/>
					{CHANNEL_OPTIONS.map((option) => (
						<button
							key={option.value}
							ref={(el) => {
								buttonRefs.current[option.value] = el;
							}}
							type="button"
							onClick={() => handleChannelChange(option.value)}
							className={cn(
								"relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-[color,transform] duration-150 ease-out active:scale-[0.96] motion-reduce:active:scale-100",
								channel === option.value
									? "text-white"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<option.icon className="size-3.5 shrink-0" />
							{option.label}
						</button>
					))}
				</div>
			</FieldRow>

			<FieldRowDivider />

			<form.Field name="customerName">
				{(field) => (
					<FieldRow
						label="Cliente"
						htmlFor={field.name}
						description="Nome ou identificação do cliente, se houver"
					>
						<Input
							id={field.name}
							placeholder="Ex: Maria (WhatsApp)"
							value={field.state.value}
							onChange={(event) => field.handleChange(event.target.value)}
						/>
					</FieldRow>
				)}
			</form.Field>

			<FieldRowDivider />

			<form.Field name="orderDate">
				{(field) => (
					<FieldRow
						label="Data da venda"
						htmlFor={field.name}
						description="Data em que a venda foi realizada"
						required
					>
						<DateField
							id={field.name}
							value={field.state.value}
							onChange={(value) => {
								if (value) field.handleChange(value);
							}}
						/>
					</FieldRow>
				)}
			</form.Field>

			<FieldRowDivider />

			<form.Field name="items" mode="array">
				{(itemsField) => {
					function handleRemove(productId: string) {
						setRemovingIds((prev) => new Set(prev).add(productId));
						window.setTimeout(() => {
							// Re-look-up the index at fire time instead of capturing it at
							// click time: removing multiple rows within the 180ms exit
							// animation window shifts array positions, so a captured index
							// could point at the wrong row (or none) by the time this runs.
							const liveIndex = form.state.values.items.findIndex(
								(item) => item.productId === productId,
							);
							if (liveIndex >= 0) {
								itemsField.removeValue(liveIndex);
							}
							setRemovingIds((prev) => {
								const next = new Set(prev);
								next.delete(productId);
								return next;
							});
						}, 180);
					}

					const checkedCount = itemsField.state.value.filter(
						(item) => item.checked,
					).length;
					const allChecked =
						itemsField.state.value.length > 0 &&
						checkedCount === itemsField.state.value.length;

					function handleCheckAll(checked: boolean) {
						setAllItemsChecked(checked);
					}

					return (
						<div className="space-y-3">
							<div className="flex flex-wrap items-end justify-between gap-3">
								<div className="max-w-sm">
									<p className="text-sm font-medium text-foreground">Cesta</p>
									<p className="mt-1 text-xs text-muted-foreground">
										Busque, adicione e confira cada produto antes de finalizar.
									</p>
								</div>
								<div
									ref={searchContainerRef}
									className="w-full max-w-2xl flex-1"
								>
									<ComboboxSelect
										placeholder="Buscar produto por nome ou SKU para adicionar..."
										items={productOptions}
										value={pickerValue}
										onValueChange={(id) => {
											if (!id) return;
											const product = allProducts.find(
												(item) => item.id === id,
											);
											if (!product) return;

											const currentItems = form.state.values.items;
											const existingIndex = currentItems.findIndex(
												(item) => item.productId === id,
											);

											if (existingIndex >= 0) {
												const current = currentItems[existingIndex];
												if (current.quantity >= current.availableStock) {
													toast.warning(
														"Estoque máximo desse produto já está na cesta.",
													);
												} else {
													form.setFieldValue(
														`items[${existingIndex}].quantity`,
														current.quantity + 1,
													);
													setItemChecked(current.productId, false);
													triggerRowFlash(current.productId);
												}
											} else {
												const basePrice = Number(product.salePrice);
												itemsField.pushValue({
													productId: product.id,
													productName: product.name,
													sku: product.sku,
													availableStock: product.quantity,
													photoUrl: product.photoUrl,
													basePrice,
													quantity: 1,
													unitPrice: suggestPrice(
														basePrice,
														form.state.values.channel,
														commission,
													),
													priceTouched: false,
													checked: false,
												});
												triggerRowFlash(product.id);
											}
											setPickerValue("");
											// Refocus the search so rapid-fire adds don't require the mouse.
											window.setTimeout(() => {
												searchContainerRef.current
													?.querySelector("input")
													?.focus();
											}, 0);
										}}
									/>
								</div>
							</div>

							{itemsField.state.value.length === 0 ? (
								<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 px-4 py-10 text-center">
									<ShoppingBasket className="size-6 text-muted-foreground/50 motion-safe:animate-basket-bounce" />
									<p className="text-sm text-muted-foreground">
										Nenhum item na cesta ainda.
									</p>
								</div>
							) : (
								<div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-xs">
									<div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/25 px-3 py-2.5">
										<div>
											<p className="text-sm font-medium text-foreground">
												Cesta de separação
											</p>
											<p className="text-xs text-muted-foreground">
												{checkedCount} de {itemsField.state.value.length}{" "}
												item(ns) conferido(s)
											</p>
										</div>
										<label
											htmlFor="sales-order-check-all"
											className="inline-flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm font-medium text-foreground outline-none transition-colors hover:text-primary"
										>
											<Checkbox
												id="sales-order-check-all"
												checked={allChecked}
												indeterminate={checkedCount > 0 && !allChecked}
												onCheckedChange={handleCheckAll}
											/>
											Conferir todos
										</label>
									</div>
									{itemsField.state.value.map((item, index) => {
										const isFlashing = flashRow?.productId === item.productId;
										const isPriceRecomputed = recomputedIds.has(item.productId);
										return (
											<div
												key={item.productId}
												className={cn(
													"grid overflow-hidden transition-all duration-200 ease-out",
													removingIds.has(item.productId)
														? "grid-rows-[0fr] opacity-0"
														: "grid-rows-[1fr] animate-in fade-in slide-in-from-top-1 opacity-100 duration-200",
												)}
											>
												<div className="min-h-0 overflow-hidden">
													<div
														className={cn(
															"relative grid grid-cols-[auto_auto_1fr_auto_8rem_9rem_7rem_auto] items-center gap-3 border-b border-border/60 bg-card px-3 py-2.5 transition-colors duration-150 last:border-b-0 hover:bg-muted/40",
															item.checked &&
																"bg-secondary/5 hover:bg-secondary/10",
														)}
													>
														{isFlashing ? (
															<div
																key={flashRow.nonce}
																aria-hidden
																className="pointer-events-none absolute inset-0 motion-safe:animate-flash-highlight"
															/>
														) : null}
														<Checkbox
															aria-label={`Confirmar ${item.productName}`}
															checked={item.checked}
															onCheckedChange={(checked) =>
																setItemChecked(item.productId, checked)
															}
														/>
														<ProductImagePreview
															alt={`Imagem de ${item.productName}`}
															src={item.photoUrl}
															className="size-10"
														/>
														<div className="min-w-0">
															<p className="text-sm leading-snug font-medium text-foreground">
																{item.productName}
															</p>
															<p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
																<span>{item.sku}</span>
																<span aria-hidden>·</span>
																<span
																	className={cn(
																		"inline-flex items-center gap-1 font-sans text-xs font-medium",
																		item.checked
																			? "text-secondary"
																			: "text-muted-foreground",
																	)}
																>
																	{item.checked ? (
																		<CircleCheck className="size-3" />
																	) : (
																		<Clock3 className="size-3" />
																	)}
																	{item.checked ? "Conferido" : "Pendente"}
																</span>
															</p>
														</div>
														<span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
															{item.availableStock} em estoque
														</span>
														<form.Field name={`items[${index}].quantity`}>
															{(qtyField) => (
																<NumberField
																	aria-label="Quantidade"
																	minValue={1}
																	maxValue={item.availableStock}
																	value={qtyField.state.value}
																	onChange={(value) => {
																		qtyField.handleChange(value);
																		setItemChecked(item.productId, false);
																	}}
																/>
															)}
														</form.Field>
														<div
															className={cn(
																"rounded-sm transition-colors duration-150",
																isPriceRecomputed &&
																	"motion-safe:animate-flash-highlight",
															)}
														>
															<form.Field name={`items[${index}].unitPrice`}>
																{(priceField) => (
																	<CurrencyField
																		aria-label="Preço unitário"
																		value={priceField.state.value}
																		onChange={(value) => {
																			priceField.handleChange(value);
																			form.setFieldValue(
																				`items[${index}].priceTouched`,
																				true,
																			);
																			setItemChecked(item.productId, false);
																		}}
																	/>
																)}
															</form.Field>
														</div>
														<form.Subscribe
															selector={(state) => {
																const current = state.values.items[index];
																return current
																	? current.quantity * current.unitPrice
																	: 0;
															}}
														>
															{(lineTotal) => (
																<LineTotalCell total={lineTotal} />
															)}
														</form.Subscribe>
														<button
															type="button"
															onClick={() => handleRemove(item.productId)}
															aria-label="Remover item"
															className="flex size-7 items-center justify-center rounded-md text-muted-foreground/60 outline-none transition-[color,background-color,transform] duration-150 hover:bg-destructive/10 hover:text-destructive active:scale-90"
														>
															<Trash2 className="size-3.5" />
														</button>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					);
				}}
			</form.Field>

			<FieldRowDivider />

			<form.Field name="discountType">
				{(typeField) => (
					<form.Field name="discountValue">
						{(valueField) => (
							<FieldRow
								label="Desconto"
								description="Opcional. Informe como porcentagem ou valor em reais."
								contentClassName="max-w-md"
							>
								<div className="flex items-center gap-2">
									<div className="inline-flex shrink-0 rounded-md border border-border/60 bg-muted/25 p-0.5">
										<button
											type="button"
											onClick={() => typeField.handleChange("percentage")}
											className={cn(
												"rounded-[3px] px-2 py-1 text-xs font-medium transition-colors",
												typeField.state.value === "percentage"
													? "bg-background text-foreground shadow-xs"
													: "text-muted-foreground hover:text-foreground",
											)}
										>
											%
										</button>
										<button
											type="button"
											onClick={() => typeField.handleChange("fixed")}
											className={cn(
												"rounded-[3px] px-2 py-1 text-xs font-medium transition-colors",
												typeField.state.value === "fixed"
													? "bg-background text-foreground shadow-xs"
													: "text-muted-foreground hover:text-foreground",
											)}
										>
											R$
										</button>
									</div>
									<div className="min-w-0 flex-1">
										{typeField.state.value === "percentage" ? (
											<NumberField
												aria-label="Desconto em porcentagem"
												suffix="%"
												minValue={0}
												maxValue={100}
												value={valueField.state.value}
												onChange={valueField.handleChange}
											/>
										) : (
											<CurrencyField
												aria-label="Desconto em reais"
												value={valueField.state.value}
												onChange={valueField.handleChange}
											/>
										)}
									</div>
								</div>
							</FieldRow>
						)}
					</form.Field>
				)}
			</form.Field>

			<FieldRowDivider />

			<form.Field name="notes">
				{(field) => (
					<FieldRow
						label="Observações"
						htmlFor={field.name}
						description="Qualquer detalhe adicional sobre esta venda"
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
				selector={(state) => ({
					items: state.values.items,
					discountType: state.values.discountType,
					discountValue: state.values.discountValue,
				})}
			>
				{({ items, discountType, discountValue }) => {
					const subtotal = items.reduce(
						(sum, item) => sum + item.quantity * item.unitPrice,
						0,
					);
					const discountAmount = getDiscountAmount(
						subtotal,
						discountType,
						discountValue,
					);
					const total = subtotal - discountAmount;
					const checkedCount = items.filter((item) => item.checked).length;
					return (
						<div className="grid grid-cols-3 items-center gap-8">
							<div>
								<span className="text-sm font-medium text-foreground">
									Total da venda ({items.length}{" "}
									{items.length === 1 ? "item" : "itens"})
								</span>
								<p className="mt-0.5 text-xs text-muted-foreground">
									{checkedCount === items.length
										? "Todos os itens foram conferidos"
										: `${checkedCount} de ${items.length} item(ns) conferido(s)`}
								</p>
							</div>
							<div className="col-span-2 flex items-center justify-end gap-6">
								<div className="space-y-0.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
									<p>Subtotal {currencyFormatter.format(subtotal)}</p>
									{discountAmount > 0 ? (
										<p className="text-secondary">
											Desconto −{currencyFormatter.format(discountAmount)}
										</p>
									) : null}
								</div>
								<GrandTotalAmount total={total} />
							</div>
						</div>
					);
				}}
			</form.Subscribe>

			<form.Subscribe
				selector={(state) => ({
					canSubmit: state.canSubmit,
					isSubmitting: state.isSubmitting,
					items: state.values.items,
				})}
			>
				{({ canSubmit, isSubmitting, items }) => {
					const pendingItems = items.filter((item) => !item.checked).length;
					const canFinalize = items.length > 0 && pendingItems === 0;

					return (
						<HeaderActionsPortal>
							<Button
								type="button"
								size="sm"
								onClick={() => form.handleSubmit()}
								disabled={!canSubmit || !!isSubmitting || !canFinalize}
								className={cn(
									"transition-colors duration-200",
									justSucceeded && "motion-safe:animate-pulse-once",
								)}
							>
								{isSubmitting ? (
									<>
										<Loader2 className="size-3.5 animate-spin" />
										Registrando...
									</>
								) : pendingItems > 0 ? (
									`Confira ${pendingItems} ${pendingItems === 1 ? "item" : "itens"}`
								) : (
									"Finalizar venda"
								)}
							</Button>
						</HeaderActionsPortal>
					);
				}}
			</form.Subscribe>
		</form>
	);
}
