import { useEffect, useState } from "react";

const STORAGE_KEY = "boxly:tiktok-commission";
export const DEFAULT_TIKTOK_COMMISSION = 6;

function readStoredCommission(): number {
	if (typeof window === "undefined") return DEFAULT_TIKTOK_COMMISSION;
	const stored = window.localStorage.getItem(STORAGE_KEY);
	const parsed = stored ? Number(stored) : Number.NaN;
	return Number.isFinite(parsed) && parsed >= 0
		? parsed
		: DEFAULT_TIKTOK_COMMISSION;
}

// Guarda a taxa de comissão do TikTok Shop no navegador (mesmo esquema do
// limite de estoque baixo) até termos uma tabela de configurações no banco.
export function useTiktokCommission() {
	const [commission, setCommission] = useState(DEFAULT_TIKTOK_COMMISSION);

	useEffect(() => {
		setCommission(readStoredCommission());
	}, []);

	function updateCommission(value: number) {
		setCommission(value);
		window.localStorage.setItem(STORAGE_KEY, String(value));
	}

	return { commission, setCommission: updateCommission };
}
