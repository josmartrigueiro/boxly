const AUTH_ERROR_MESSAGES_PT_BR: Record<string, string> = {
	INVALID_EMAIL_OR_PASSWORD: "Email ou senha inválidos",
	INVALID_PASSWORD: "Senha inválida",
	USER_NOT_FOUND: "Usuário não encontrado",
	EMAIL_NOT_VERIFIED: "Email ainda não verificado",
	USER_ALREADY_EXISTS: "Já existe um usuário com esse email",
	FAILED_TO_CREATE_USER: "Não foi possível criar o usuário",
	INVALID_TOKEN: "Token inválido ou expirado",
	SESSION_EXPIRED: "Sua sessão expirou, faça login novamente",
	TOO_MANY_REQUESTS: "Muitas tentativas, aguarde um instante e tente novamente",
};

const FALLBACK_MESSAGE_PT_BR = "Não foi possível concluir a solicitação";

export function translateAuthError(code?: string | null): string {
	if (code && code in AUTH_ERROR_MESSAGES_PT_BR) {
		return AUTH_ERROR_MESSAGES_PT_BR[code];
	}
	return FALLBACK_MESSAGE_PT_BR;
}
