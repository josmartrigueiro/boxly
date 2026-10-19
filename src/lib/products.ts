import * as Sentry from "@sentry/tanstackstart-react";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, count, desc, eq, ilike, like, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { products, purchaseOrders, suppliers } from "#/db/schema";
import { auth } from "#/lib/auth";
import { createStockMovement } from "#/lib/stock-movements";

export const productsQueryKey = ["products"] as const;
export const productQueryKey = (id: string) => ["products", id] as const;

const inventorySortValues = [
	"createdAt",
	"name",
	"supplier",
	"quantity",
	"unitCost",
] as const;

export const inventorySearchInputSchema = z.object({
	q: z.string().max(120).catch("").default(""),
	category: z.string().catch("all").default("all"),
	page: z.coerce.number().int().min(1).catch(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(999).catch(100).default(100),
	sort: z.enum(inventorySortValues).catch("createdAt").default("createdAt"),
	dir: z.enum(["asc", "desc"]).catch("desc").default("desc"),
	lowStockThreshold: z.coerce.number().int().min(1).catch(5).default(5),
});

export type InventorySearchInput = z.infer<typeof inventorySearchInputSchema>;

export const inventoryQueryKey = (input: InventorySearchInput) =>
	["inventory", input] as const;

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

const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;
const dataImagePattern =
	/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

const productImageSourceSchema = z.string().refine((value) => {
	if (!value) return true;

	if (value.startsWith("data:")) {
		if (!dataImagePattern.test(value)) return false;
		const base64 = value.slice(value.indexOf(",") + 1);
		return Math.floor((base64.length * 3) / 4) <= MAX_PRODUCT_IMAGE_BYTES;
	}

	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:";
	} catch {
		return false;
	}
}, "Use uma URL válida ou uma imagem JPG, PNG ou WebP de até 2 MB.");

const createProductSchema = z.object({
	name: z.string().min(1, "Informe o nome do produto"),
	brand: z.string().optional(),
	category: z.string().min(1, "Informe a categoria/linha"),
	unitCost: z.coerce.number().min(0.01, "Informe o custo unitário"),
	salePrice: z.coerce.number().min(0.01, "Informe o preço de venda"),
	tangerinas: z.coerce
		.number()
		.int("Informe um número inteiro")
		.min(0, "Não use números negativos")
		.max(99, "Use no máximo 99 Tangerinas")
		.default(0),
	initialQuantity: z.coerce.number().int().min(0).default(0),
	purchaseOrderId: z.string().uuid().optional().or(z.literal("")),
	photoUrl: productImageSourceSchema.optional().or(z.literal("")),
	photoThumbnailUrl: productImageSourceSchema.optional().or(z.literal("")),
	saleLink: z.string().url("URL inválida").optional().or(z.literal("")),
	status: z.enum(productStatusValues).default("active"),
	notes: z.string().optional(),
});

export const listProducts = createServerFn({ method: "GET" }).handler(
	async () => {
		return db.query.products.findMany({
			with: { purchaseOrder: { with: { supplier: true } } },
			orderBy: [desc(products.createdAt)],
		});
	},
);

/**
 * Consulta a listagem do estoque já filtrada e paginada no banco. Isso evita
 * transferir o catálogo inteiro a cada busca, ordenação ou troca de página.
 */
