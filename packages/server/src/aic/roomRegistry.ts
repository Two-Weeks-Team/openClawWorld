/**
 * AIC Room Registry
 * Maps custom roomId (like 'aic_test') to Colyseus internal roomId
 * Used to look up rooms created for AIC agents
 */

const roomIdMapping: Map<string, string> = new Map();

export function registerRoom(customRoomId: string, colyseusRoomId: string): void {
  roomIdMapping.set(customRoomId, colyseusRoomId);
}

export function getColyseusRoomId(customRoomId: string): string | undefined {
  return roomIdMapping.get(customRoomId);
}

export function unregisterRoom(customRoomId: string): void {
  roomIdMapping.delete(customRoomId);
}

export function hasRoom(customRoomId: string): boolean {
  return roomIdMapping.has(customRoomId);
}
