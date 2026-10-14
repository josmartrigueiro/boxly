import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { products, stockMovements } from "#/db/schema";
import { auth } from "#/lib/auth";

export const stockMovementsQueryKey = (productId: string) =>
	["stock-movements", productId] as const;

export type StockMovement = typeof stockMovements.$inferSelect;

const movementTypeValues = ["entrada", "saida", "ajuste"] as const;

const createStockMovementSchema = z.object({
	productId: z.string().uuid(),
	type: z.enum(movementTypeValues),
	value: z.coerce.number().int().min(0, "Informe uma quantidade válida"),
	date: z.string().min(1, "Informe a data"),
	reason: z.string().optional(),
	unitCost: z.coerce.number().min(0).optional(),
	purchaseOrderId: z.string().uuid().optional(),
	salesOrderId: z.string().uuid().optional(),
	salePrice: z.coerce.number().min(0).optional(),
});

export const listMovementsForProduct = createServerFn({ method: "GET" })
	.inputValidator(z.object({ productId: z.string().uuid() }))
	.handler(async ({ data }) => {
		return db.query.stockMovements.findMany({
			where: eq(stockMovements.productId, data.productId),
			orderBy: [desc(stockMovements.date)],
		});
	});

export const createStockMovement = createServerFn({ method: "POST" })
	.inputValidator(createStockMovementSchema)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		if (!session) {
			throw new Error("Unauthorized");
		}

		const movementDate = new Date(data.date);

		if (data.type === "entrada") {
			// Precompute this batch's total value in JS: interpolating two bare
			// SQL parameters into a multiplication (`$1 * $2`) with no typed
			// column nearby leaves Postgres unable to infer either param's type
			// ("could not determine data type of parameter"). Passing a single
			// already-computed number avoids that, since it lands next to the
			// typed `products.quantity * products.unitCost` term instead.
			const incomingValue = data.value * (data.unitCost ?? 0);

			await db
				.update(products)
				.set({
					quantity: sql`${products.quantity} + ${data.value}`,
					...(data.unitCost != null
						? {
								unitCost: sql`ROUND((${products.quantity} * ${products.unitCost} + ${incomingValue}) / (${products.quantity} + ${data.value}), 6)`,
							}
						: {}),
					...(data.salePrice != null
						? { salePrice: data.salePrice.toFixed(2) }
						: {}),
				})
				.where(eq(products.id, data.productId));

			const [movement] = await db
				.insert(stockMovements)
				.values({
					productId: data.productId,
					type: data.type,
					quantity: data.value,
					unitCost: data.unitCost != null ? data.unitCost.toFixed(6) : null,
					purchaseOrderId: data.purchaseOrderId || null,
					date: movementDate,
					reason: data.reason || null,
					createdById: session.user.id,
				})
				.returning();

			return movement;
		}

		if (data.type === "saida") {
			const updated = await db
				.update(products)
				.set({ quantity: sql`${products.quantity} - ${data.value}` })
				.where(
					and(
						eq(products.id, data.productId),
						gte(products.quantity, data.value),
					),
				)
				.returning({ id: products.id });

			if (updated.length === 0) {
				throw new Error("Estoque insuficiente para essa saída.");
			}

			const [movement] = await db
				.insert(stockMovements)
				.values({
					productId: data.productId,
					type: data.type,
					quantity: -data.value,
					salesOrderId: data.salesOrderId || null,
					date: movementDate,
					reason: data.reason || null,
					createdById: session.user.id,
				})
				.returning();

			return movement;
		}

		const current = await db.query.products.findFirst({
			where: eq(products.id, data.productId),
			columns: { quantity: true },
		});
		if (!current) {
			throw new Error("Produto não encontrado");
		}

		const delta = data.value - current.quantity;

		await db
			.update(products)
			.set({ quantity: data.value })
			.where(eq(products.id, data.productId));

		const [movement] = await db
			.insert(stockMovements)
			.values({
				productId: data.productId,
				type: data.type,
				quantity: delta,
				date: movementDate,
				reason: data.reason || null,
				createdById: session.user.id,
			})
			.returning();

		return movement;
	});

export const deleteStockMovement = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		if (!session) {
			throw new Error("Unauthorized");
		}

		const movement = await db.query.stockMovements.findFirst({
			where: eq(stockMovements.id, data.id),
		});
		if (!movement) {
			throw new Error("Movimentação não encontrada");
		}

		// movement.quantity already holds the signed delta that was applied to
		// products.quantity when it was created, so reversing it is just
		// subtracting that same value back out — regardless of movement type.
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
				"Não é possível remover: o estoque atual ficaria negativo.",
			);
		}

		await db.delete(stockMovements).where(eq(stockMovements.id, data.id));

		return { success: true, productId: movement.productId };
	});
