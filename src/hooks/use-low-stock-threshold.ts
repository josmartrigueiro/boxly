import { useEffect, useState } from "react";

const STORAGE_KEY = "boxly:low-stock-threshold";
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

function readStoredThreshold(): number {
	if (typeof window === "undefined") return DEFAULT_LOW_STOCK_THRESHOLD;
	const stored = window.localStorage.getItem(STORAGE_KEY);
	const parsed = stored ? Number(stored) : Number.NaN;
	return Number.isFinite(parsed) && parsed > 0
		? parsed
		: DEFAULT_LOW_STOCK_THRESHOLD;
}

// Guarda o limite de "estoque baixo" no navegador (ainda não temos uma
// tabela de configurações no banco) para valer em toda a listagem.
export function useLowStockThreshold() {
	const [threshold, setThreshold] = useState(DEFAULT_LOW_STOCK_THRESHOLD);

	useEffect(() => {
		setThreshold(readStoredThreshold());
	}, []);

	function updateThreshold(value: number) {
		setThreshold(value);
		window.localStorage.setItem(STORAGE_KEY, String(value));
	}

	return { threshold, setThreshold: updateThreshold };
}
