// Desfaz reposições feitas por engano na importação de um pedido de compra
// (a regra antiga casava itens com só 2 palavras em comum) e cadastra os
// produtos que deveriam ter sido criados. Também preenche as Tangerinas de
// todos os produtos do pedido: preço de venda ÷ R$ 9, para cima, máximo 5.
//
// Uso:
//   bun scripts/repair-purchase-order-restocks.ts <purchaseOrderId>          (simulação, não grava nada)
//   bun scripts/repair-purchase-order-restocks.ts <purchaseOrderId> --apply  (grava)
import { config } from "dotenv";
import { and, eq, inArray, like } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";

config({ path: [".env.local", ".env"] });

const { db } = await import("#/db");
const { products, purchaseOrders, stockMovements } = await import(
	"#/db/schema"
);

const RESTOCK_REASON = "Reposição via importação de nota";
const REAIS_PER_TANGERINA = 9;
const MAX_TANGERINAS = 5;
const MIN_SIMILARITY = 0.8;
const IGNORED_WORDS = new Set(["DE", "DA", "DO", "COM", "PARA", "E"]);

type OrderItem = {
	name: string;
	brand: string | null;
	category: string | null;
	quantity: number;
};

function normalizeWords(value: string): string[] {
	return value
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toUpperCase()
		.split(/\s+/)
		.filter(Boolean);
}

// Mesma pontuação da regra antiga, usada só para descobrir qual item do
// pedido gerou cada reposição.
function oldScore(itemName: string, productName: string): number {
	const itemWords = new Set(normalizeWords(itemName));
	return normalizeWords(productName).filter((word) => itemWords.has(word))
		.length;
}

function similarity(a: string, b: string): number {
	const words = (value: string) =>
		new Set(
			normalizeWords(value)
				.map((word) => word.replace(/[^A-Z0-9]/g, ""))
				.filter((word) => word && !IGNORED_WORDS.has(word)),
		);
	const left = words(a);
	const right = words(b);
	const shared = [...left].filter((word) => right.has(word)).length;
	const union = new Set([...left, ...right]).size;
	return union > 0 ? shared / union : 0;
}

function tangerinasFor(salePrice: number): number {
	if (salePrice <= 0) return 0;
	return Math.min(MAX_TANGERINAS, Math.ceil(salePrice / REAIS_PER_TANGERINA));
}

function skuPrefix(category: string): string {
	const firstWord =
		category
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.toUpperCase()
			.replace(/[^A-Z\s]/g, "")
			.trim()
			.split(/\s+/)[0] ?? "";
	const vowels = new Set(["A", "E", "I", "O", "U"]);
	const first = firstWord[0] ?? "P";
	let second = firstWord[1] ?? first;
	for (let i = 1; i < firstWord.length; i++) {
		if (!vowels.has(firstWord[i])) {
			second = firstWord[i];
			break;
		}
	}
	return `P${first}${second}`;
}

function parseOrderItems(xml: string): OrderItem[] {
	const parser = new XMLParser({
		ignoreAttributes: false,
		parseTagValue: false,
		isArray: (tagName) => tagName === "item",
	});
	const pedido = parser.parse(xml).pedido;
	if (!pedido) {
		throw new Error("O XML do pedido não está no formato <pedido>.");
	}
	return (pedido.itens?.item ?? []).map((item: Record<string, string>) => ({
		name: String(item.descricao).trim(),
		brand: item.marca?.trim() || null,
		category: item.categoria?.trim() || null,
		quantity:
			Number(item.quantidadeEmbalagens ?? item.quantidade) *
			Math.max(1, Number(item.unidadesPorEmbalagem ?? 1)),
	}));
}

const money = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

