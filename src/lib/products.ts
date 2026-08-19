import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { asc, eq, like } from "drizzle-orm";
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

export function getPriceFromMargin(
	cost: number,
	marginPercent: number,
): number {
	if (marginPercent >= 100) return cost;
	return cost / (1 - marginPercent / 100);
}

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

/**
 * Deriva um prefixo de 3 letras a partir da categoria: "P" + a primeira
 * letra da primeira palavra + a primeira consoante seguinte (pulando
 * vogais). "Caderno" → CD, "Caneta" → CN, "Borracha" → BR, "Bloco" → BL —
 * evita colisão entre linhas parecidas melhor que só a inicial.
 */
export function generateSkuPrefix(category: string): string {
	const cleaned = category
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toUpperCase()
		.replace(/[^A-Z\s]/g, "")
		.trim();
	const firstWord = cleaned.split(/\s+/)[0] || "PROD";

	const first = firstWord[0] ?? "P";
	let second = firstWord[1] ?? first;
	for (let i = 1; i < firstWord.length; i++) {
		if (!VOWELS.has(firstWord[i])) {
			second = firstWord[i];
			break;
		}
	}

	return `P${first}${second}`;
}

async function generateUniqueSku(category: string): Promise<string> {
	const prefix = generateSkuPrefix(category);
	const existing = await db
		.select({ sku: products.sku })
		.from(products)
		.where(like(products.sku, `${prefix}%`));

	const prefixPattern = new RegExp(`^${prefix}(\\d+)$`);
	let maxNumber = 0;
	for (const row of existing) {
		const match = row.sku.match(prefixPattern);
		if (match) {
			maxNumber = Math.max(maxNumber, Number(match[1]));
		}
	}

	return `${prefix}${String(maxNumber + 1).padStart(3, "0")}`;
}

const productStatusValues = ["active", "inactive"] as const;

const createProductSchema = z.object({
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

		let product: typeof products.$inferSelect | undefined;
		let lastError: unknown;

		for (let attempt = 0; attempt < 5 && !product; attempt++) {
			const sku = await generateUniqueSku(data.category);
			try {
				[product] = await db
					.insert(products)
					.values({
						sku,
						name: data.name,
						category: data.category,
						unitCost: data.unitCost.toFixed(2),
						salePrice: data.salePrice.toFixed(2),
						receivedQuantity: data.initialQuantity,
						purchaseOrderId: data.purchaseOrderId || null,
						photoUrl: data.photoUrl || null,
						saleLink: data.saleLink || null,
						status: data.status,
						notes: data.notes || null,
						createdById: session.user.id,
					})
					.returning();
			} catch (error) {
				lastError = error;
				if (
					!(error instanceof Error && "code" in error && error.code === "23505")
				) {
					throw error;
				}
			}
		}

		if (!product) {
			throw lastError instanceof Error
				? lastError
				: new Error("Não foi possível gerar um código único para o produto.");
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
