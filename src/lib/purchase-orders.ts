import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { purchaseOrderCharges, purchaseOrders } from "#/db/schema";
import { auth } from "#/lib/auth";

export const purchaseOrdersQueryKey = ["purchase-orders"] as const;
export const purchaseOrderQueryKey = (id: string) =>
	["purchase-orders", id] as const;

const purchaseOrderStatusValues = [
	"pending",
	"in_transit",
	"received",
	"cancelled",
] as const;

const chargeKindValues = ["percentage", "fixed"] as const;

const chargeSchema = z.object({
	name: z.string().min(1, "Informe o nome da taxa"),
	kind: z.enum(chargeKindValues),
	value: z.coerce.number().min(0, "Informe um valor válido"),
});

const createPurchaseOrderSchema = z.object({
	supplierId: z.string().uuid("Selecione um fornecedor"),
	orderDate: z.string().min(1, "Informe a data do pedido"),
	itemsCount: z.coerce.number().int().min(1, "Informe a quantidade de itens"),
	productsValue: z.coerce.number().min(0.01, "Informe o valor dos produtos"),
	status: z.enum(purchaseOrderStatusValues).default("pending"),
	notes: z.string().optional(),
	charges: z.array(chargeSchema).default([]),
	sourceXml: z.string().optional(),
	nfeKey: z.string().optional(),
});

export const listPurchaseOrders = createServerFn({ method: "GET" }).handler(
	async () => {
		return db.query.purchaseOrders.findMany({
			with: {
				supplier: true,
				charges: true,
				products: {
					columns: { id: true, unitCost: true, receivedQuantity: true },
				},
				stockMovements: {
					columns: { id: true, unitCost: true, quantity: true },
				},
			},
			orderBy: [desc(purchaseOrders.orderDate)],
		});
	},
);

export const getPurchaseOrder = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data }) => {
		const order = await db.query.purchaseOrders.findFirst({
			where: eq(purchaseOrders.id, data.id),
			with: { supplier: true, charges: true },
		});
		if (!order) {
			throw new Error("Pedido não encontrado");
		}
		return order;
	});

export const createPurchaseOrder = createServerFn({ method: "POST" })
	.inputValidator(createPurchaseOrderSchema)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		if (!session) {
			throw new Error("Unauthorized");
		}

		let order: typeof purchaseOrders.$inferSelect;
		try {
			[order] = await db
				.insert(purchaseOrders)
				.values({
					supplierId: data.supplierId,
					orderDate: new Date(data.orderDate),
					itemsCount: data.itemsCount,
					productsValue: data.productsValue.toFixed(2),
					status: data.status,
					notes: data.notes || null,
					sourceXml: data.sourceXml || null,
					nfeKey: data.nfeKey || null,
					createdById: session.user.id,
				})
				.returning();
		} catch (error) {
			if (error instanceof Error && "code" in error && error.code === "23505") {
				throw new Error("Essa nota fiscal já foi importada em outro pedido.");
			}
			throw error;
		}

		if (data.charges.length > 0) {
			await db.insert(purchaseOrderCharges).values(
				data.charges.map((charge) => ({
					purchaseOrderId: order.id,
					name: charge.name,
					kind: charge.kind,
					value: charge.value.toFixed(2),
				})),
			);
		}

		return order;
	});

const updatePurchaseOrderSchema = z.object({
	id: z.string().uuid(),
	supplierId: z.string().uuid("Selecione um fornecedor"),
	orderDate: z.string().min(1, "Informe a data do pedido"),
	itemsCount: z.coerce.number().int().min(1, "Informe a quantidade de itens"),
	productsValue: z.coerce.number().min(0.01, "Informe o valor dos produtos"),
	status: z.enum(purchaseOrderStatusValues).default("pending"),
	notes: z.string().optional(),
	charges: z.array(chargeSchema).default([]),
});

export const updatePurchaseOrder = createServerFn({ method: "POST" })
	.inputValidator(updatePurchaseOrderSchema)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		if (!session) {
			throw new Error("Unauthorized");
		}

		const [order] = await db
			.update(purchaseOrders)
			.set({
				supplierId: data.supplierId,
				orderDate: new Date(data.orderDate),
				itemsCount: data.itemsCount,
				productsValue: data.productsValue.toFixed(2),
				status: data.status,
				notes: data.notes || null,
			})
			.where(eq(purchaseOrders.id, data.id))
			.returning();

		if (!order) {
			throw new Error("Pedido não encontrado");
		}

		await db
			.delete(purchaseOrderCharges)
			.where(eq(purchaseOrderCharges.purchaseOrderId, data.id));

		if (data.charges.length > 0) {
			await db.insert(purchaseOrderCharges).values(
				data.charges.map((charge) => ({
					purchaseOrderId: order.id,
					name: charge.name,
					kind: charge.kind,
					value: charge.value.toFixed(2),
				})),
			);
		}

		return order;
	});
