import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { desc } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { purchaseOrders } from "#/db/schema";
import { auth } from "#/lib/auth";

export const purchaseOrdersQueryKey = ["purchase-orders"] as const;

const purchaseOrderStatusValues = [
	"pending",
	"in_transit",
	"received",
	"cancelled",
] as const;

const createPurchaseOrderSchema = z.object({
	supplierId: z.string().uuid("Selecione um fornecedor"),
	orderDate: z.string().min(1, "Informe a data do pedido"),
	itemsCount: z.coerce.number().int().min(0),
	productsValue: z.coerce.number().min(0),
	freightValue: z.coerce.number().min(0).default(0),
	taxValue: z.coerce.number().min(0).default(0),
	status: z.enum(purchaseOrderStatusValues).default("pending"),
	notes: z.string().optional(),
});

export const listPurchaseOrders = createServerFn({ method: "GET" }).handler(
	async () => {
		return db.query.purchaseOrders.findMany({
			with: { supplier: true },
			orderBy: [desc(purchaseOrders.orderDate)],
		});
	},
);

export const createPurchaseOrder = createServerFn({ method: "POST" })
	.inputValidator(createPurchaseOrderSchema)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		if (!session) {
			throw new Error("Unauthorized");
		}

		const [order] = await db
			.insert(purchaseOrders)
			.values({
				supplierId: data.supplierId,
				orderDate: new Date(data.orderDate),
				itemsCount: data.itemsCount,
				productsValue: data.productsValue.toFixed(2),
				freightValue: data.freightValue.toFixed(2),
				taxValue: data.taxValue.toFixed(2),
				status: data.status,
				notes: data.notes || null,
				createdById: session.user.id,
			})
			.returning();

		return order;
	});
