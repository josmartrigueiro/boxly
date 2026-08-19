import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";

type HeaderActionsContextValue = {
	portalContainer: HTMLDivElement | null;
	setPortalContainer: (container: HTMLDivElement | null) => void;
};

const HeaderActionsContext = createContext<HeaderActionsContextValue | null>(
	null,
);

export function HeaderActionsProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
		null,
	);

	return (
		<HeaderActionsContext.Provider
			value={{ portalContainer, setPortalContainer }}
		>
			{children}
		</HeaderActionsContext.Provider>
	);
}

export function useHeaderActions() {
	const context = useContext(HeaderActionsContext);
	if (!context) {
		throw new Error(
			"useHeaderActions must be used within a HeaderActionsProvider",
		);
	}
	return context;
}

export function HeaderActionsPortal({
	children,
}: {
	children: React.ReactNode;
}) {
	const { portalContainer } = useHeaderActions();

	if (!portalContainer) return null;

	return createPortal(children, portalContainer);
}
