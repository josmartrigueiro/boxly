import { QueryClient } from "@tanstack/react-query";

export function getContext() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 60 * 5, // 5 minutos
				gcTime: 1000 * 60 * 10, // 10 minutos
			},
		},
	});

	return {
		queryClient,
	};
}
export default function TanstackQueryProvider() {}
