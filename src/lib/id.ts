import { randomUUID } from 'expo-crypto';

/** UUID v4 generated on the device, so rows never collide across devices after sync. */
export function newId(): string {
  return randomUUID();
}
