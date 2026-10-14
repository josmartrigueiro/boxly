import * as Sentry from "@sentry/tanstackstart-react";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import {
	products,
	salesOrderItems,
	salesOrders,
	stockMovements,
} from "#/db/schema";
import { auth } from "#/lib/auth";
import { createStockMovement } from "#/lib/stock-movements";

export const salesOrdersQueryKey = ["sales-orders"] as const;
export const salesOrderQueryKey = (id: string) => ["sales-orders", id] as const;

const salesChannelValues = ["tiktok", "whatsapp", "instagram"] as const;
const salesDiscountTypeValues = ["percentage", "fixed"] as const;

const createSalesOrderItemSchema = z.object({
	productId: z.string().uuid(),
	productName: z.string().min(1),
	quantity: z.coerce.number().int().min(1),
	unitPrice: z.coerce.number().min(0),
});

const createSalesOrderSchema = z.object({
	channel: z.enum(salesChannelValues),
	customerName: z.string().optional(),
	orderDate: z.string().min(1, "Informe a data"),
	notes: z.string().optional(),
	discountType: z.enum(salesDiscountTypeValues).nullable().optional(),
	discountValue: z.coerce.number().min(0).default(0),
	items: z
		.array(createSalesOrderItemSchema)
		.min(1, "Adicione ao menos um item"),
});

export const listSalesOrders = createServerFn({ method: "GET" }).handler(
	async () => {
		return db.query.salesOrders.findMany({
			with: { items: true },
			orderBy: [desc(salesOrders.orderDate)],
		});
	},
);

export const getSalesOrder = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data }) => {
		const order = await db.query.salesOrders.findFirst({
			where: eq(salesOrders.id, data.id),
			with: { items: { with: { product: true } } },
		});
		if (!order) {
			throw new Error("Pedido de venda não encontrado");
		}
		return order;
	});

export const createSalesOrder = createServerFn({ method: "POST" })
	.inputValidator(createSalesOrderSchema)
	.handler(async ({ data }) =>
		Sentry.startSpan({ name: "Create sales order" }, async () => {
			const headers = getRequestHeaders();
			const session = await auth.api.getSession({ headers });
			if (!session) {
				throw new Error("Unauthorized");
			}

			const subtotalValue = data.items.reduce(
				(sum, item) => sum + item.quantity * item.unitPrice,
				0,
			);
			const discountAmount =
				data.discountType === "percentage"
					? subtotalValue * (data.discountValue / 100)
					: data.discountValue;
			if (discountAmount > subtotalValue) {
				throw new Error("O desconto não pode ser maior que o subtotal.");
			}
			const totalValue = subtotalValue - discountAmount;

			const [order] = await db
				.insert(salesOrders)
				.values({
					channel: data.channel,
					customerName: data.customerName || null,
					orderDate: new Date(data.orderDate),
					subtotalValue: subtotalValue.toFixed(2),
					discountType: data.discountType ?? null,
					discountValue: data.discountValue.toFixed(2),
					discountAmount: discountAmount.toFixed(2),
					totalValue: totalValue.toFixed(2),
					notes: data.notes || null,
					createdById: session.user.id,
				})
				.returning();

			await db.insert(salesOrderItems).values(
				data.items.map((item) => ({
					salesOrderId: order.id,
					productId: item.productId,
					productName: item.productName,
					quantity: item.quantity,
					unitPrice: item.unitPrice.toFixed(2),
				})),
			);

			const channelLabel =
				data.channel === "tiktok"
					? "TikTok"
					: data.channel === "whatsapp"
						? "WhatsApp"
						: "Instagram";

			const failedItems: Array<{ productName: string }> = [];
			for (const item of data.items) {
				try {
					await createStockMovement({
						data: {
							productId: item.productId,
							type: "saida",
							value: item.quantity,
							salesOrderId: order.id,
							date: data.orderDate,
							reason: `Venda #${order.id.slice(0, 8)} (${channelLabel})`,
						},
					});
				} catch {
					failedItems.push({ productName: item.productName });
				}
			}

			return { order, failedItems };
		}),
	);

export const cancelSalesOrder = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		if (!session) {
			throw new Error("Unauthorized");
		}

		const order = await db.query.salesOrders.findFirst({
			where: eq(salesOrders.id, data.id),
		});
		if (!order) {
			throw new Error("Pedido de venda não encontrado");
		}
		if (order.status === "cancelled") {
			throw new Error("Esse pedido já está cancelado");
		}

		const movements = await db.query.stockMovements.findMany({
			where: eq(stockMovements.salesOrderId, data.id),
		});

		for (const movement of movements) {
			// movement.quantity is the negative delta applied when the sale went
			// through, so reversing it means subtracting that same value back out.
			const reverted = await db
				.update(products)
				.set({ quantity: sql`${products.quantity} - ${movement.quantity}` })
				.where(
					and(
						eq(products.id, movement.productId),
						gte(products.quantity, movement.quantity),
					),
				)
				.returning({ id: products.id });

			if (reverted.length === 0) {
				throw new Error(
					"Não é possível cancelar: o estoque de um dos produtos ficaria inconsistente.",
				);
			}
		}

		if (movements.length > 0) {
			await db.delete(stockMovements).where(
				inArray(
					stockMovements.id,
					movements.map((movement) => movement.id),
				),
			);
		}

		const [updated] = await db
			.update(salesOrders)
			.set({ status: "cancelled" })
			.where(eq(salesOrders.id, data.id))
			.returning();

		return updated;
	});
