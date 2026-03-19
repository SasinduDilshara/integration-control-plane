import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from './graphql';

export interface MiUser {
  userId: string;
  isAdmin: boolean;
}

const GET_MI_USERS = `
  query GetMiUsers($componentId: String!, $runtimeId: String!) {
    getMiUsers(componentId: $componentId, runtimeId: $runtimeId) {
      users { userId, isAdmin }
    }
  }`;

const ADD_MI_USER = `
  mutation AddMiUser($componentId: String!, $runtimeId: String!, $userId: String!, $password: String!, $isAdmin: Boolean) {
    addMiUser(componentId: $componentId, runtimeId: $runtimeId, userId: $userId, password: $password, isAdmin: $isAdmin) {
      userId, status
    }
  }`;

const DELETE_MI_USER = `
  mutation DeleteMiUser($componentId: String!, $runtimeId: String!, $username: String!) {
    deleteMiUser(componentId: $componentId, runtimeId: $runtimeId, username: $username) {
      userId, status
    }
  }`;

const miUsersKey = (componentId: string, runtimeId: string) => ['mi-users', componentId, runtimeId] as const;

export function useListMiUsers(componentId: string, runtimeId: string, enabled = true) {
  return useQuery({
    queryKey: miUsersKey(componentId, runtimeId),
    queryFn: () =>
      gql<{ getMiUsers: { users: MiUser[] } }>(GET_MI_USERS, { componentId, runtimeId }).then((d) => d.getMiUsers.users),
    enabled: enabled && !!componentId && !!runtimeId,
  });
}

export function useCreateMiUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ componentId, runtimeId, userId, password, isAdmin }: { componentId: string; runtimeId: string; userId: string; password: string; isAdmin: boolean }) =>
      gql<{ addMiUser: { userId: string; status: string } }>(ADD_MI_USER, { componentId, runtimeId, userId, password, isAdmin }).then((d) => d.addMiUser),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: miUsersKey(vars.componentId, vars.runtimeId) }),
  });
}

export function useDeleteMiUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ componentId, runtimeId, username }: { componentId: string; runtimeId: string; username: string }) =>
      gql<{ deleteMiUser: { userId: string; status: string } }>(DELETE_MI_USER, { componentId, runtimeId, username }).then((d) => d.deleteMiUser),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: miUsersKey(vars.componentId, vars.runtimeId) }),
  });
}
