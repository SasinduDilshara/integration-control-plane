import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '../auth/tokenManager';

async function miUsersFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${window.API_CONFIG.authBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.message) message = parsed.message;
    } catch {
      // use raw body
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export interface MiUser {
  userId: string;
  isAdmin: boolean;
}

const miUsersKey = (componentId: string, runtimeId: string) => ['mi-users', componentId, runtimeId] as const;

export function useListMiUsers(componentId: string, runtimeId: string, enabled = true) {
  return useQuery({
    queryKey: miUsersKey(componentId, runtimeId),
    queryFn: () =>
      miUsersFetch<{ users: MiUser[] }>(`/api/components/${componentId}/runtimes/${runtimeId}/mi-users`).then(
        (d) => d.users,
      ),
    enabled: enabled && !!componentId && !!runtimeId,
  });
}

export function useCreateMiUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      componentId,
      runtimeId,
      userId,
      password,
      isAdmin,
    }: {
      componentId: string;
      runtimeId: string;
      userId: string;
      password: string;
      isAdmin: boolean;
    }) =>
      miUsersFetch<{ userId: string; status: string }>(
        `/api/components/${componentId}/runtimes/${runtimeId}/mi-users`,
        { method: 'POST', body: JSON.stringify({ userId, password, isAdmin }) },
      ),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: miUsersKey(vars.componentId, vars.runtimeId) }),
  });
}

export function useDeleteMiUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ componentId, runtimeId, username }: { componentId: string; runtimeId: string; username: string }) =>
      miUsersFetch<{ userId: string; status: string }>(
        `/api/components/${componentId}/runtimes/${runtimeId}/mi-users/${encodeURIComponent(username)}`,
        { method: 'DELETE' },
      ),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: miUsersKey(vars.componentId, vars.runtimeId) }),
  });
}
