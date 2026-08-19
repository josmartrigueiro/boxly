import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { products } from "#/db/schema";
import { auth } from "#/lib/auth";
import { createStockMovement } from "#/lib/stock-movements";

export const productsQueryKey = ["products"] as const;
export const productQueryKey = (id: string) => ["products", id] as const;

export type StockStatus = "esgotado" | "baixo" | "em_estoque";

export function getStockStatus(
	quantity: number,
	lowStockThreshold: number,
): StockStatus {
	if (quantity <= 0) return "esgotado";
	if (quantity <= lowStockThreshold) return "baixo";
	return "em_estoque";
}

export function getMargin(unitCost: number, salePrice: number): number {
	if (salePrice <= 0) return 0;
	return ((salePrice - unitCost) / salePrice) * 100;
}

const productStatusValues = ["active", "inactive"] as const;

const createProductSchema = z.object({
	sku: z.string().min(1, "Informe o código/SKU"),
	name: z.string().min(1, "Informe o nome do produto"),
	category: z.string().min(1, "Informe a categoria/linha"),
	unitCost: z.coerce.number().min(0.01, "Informe o custo unitário"),
	salePrice: z.coerce.number().min(0.01, "Informe o preço de venda"),
	initialQuantity: z.coerce.number().int().min(0).default(0),
	purchaseOrderId: z.string().uuid().optional().or(z.literal("")),
	photoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
	saleLink: z.string().url("URL inválida").optional().or(z.literal("")),
	status: z.enum(productStatusValues).default("active"),
	notes: z.string().optional(),
});

export const listProducts = createServerFn({ method: "GET" }).handler(
	async () => {
		return db.query.products.findMany({
			with: { purchaseOrder: { with: { supplier: true } } },
			orderBy: [asc(products.name)],
		});
	},
);

export const getProduct = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data }) => {
		const product = await db.query.products.findFirst({
			where: eq(products.id, data.id),
			with: { purchaseOrder: { with: { supplier: true } } },
		});
		if (!product) {
			throw new Error("Produto não encontrado");
		}
		return product;
	});

export const createProduct = createServerFn({ method: "POST" })
	.inputValidator(createProductSchema)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		if (!session) {
			throw new Error("Unauthorized");
		}

		let product: typeof products.$inferSelect;
		try {
			[product] = await db
				.insert(products)
				.values({
					sku: data.sku,
					name: data.name,
					category: data.category,
					unitCost: data.unitCost.toFixed(2),
					salePrice: data.salePrice.toFixed(2),
					purchaseOrderId: data.purchaseOrderId || null,
					photoUrl: data.photoUrl || null,
					saleLink: data.saleLink || null,
					status: data.status,
					notes: data.notes || null,
					createdById: session.user.id,
				})
				.returning();
		} catch (error) {
			if (error instanceof Error && "code" in error && error.code === "23505") {
				throw new Error("Já existe um produto cadastrado com esse SKU.");
			}
			throw error;
		}

		if (data.initialQuantity > 0) {
			await createStockMovement({
				data: {
					productId: product.id,
					type: "entrada",
					value: data.initialQuantity,
					date: new Date().toISOString().slice(0, 10),
					reason: "Estoque inicial",
				},
			});
			product.quantity = data.initialQuantity;
		}

		return product;
	});
