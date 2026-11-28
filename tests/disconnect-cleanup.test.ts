import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getDocs: vi.fn(), deleteDoc: vi.fn(), setDoc: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, handleFirestoreError: vi.fn(), OperationType: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...parts: string[]) => parts.join('/'),
  doc: (_db: unknown, ...parts: string[]) => parts.join('/'),
  getDocs: mocks.getDocs,
  deleteDoc: mocks.deleteDoc,
  setDoc: mocks.setDoc,
}));
import { clearAllUserData } from '@/lib/firestore-service';

beforeEach(() => {
  mocks.getDocs.mockReset().mockResolvedValue({ docs: [] });
  mocks.deleteDoc.mockReset().mockResolvedValue(undefined);
  mocks.setDoc.mockReset().mockResolvedValue(undefined);
});

describe('Google Ads disconnect cleanup', () => {
  it('clears data and persists an explicitly disconnected account', async () => {
    await clearAllUserData('user-123');
    expect(mocks.deleteDoc).toHaveBeenCalledWith('users/user-123/tokens/google_ads');
    expect(mocks.setDoc).toHaveBeenCalledWith('users/user-123/accounts/primary', expect.objectContaining({
      isConnected: false, clientCustomerId: 'Not Connected',
    }));
  });

  it('propagates collection and account write failures instead of reporting success', async () => {
    mocks.getDocs.mockRejectedValueOnce(new Error('read failed'));
    await expect(clearAllUserData('user-123')).rejects.toThrow('read failed');
    expect(mocks.setDoc).not.toHaveBeenCalled();
    mocks.getDocs.mockResolvedValue({ docs: [] });
    mocks.setDoc.mockRejectedValueOnce(new Error('write failed'));
    await expect(clearAllUserData('user-123')).rejects.toThrow('write failed');
  });
});
