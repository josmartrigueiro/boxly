import type { Product } from "./mock-products";

export type Lot = {
	id: string;
	supplier: string;
	platform: string;
	purchaseDate: string;
	productsValue: number;
	freightValue: number;
	feesValue: number;
	itemsCount: number;
	status: "recebido" | "em_transporte";
};

// Dados fictícios inspirados na aba "Lotes" da sua planilha — só pra
// ilustrar a ligação produto → lote → fornecedor na tela de detalhe.
export const MOCK_LOTS: Lot[] = [
	{
		id: "L001",
		supplier: "Star",
		platform: "Site Star",
		purchaseDate: "01/05/2026",
		productsValue: 1228.95,
		freightValue: 70.33,
		feesValue: 0,
		itemsCount: 288,
		status: "recebido",
	},
	{
		id: "L002",
		supplier: "Star",
		platform: "Site Star",
		purchaseDate: "06/05/2026",
		productsValue: 964.29,
		freightValue: 87.06,
		feesValue: 32.38,
		itemsCount: 131,
		status: "recebido",
	},
	{
		id: "L004",
		supplier: "Mabel Atacado",
		platform: "Site",
		purchaseDate: "05/05/2026",
		productsValue: 199.71,
		freightValue: 34.27,
		feesValue: 0,
		itemsCount: 41,
		status: "recebido",
	},
	{
		id: "L008",
		supplier: "Iskisita Atacado",
		platform: "Isikita",
		purchaseDate: "25/05/2026",
		productsValue: 516.97,
		freightValue: 0,
		feesValue: 0,
		itemsCount: 0,
		status: "recebido",
	},
	{
		id: "L018",
		supplier: "Tris",
		platform: "Site",
		purchaseDate: "01/06/2026",
		productsValue: 974.18,
		freightValue: 50,
		feesValue: 371.23,
		itemsCount: 307,
		status: "recebido",
	},
];

export function getLotById(id: string): Lot | undefined {
	return MOCK_LOTS.find((lot) => lot.id === id);
}

export type StockMovementType = "entrada" | "saida" | "ajuste";

export type StockMovement = {
	id: string;
	type: StockMovementType;
	quantity: number;
	date: string;
	reason: string;
};

const SALE_CHANNELS = ["TikTok Shop", "WhatsApp", "Instagram"];

// PRNG determinístico simples (mulberry32) — o mesmo produto sempre gera
// o mesmo histórico, em vez de embaralhar a cada recarregamento da página.
function createSeededRandom(seed: string) {
	let state = 0;
	for (let i = 0; i < seed.length; i++) {
		state = (state << 5) - state + seed.charCodeAt(i);
		state |= 0;
	}
	return () => {
		state = (state * 1103515245 + 12345) & 0x7fffffff;
		return state / 0x7fffffff;
	};
}

function parseBrDate(date: string): number {
	const [day, month, year] = date.split("/").map(Number);
	return new Date(year, month - 1, day).getTime();
}

function addDays(date: string, days: number): string {
	const [day, month, year] = date.split("/").map(Number);
	const next = new Date(year, month - 1, day);
	next.setDate(next.getDate() + days);
	return [
		String(next.getDate()).padStart(2, "0"),
		String(next.getMonth() + 1).padStart(2, "0"),
		String(next.getFullYear()),
	].join("/");
}

// Extrato de movimentação fictício, derivado do lote e da quantidade atual
// de cada produto — não existe uma tabela de movimentos real ainda.
export function getMovementsForProduct(product: Product): StockMovement[] {
	const lot = getLotById(product.lotId);
	const purchaseDate = lot?.purchaseDate ?? "01/05/2026";
	const random = createSeededRandom(product.id);

	const sold = Math.floor(random() * 6) + (product.quantity === 0 ? 3 : 2);
	const purchased = product.quantity + sold;

	const movements: StockMovement[] = [
		{
			id: `${product.id}-entrada`,
			type: "entrada",
			quantity: purchased,
			date: purchaseDate,
			reason: `Compra recebida (Lote ${product.lotId})`,
		},
	];

	let remaining = sold;
	let dayOffset = Math.floor(random() * 3) + 1;

	while (remaining > 0) {
		const quantity =
			remaining === 1 ? 1 : Math.min(remaining, Math.ceil(random() * 3));
		const isAdjustment = movements.length === 1 && random() < 0.2;

		movements.push({
			id: `${product.id}-mov-${movements.length}`,
			type: isAdjustment ? "ajuste" : "saida",
			quantity,
			date: addDays(purchaseDate, dayOffset),
			reason: isAdjustment
				? "Ajuste de inventário (contagem física)"
				: `Venda via ${SALE_CHANNELS[Math.floor(random() * SALE_CHANNELS.length)]}`,
		});

		remaining -= quantity;
		dayOffset += Math.floor(random() * 4) + 1;
	}

	return movements.sort((a, b) => parseBrDate(b.date) - parseBrDate(a.date));
}
