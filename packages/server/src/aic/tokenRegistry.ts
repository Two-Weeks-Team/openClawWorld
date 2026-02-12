type TokenEntry = {
  agentId: string;
  roomId: string;
  createdAt: number;
};

const tokenToAgent = new Map<string, TokenEntry>();
const agentToToken = new Map<string, string>();

export function registerToken(token: string, agentId: string, roomId: string): void {
  const existingToken = agentToToken.get(agentId);
  if (existingToken) {
    tokenToAgent.delete(existingToken);
  }

  tokenToAgent.set(token, { agentId, roomId, createdAt: Date.now() });
  agentToToken.set(agentId, token);
}

export function getAgentIdFromToken(token: string): string | null {
  return tokenToAgent.get(token)?.agentId ?? null;
}

export function getRoomIdFromToken(token: string): string | null {
  return tokenToAgent.get(token)?.roomId ?? null;
}

export function invalidateToken(token: string): boolean {
  const entry = tokenToAgent.get(token);
  if (!entry) return false;

  tokenToAgent.delete(token);
  agentToToken.delete(entry.agentId);
  return true;
}

export function invalidateAgentToken(agentId: string): boolean {
  const token = agentToToken.get(agentId);
  if (!token) return false;

  tokenToAgent.delete(token);
  agentToToken.delete(agentId);
  return true;
}
