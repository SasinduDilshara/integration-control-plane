import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from './graphql';

export interface MiUser {
  username: string;
  isAdmin: boolean;
}

const GET_MI_USERS = `
  query GetMIUsers($componentId: String!, $runtimeId: String!) {
    getMIUsers(componentId: $componentId, runtimeId: $runtimeId) {
      users { username, isAdmin }
    }
  }`;

const ADD_MI_USER = `
  mutation AddMIUser($componentId: String!, $runtimeId: String!, $username: String!, $password: String!, $isAdmin: Boolean) {
    addMIUser(componentId: $componentId, runtimeId: $runtimeId, username: $username, password: $password, isAdmin: $isAdmin) {
      username, status
    }
  }`;

const DELETE_MI_USER = `
  mutation DeleteMIUser($componentId: String!, $runtimeId: String!, $username: String!) {
    deleteMIUser(componentId: $componentId, runtimeId: $runtimeId, username: $username) {
      username, status
    }
  }`;

const miUsersKey = (componentId: string, runtimeId: string) => ['mi-users', componentId, runtimeId] as const;

export function useListMiUsers(componentId: string, runtimeId: string, enabled = true) {
  return useQuery({
    queryKey: miUsersKey(componentId, runtimeId),
    queryFn: () => gql<{ getMIUsers: { users: MiUser[] } }>(GET_MI_USERS, { componentId, runtimeId }).then((d) => d.getMIUsers.users),
    enabled: enabled && !!componentId && !!runtimeId,
  });
}

export function useCreateMiUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ componentId, runtimeId, username, password, isAdmin }: { componentId: string; runtimeId: string; username: string; password: string; isAdmin: boolean }) =>
      gql<{ addMIUser: { username: string; status: string } }>(ADD_MI_USER, { componentId, runtimeId, username, password, isAdmin }).then((d) => d.addMIUser),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: miUsersKey(vars.componentId, vars.runtimeId) }),
  });
}

export function useDeleteMiUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ componentId, runtimeId, username }: { componentId: string; runtimeId: string; username: string }) =>
      gql<{ deleteMIUser: { username: string; status: string } }>(DELETE_MI_USER, { componentId, runtimeId, username }).then((d) => d.deleteMIUser),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: miUsersKey(vars.componentId, vars.runtimeId) }),
  });
}
