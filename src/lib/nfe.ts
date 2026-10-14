import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

import { db } from "#/db";
import { purchaseOrders, suppliers } from "#/db/schema";
import { unformatCnpj } from "#/lib/cnpj";
import { DEFAULT_PRODUCT_CATEGORIES } from "#/lib/product-categories";

export type ParsedNfeItem = {
	name: string;
	brand: string | null;
	quantity: number;
	unitCost: number;
	ipi: number | null;
	suggestedCategory: string | null;
};

export type ParsedNfe = {
	nfeKey: string | null;
	supplier: {
		name: string;
		cnpj: string | null;
		phone: string | null;
		location: string | null;
	};
	orderDate: string;
	items: ParsedNfeItem[];
	productsValue: number;
	freight: number;
	taxesSummary: {
		icms: number;
		ipi: number;
		pis: number;
		cofins: number;
		outros: number;
	};
};

export function normalizeWords(value: string): string[] {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toUpperCase()
		.split(/\s+/)
		.filter(Boolean);
}

function guessCategory(itemName: string): string | null {
	const itemWords = new Set(normalizeWords(itemName));
	let best: { category: string; score: number } | null = null;

	for (const category of DEFAULT_PRODUCT_CATEGORIES) {
		const categoryWords = normalizeWords(category);
		const score = categoryWords.filter((word) => itemWords.has(word)).length;
		if (score > 0 && (!best || score > best.score)) {
			best = { category, score };
		}
	}

	return best?.category ?? null;
}

function parseNumber(value: unknown): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function getItemIpiValue(taxes: unknown): number | null {
	if (!taxes || typeof taxes !== "object") return null;

	const ipi = (taxes as Record<string, unknown>).IPI;
	if (!ipi || typeof ipi !== "object") return null;

	for (const value of Object.values(ipi as Record<string, unknown>)) {
		if (!value || typeof value !== "object") continue;
		const ipiValue = parseNumber((value as Record<string, unknown>).vIPI);
		if (ipiValue > 0) return ipiValue;
	}

	return null;
}

function parseNfeStructured(
	parsed: Record<string, unknown>,
	infNFe: Record<string, unknown>,
): ParsedNfe {
	const ide = infNFe.ide as Record<string, unknown> | undefined;
	const emit = infNFe.emit as Record<string, unknown> | undefined;
	const enderEmit = emit?.enderEmit as Record<string, unknown> | undefined;
	const total = infNFe.total as Record<string, unknown> | undefined;
	const icmsTot = total?.ICMSTot as Record<string, unknown> | undefined;
	const detList = (infNFe.det ?? []) as Array<Record<string, unknown>>;

	if (!emit || !icmsTot || detList.length === 0) {
		throw new Error(
			"O XML foi lido, mas faltam informações essenciais (emitente, itens ou totais).",
		);
	}

	const protNFe = (parsed.nfeProc as Record<string, unknown> | undefined)
		?.protNFe as Record<string, unknown> | undefined;
	const infProt = protNFe?.infProt as Record<string, unknown> | undefined;
	const chNFeFromProt = infProt?.chNFe as string | undefined;
	const idAttr = infNFe["@_Id"] as string | undefined;
	const nfeKey =
		chNFeFromProt || (idAttr ? idAttr.replace(/^NFe/, "") : null) || null;

	const dhEmi = (ide?.dhEmi as string | undefined) ?? "";
	const orderDate = dhEmi.slice(0, 10) || new Date().toISOString().slice(0, 10);

	const cnpjRaw = (emit.CNPJ as string | undefined) ?? null;
	const supplierName =
		(emit.xNome as string | undefined) ??
		(emit.xFant as string | undefined) ??
		"Fornecedor";
	const phone = (enderEmit?.fone as string | undefined) ?? null;
	const municipality = enderEmit?.xMun as string | undefined;
	const uf = enderEmit?.UF as string | undefined;
	const location =
		municipality && uf ? `${municipality}, ${uf}` : (municipality ?? null);

	const items: ParsedNfeItem[] = detList.map((det) => {
		const prod = det.prod as Record<string, unknown>;
		const taxes = det.imposto as Record<string, unknown> | undefined;
		const name = (prod?.xProd as string | undefined) ?? "Item sem nome";
		const quantity = parseNumber(prod?.qCom);
		const totalValue = parseNumber(prod?.vProd);
		const unitCost =
			quantity > 0
				? Math.round((totalValue / quantity) * 100) / 100
				: parseNumber(prod?.vUnCom);

		return {
			name,
			brand: null,
			quantity,
			unitCost,
			ipi: getItemIpiValue(taxes),
			suggestedCategory: guessCategory(name),
		};
	});

	const vProd = parseNumber(icmsTot.vProd);
	const vDesc = parseNumber(icmsTot.vDesc);

	return {
		nfeKey,
		supplier: {
			name: supplierName,
			cnpj: cnpjRaw ? unformatCnpj(cnpjRaw) : null,
			phone,
			location,
		},
		orderDate,
		items,
		productsValue: Math.round((vProd - vDesc) * 100) / 100,
		freight: parseNumber(icmsTot.vFrete),
		taxesSummary: {
			icms: parseNumber(icmsTot.vICMS),
			ipi: parseNumber(icmsTot.vIPI),
			pis: parseNumber(icmsTot.vPIS),
			cofins: parseNumber(icmsTot.vCOFINS),
			outros: parseNumber(icmsTot.vOutro),
		},
	};
}

