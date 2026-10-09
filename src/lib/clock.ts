import type { EpochMs } from '@/domain/types';

/** Single place where the app reads the current time; services receive it from here. */
export function now(): EpochMs {
  return Date.now();
}
