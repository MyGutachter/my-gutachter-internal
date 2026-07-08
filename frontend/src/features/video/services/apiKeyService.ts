import api from '../../../utils/api';

/**
 * API-key service (T7.6c) — rewired to the merged backend's ApiKeyController
 * (/api/keys/**). List returns items without the secret; generate returns the
 * secret exactly once.
 */
export interface ApiKey {
    id: string;
    name: string;
    key: string;
    active?: boolean;
    createdAt: string;
    lastUsedAt?: string | null;
}

export const getMyApiKeys = async (): Promise<ApiKey[]> => {
    const res = await api.get('/keys');
    return res.data;
};

export const generateApiKey = async (name: string): Promise<ApiKey> => {
    const res = await api.post('/keys/generate', { name });
    return res.data;
};

export const revokeApiKey = async (id: string): Promise<void> => {
    await api.delete(`/keys/${id}`);
};