function parsePedidoStructured(pedido: Record<string, unknown>): ParsedNfe {
	const loja = pedido.loja as Record<string, unknown> | undefined;
	const resumo = pedido.resumo as Record<string, unknown> | undefined;
	const impostos = pedido.impostos as Record<string, unknown> | undefined;
	const referencia = pedido.referencia as Record<string, unknown> | undefined;
	const itens = pedido.itens as Record<string, unknown> | undefined;
	const itemList = (itens?.item ?? []) as Array<Record<string, unknown>>;

	if (!loja || itemList.length === 0) {
		throw new Error(
			"O pedido foi lido, mas faltam informações essenciais (loja ou itens).",
		);
	}

	const items: ParsedNfeItem[] = itemList.map((item) => {
		const name = (item.descricao as string | undefined) ?? "Item sem nome";
		const brand = (item.marca as string | undefined)?.trim() || null;
		const categoria = (item.categoria as string | undefined)?.trim();
		const packageQuantity = parseNumber(
			item.quantidadeEmbalagens ?? item.quantidade,
		);
		const unitsPerPackage = Math.max(1, parseNumber(item.unidadesPorEmbalagem));
		const quantity = packageQuantity * unitsPerPackage;
		const packagePrice = parseNumber(
			item.precoPorEmbalagem ?? item.precoUnitario,
		);
		const unitCost = packagePrice / unitsPerPackage;

		return {
			name,
			brand,
			quantity,
			unitCost,
			ipi: parseNumber(item.ipi) || null,
			suggestedCategory: categoria || guessCategory(name),
		};
	});

	const valorProdutos = (resumo?.valorProdutos ?? resumo?.valorTotal) as
		| { "#text": string }
		| string
		| undefined;
	const productsValue =
		typeof valorProdutos === "object"
			? parseNumber(valorProdutos["#text"])
			: parseNumber(valorProdutos);

	const cnpjRaw = loja.cnpj as string | undefined;
	const dataPedido = pedido.data as string | undefined;
	const nfeKey =
		(referencia?.chaveAcesso as string | undefined)?.trim() || null;

	return {
		nfeKey,
		supplier: {
			name: (loja.nome as string | undefined) ?? "Fornecedor",
			cnpj: cnpjRaw ? unformatCnpj(cnpjRaw) : null,
			phone: (loja.telefone as string | undefined) ?? null,
			location: null,
		},
		orderDate: dataPedido || new Date().toISOString().slice(0, 10),
		items,
		productsValue:
			productsValue ||
			Math.round(
				items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0) *
					100,
			) / 100,
		freight: parseNumber(resumo?.valorFrete),
		taxesSummary: {
			icms: 0,
			ipi: parseNumber(impostos?.ipi ?? resumo?.valorIpi),
			pis: 0,
			cofins: 0,
			outros: parseNumber(impostos?.outros ?? resumo?.outrasDespesas),
		},
	};
}

export function parseNfeXmlContent(xml: string): ParsedNfe {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
		parseTagValue: false,
		isArray: (tagName) => tagName === "det" || tagName === "item",
	});

	let parsed: Record<string, unknown>;
	try {
		parsed = parser.parse(xml);
	} catch {
		throw new Error("Não foi possível ler o arquivo XML.");
	}

	const nfeProc = parsed.nfeProc as Record<string, unknown> | undefined;
	const nfe =
		(nfeProc?.NFe as Record<string, unknown> | undefined) ??
		(parsed.NFe as Record<string, unknown> | undefined);
	const infNFe = nfe?.infNFe as Record<string, unknown> | undefined;

	if (infNFe) {
		return parseNfeStructured(parsed, infNFe);
	}

	const pedido = parsed.pedido as Record<string, unknown> | undefined;
	if (pedido) {
		return parsePedidoStructured(pedido);
	}

	throw new Error(
		"Esse arquivo não parece ser uma NFe nem um pedido reconhecido pelo sistema.",
	);
}

export const parseNfeXml = createServerFn({ method: "POST" })
	.inputValidator(z.object({ xml: z.string().min(1, "Arquivo vazio") }))
	.handler(async ({ data }) => {
		return parseNfeXmlContent(data.xml);
	});

export const findSupplierByCnpj = createServerFn({ method: "GET" })
	.inputValidator(z.object({ cnpj: z.string().min(1) }))
	.handler(async ({ data }) => {
		const cnpj = unformatCnpj(data.cnpj);
		const supplier = await db.query.suppliers.findFirst({
			where: eq(suppliers.cnpj, cnpj),
		});
		return supplier ?? null;
	});

export const checkNfeAlreadyImported = createServerFn({ method: "GET" })
	.inputValidator(z.object({ nfeKey: z.string().min(1) }))
	.handler(async ({ data }) => {
		const order = await db.query.purchaseOrders.findFirst({
			where: eq(purchaseOrders.nfeKey, data.nfeKey),
			with: { supplier: true },
		});
		return order ?? null;
	});