export const listInventory = createServerFn({ method: "GET" })
	.inputValidator(inventorySearchInputSchema)
	.handler(({ data }) =>
		Sentry.startSpan({ name: "Listar estoque" }, async () => {
			const term = data.q.trim();
			const conditions = [
				term
					? or(
							ilike(products.name, `%${term}%`),
							ilike(products.sku, `%${term}%`),
						)
					: undefined,
				data.category !== "all"
					? eq(products.category, data.category)
					: undefined,
			];
			const where = and(...conditions);
			const orderDirection = data.dir === "asc" ? asc : desc;
			const orderBy = (() => {
				switch (data.sort) {
					case "name":
						return [orderDirection(products.name), desc(products.id)] as const;
					case "supplier":
						return [orderDirection(suppliers.name), desc(products.id)] as const;
					case "quantity":
						return [
							orderDirection(products.quantity),
							desc(products.id),
						] as const;
					case "unitCost":
						return [
							orderDirection(products.unitCost),
							desc(products.id),
						] as const;
					default:
						return [
							orderDirection(products.createdAt),
							desc(products.id),
						] as const;
				}
			})();

			const [rows, totalRows, categoryRows, totals] = await Promise.all([
				db
					.select({
						id: products.id,
						sku: products.sku,
						name: products.name,
						category: products.category,
						unitCost: products.unitCost,
						salePrice: products.salePrice,
						tangerinas: products.tangerinas,
						quantity: products.quantity,
						status: products.status,
						photoThumbnailUrl: products.photoThumbnailUrl,
						purchaseOrderId: products.purchaseOrderId,
						supplierName: suppliers.name,
					})
					.from(products)
					.leftJoin(
						purchaseOrders,
						eq(products.purchaseOrderId, purchaseOrders.id),
					)
					.leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
					.where(where)
					.orderBy(...orderBy)
					.limit(data.pageSize)
					.offset((data.page - 1) * data.pageSize),
				db.select({ value: count() }).from(products).where(where),
				db
					.selectDistinct({ category: products.category })
					.from(products)
					.orderBy(asc(products.category)),
				db
					.select({
						total: count(),
						low: sql<number>`count(*) filter (where ${products.quantity} > 0 and ${products.quantity} <= ${data.lowStockThreshold})`,
						out: sql<number>`count(*) filter (where ${products.quantity} <= 0)`,
						value: sql<string>`coalesce(sum(${products.quantity} * ${products.unitCost}), 0)`,
					})
					.from(products),
			]);

			return {
				items: rows.map((row) => ({
					id: row.id,
					sku: row.sku,
					name: row.name,
					category: row.category,
					unitCost: row.unitCost,
					salePrice: row.salePrice,
					tangerinas: row.tangerinas,
					quantity: row.quantity,
					status: row.status,
					photoThumbnailUrl: row.photoThumbnailUrl,
					purchaseOrderId: row.purchaseOrderId,
					purchaseOrder:
						row.purchaseOrderId && row.supplierName
							? { supplier: { name: row.supplierName } }
							: null,
				})),
				total: Number(totalRows[0]?.value ?? 0),
				categories: categoryRows.map((row) => row.category),
				metrics: {
					total: Number(totals[0]?.total ?? 0),
					low: Number(totals[0]?.low ?? 0),
					out: Number(totals[0]?.out ?? 0),
					value: Number(totals[0]?.value ?? 0),
				},
			};
		}),
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

const updateProductSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1, "Informe o nome do produto"),
	brand: z.string().optional(),
	category: z.string().min(1, "Informe a categoria/linha"),
	unitCost: z.coerce.number().min(0.01, "Informe o custo unitário"),
	salePrice: z.coerce.number().min(0.01, "Informe o preço de venda"),
	tangerinas: z.coerce
		.number()
		.int("Informe um número inteiro")
		.min(0, "Não use números negativos")
		.max(99, "Use no máximo 99 Tangerinas")
		.default(0),
	purchaseOrderId: z.string().uuid().optional().or(z.literal("")),
	photoUrl: productImageSourceSchema.optional().or(z.literal("")),
	photoThumbnailUrl: productImageSourceSchema.optional().or(z.literal("")),
	saleLink: z.string().url("URL inválida").optional().or(z.literal("")),
	status: z.enum(productStatusValues).default("active"),
	notes: z.string().optional(),
});

export const updateProduct = createServerFn({ method: "POST" })
	.inputValidator(updateProductSchema)
	.handler(({ data }) =>
		Sentry.startSpan({ name: "Atualizar produto" }, async () => {
			const headers = getRequestHeaders();
			const session = await auth.api.getSession({ headers });
			if (!session) {
				throw new Error("Unauthorized");
			}

			const [product] = await db
				.update(products)
				.set({
					name: data.name,
					brand: data.brand || null,
					category: data.category,
					unitCost: data.unitCost.toFixed(6),
					salePrice: data.salePrice.toFixed(2),
					tangerinas: data.tangerinas,
					purchaseOrderId: data.purchaseOrderId || null,
					photoUrl: data.photoUrl || null,
					photoThumbnailUrl: data.photoThumbnailUrl || null,
					saleLink: data.saleLink || null,
					status: data.status,
					notes: data.notes || null,
				})
				.where(eq(products.id, data.id))
				.returning();

			if (!product) {
				throw new Error("Produto não encontrado");
			}
			return product;
		}),
	);

export const createProduct = createServerFn({ method: "POST" })
	.inputValidator(createProductSchema)
	.handler(({ data }) =>
		Sentry.startSpan({ name: "Cadastrar produto" }, async () => {
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
							brand: data.brand || null,
							category: data.category,
							unitCost: data.unitCost.toFixed(6),
							salePrice: data.salePrice.toFixed(2),
							tangerinas: data.tangerinas,
							receivedQuantity: data.initialQuantity,
							purchaseOrderId: data.purchaseOrderId || null,
							photoUrl: data.photoUrl || null,
							photoThumbnailUrl: data.photoThumbnailUrl || null,
							saleLink: data.saleLink || null,
							status: data.status,
							notes: data.notes || null,
							createdById: session.user.id,
						})
						.returning();
				} catch (error) {
					lastError = error;
					if (
						!(
							error instanceof Error &&
							"code" in error &&
							error.code === "23505"
						)
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
		}),
	);