async function main() {
	const [orderId, flag] = process.argv.slice(2);
	const apply = flag === "--apply";
	if (!orderId) {
		console.error(
			"Informe o id do pedido: bun scripts/repair-purchase-order-restocks.ts <purchaseOrderId> [--apply]",
		);
		process.exit(1);
	}

	const order = await db.query.purchaseOrders.findFirst({
		where: eq(purchaseOrders.id, orderId),
		with: { supplier: true },
	});
	if (!order) throw new Error("Pedido não encontrado.");
	if (!order.sourceXml) throw new Error("O pedido não tem o XML de origem.");

	const items = parseOrderItems(order.sourceXml);
	console.log(
		`Pedido ${order.supplier.name} · ${order.orderDate.toISOString().slice(0, 10)} · ${items.length} itens no XML\n`,
	);

	const restocks = await db.query.stockMovements.findMany({
		where: and(
			eq(stockMovements.purchaseOrderId, order.id),
			eq(stockMovements.reason, RESTOCK_REASON),
		),
		with: { product: true },
	});
	const created = await db.query.products.findMany({
		where: eq(products.purchaseOrderId, order.id),
	});

	// Liga cada item do XML ao que a importação fez com ele.
	const usedItems = new Set<number>();
	const takeItem = (productName: string, quantity: number, exact: boolean) => {
		let best: { index: number; score: number } | null = null;
		items.forEach((item, index) => {
			if (usedItems.has(index) || item.quantity !== quantity) return;
			const score = exact
				? similarity(item.name, productName)
				: oldScore(item.name, productName);
			if (!best || score > best.score) best = { index, score };
		});
		const found = best as { index: number; score: number } | null;
		if (!found) return null;
		usedItems.add(found.index);
		return items[found.index];
	};

	for (const product of created) {
		takeItem(product.name, product.receivedQuantity ?? product.quantity, true);
	}

	type Product = (typeof restocks)[number]["product"];
	type WrongRestock = {
		movement: (typeof restocks)[number];
		item: OrderItem;
		newProductCost: number;
		newProductPrice: number;
	};
	type Fix = {
		product: Product;
		wrong: WrongRestock[];
		quantityBefore: number;
		costBefore: number;
		priceBefore: number;
	};
	const legit: Array<{ product: Product }> = [];
	const fixes: Fix[] = [];
	const manual: string[] = [];

	// Agrupa por produto: mais de um item pode ter caído no mesmo produto.
	const wrongByProduct = new Map<string, WrongRestock[]>();
	for (const movement of restocks) {
		const product = movement.product;
		const item = takeItem(product.name, movement.quantity, false);
		if (!item) {
			manual.push(
				`${product.sku} ${product.name}: não achei o item do pedido com ${movement.quantity} un.`,
			);
			continue;
		}
		if (similarity(item.name, product.name) >= MIN_SIMILARITY) {
			legit.push({ product });
			continue;
		}
		const incomingCost = Number(movement.unitCost ?? 0);
		const list = wrongByProduct.get(product.id) ?? [];
		list.push({
			movement,
			item,
			newProductCost: incomingCost,
			newProductPrice: Math.round(incomingCost * 2 * 100) / 100,
		});
		wrongByProduct.set(product.id, list);
	}

	const orderMovementIds = new Set(restocks.map((movement) => movement.id));
	for (const wrong of wrongByProduct.values()) {
		const product = wrong[0].movement.product;
		const itemNames = wrong.map((entry) => `"${entry.item.name}"`).join(", ");

		const latest = await db.query.stockMovements.findFirst({
			where: eq(stockMovements.productId, product.id),
			orderBy: (table, { desc }) => [desc(table.createdAt)],
		});
		if (latest && !orderMovementIds.has(latest.id)) {
			manual.push(
				`${product.sku} ${product.name}: teve outra movimentação depois da importação, corrigir à mão (itens ${itemNames}).`,
			);
			continue;
		}

		const quantityNow = product.quantity;
		const costNow = Number(product.unitCost);
		const priceNow = Number(product.salePrice);
		const wrongQuantity = wrong.reduce(
			(sum, entry) => sum + entry.movement.quantity,
			0,
		);
		const wrongValue = wrong.reduce(
			(sum, entry) => sum + entry.movement.quantity * entry.newProductCost,
			0,
		);
		const quantityBefore = quantityNow - wrongQuantity;
		if (quantityBefore <= 0) {
			manual.push(
				`${product.sku} ${product.name}: estava sem estoque antes, custo anterior não pode ser recuperado (itens ${itemNames}).`,
			);
			continue;
		}
		const costBefore = (costNow * quantityNow - wrongValue) / quantityBefore;
		// A importação manteve a margem do produto ao recalcular o preço.
		const priceBefore =
			costNow > 0
				? Math.round(((costBefore * priceNow) / costNow) * 100) / 100
				: priceNow;

		fixes.push({ product, wrong, quantityBefore, costBefore, priceBefore });
	}

	const missing = items.filter((_, index) => !usedItems.has(index));

	console.log(`Reposições corretas (${legit.length}):`);
	for (const { product } of legit) {
		console.log(`  ✓ ${product.sku} ${product.name}`);
	}

	console.log(`\nReposições erradas a desfazer (${fixes.length}):`);
	for (const fix of fixes) {
		const { product } = fix;
		console.log(
			`  ✗ ${product.sku} ${product.name}\n` +
				`      volta para: qtd ${product.quantity} → ${fix.quantityBefore}, custo ${money(Number(product.unitCost))} → ${money(fix.costBefore)}, preço ${money(Number(product.salePrice))} → ${money(fix.priceBefore)}`,
		);
		for (const entry of fix.wrong) {
			console.log(
				`      novo produto: "${entry.item.name}" · ${entry.movement.quantity} un. · custo ${money(entry.newProductCost)} · preço ${money(entry.newProductPrice)} · ${tangerinasFor(entry.newProductPrice)} tangerina(s)`,
			);
		}
	}

	if (manual.length > 0) {
		console.log(`\nPrecisam de correção manual (${manual.length}):`);
		for (const line of manual) console.log(`  ! ${line}`);
	}
	if (missing.length > 0) {
		console.log(
			`\nItens do XML sem produto nem reposição (${missing.length}):`,
		);
		for (const item of missing) console.log(`  ? ${item.name}`);
	}

	const tangerinaUpdates = [
		...created.map((product) => product),
		...legit.map(({ product }) => product),
	].map((product) => ({
		id: product.id,
		label: `${product.sku} ${product.name}`,
		price: Number(product.salePrice),
		from: product.tangerinas,
		to: tangerinasFor(Number(product.salePrice)),
	}));
	console.log(`\nTangerinas dos produtos do pedido:`);
	for (const update of tangerinaUpdates) {
		console.log(
			`  ${update.label} · ${money(update.price)} · ${update.from} → ${update.to}`,
		);
	}

	if (!apply) {
		console.log(
			"\nSimulação apenas, nada foi gravado. Rode de novo com --apply para gravar.",
		);
		return;
	}

	// Gera SKUs novos sem colidir entre si nem com os existentes.
	const nextSku = new Map<string, number>();
	const allocateSku = async (category: string) => {
		const prefix = skuPrefix(category);
		if (!nextSku.has(prefix)) {
			const rows = await db
				.select({ sku: products.sku })
				.from(products)
				.where(like(products.sku, `${prefix}%`));
			const pattern = new RegExp(`^${prefix}(\\d+)$`);
			let max = 0;
			for (const row of rows) {
				const match = row.sku.match(pattern);
				if (match) max = Math.max(max, Number(match[1]));
			}
			nextSku.set(prefix, max + 1);
		}
		const number = nextSku.get(prefix) ?? 1;
		nextSku.set(prefix, number + 1);
		return `${prefix}${String(number).padStart(3, "0")}`;
	};

	const today = new Date();
	const statements = [];
	for (const fix of fixes) {
		statements.push(
			db
				.update(products)
				.set({
					quantity: fix.quantityBefore,
					unitCost: fix.costBefore.toFixed(6),
					salePrice: fix.priceBefore.toFixed(2),
				})
				.where(eq(products.id, fix.product.id)),
			db.delete(stockMovements).where(
				inArray(
					stockMovements.id,
					fix.wrong.map((entry) => entry.movement.id),
				),
			),
		);

		for (const entry of fix.wrong) {
			const category = entry.item.category ?? fix.product.category;
			const productId = crypto.randomUUID();
			statements.push(
				db.insert(products).values({
					id: productId,
					sku: await allocateSku(category),
					name: entry.item.name,
					brand: entry.item.brand,
					category,
					unitCost: entry.newProductCost.toFixed(6),
					salePrice: entry.newProductPrice.toFixed(2),
					tangerinas: tangerinasFor(entry.newProductPrice),
					quantity: entry.movement.quantity,
					receivedQuantity: entry.movement.quantity,
					purchaseOrderId: order.id,
					status: "active",
				}),
				db.insert(stockMovements).values({
					productId,
					type: "entrada",
					quantity: entry.movement.quantity,
					date: today,
					reason: "Estoque inicial",
				}),
			);
		}
	}
	for (const update of tangerinaUpdates) {
		statements.push(
			db
				.update(products)
				.set({ tangerinas: update.to })
				.where(eq(products.id, update.id)),
		);
	}

	if (statements.length === 0) {
		console.log("\nNada para gravar.");
		return;
	}
	// neon-http executa o batch numa única transação: ou grava tudo, ou nada.
	await db.batch(statements as [never, ...never[]]);
	console.log(`\nGravado: ${statements.length} alterações.`);
}

await main();
