import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { products, stockMovements } from "#/db/schema";
import { auth } from "#/lib/auth";

export const stockMovementsQueryKey = (productId: string) =>
	["stock-movements", productId] as const;

const movementTypeValues = ["entrada", "saida", "ajuste"] as const;

const createStockMovementSchema = z.object({
	productId: z.string().uuid(),
	type: z.enum(movementTypeValues),
	value: z.coerce.number().int().min(0, "Informe uma quantidade válida"),
	date: z.string().min(1, "Informe a data"),
	reason: z.string().optional(),
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
			await db
				.update(products)
				.set({ quantity: sql`${products.quantity} + ${data.value}` })
				.where(eq(products.id, data.productId));

			const [movement] = await db
				.insert(stockMovements)
				.values({
					productId: data.productId,
					type: data.type,
					quantity: data.value,
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
