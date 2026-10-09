import { APP_NAME } from '@/lib/appInfo';

// Smoke test: proves that Jest runs TypeScript and resolves the "@/" alias.
describe('appInfo', () => {
  it('exposes the app name', () => {
    expect(APP_NAME).toBe('granato');
  });
});
