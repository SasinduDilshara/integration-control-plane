/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  ListingTable,
  PageContent,
  PageTitle,
  Stack,
  TablePagination,
  Typography,
} from '@wso2/oxygen-ui';
import { Check, Copy, FileText, Plus, Trash2, X } from '@wso2/oxygen-ui-icons-react';
import SearchField from '../components/SearchField';
import { LogFilesDrawer } from '../components/LogFilesDrawer';
import { useCallback, useEffect, useState, type JSX } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { gql } from '../api/graphql';
import { useProjectByHandler, useEnvironments, useComponentByHandler, useComponentSecrets, RUNTIMES_QUERY, PROJECT_RUNTIMES_QUERY, COMPONENT_SECRETS_QUERY, type GqlRuntime, type GqlBoundSecret } from '../api/queries';
import { useCreateOrgSecret, useDeleteRuntime, useRevokeOrgSecret } from '../api/mutations';
import { hasComponent, type ProjectScope, type ComponentScope } from '../nav';
import { formatDistanceToNow } from '../utils/time';
import Authorized from '../components/Authorized';
import { Permissions } from '../constants/permissions';
import { useAccessControl } from '../contexts/AccessControlContext';

const drawerSx = {
  '& .MuiDrawer-paper': { width: '45%', maxWidth: 560, minWidth: 360, position: 'fixed', top: 64, height: 'calc(100% - 64px)', borderLeft: '1px solid', borderColor: 'divider' },
};

function formatPlatform(r: GqlRuntime): string {
  if (!r.platformVersion) return r.platformName ?? '—';
  return /^\d/.test(r.platformVersion) ? `${r.platformName} ${r.platformVersion}` : r.platformVersion;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
}

function miToml(envName: string, secret: string, projectHandle: string, integrationHandle: string): string {
  return `[icp_config]
enabled = true
environment = "${envName}"
project = "${projectHandle}"
integration = "${integrationHandle}"
runtime = "<unique id for the runtime>"
secret = "${secret}"
# icp_url = "https://<hostname>:9443"`;
}

function biToml(envName: string, secret: string, projectHandle: string, integrationHandle: string): string {
  return `[wso2.icp.runtime.bridge]
environment = "${envName}"
project = "${projectHandle}"
integration = "${integrationHandle}"
runtime = "<unique id for the runtime>"
secret = "${secret}"
# serverUrl="https://<hostname>:9445"`;
}

function AddRuntimeModal({
  environmentId,
  environmentName,
  componentId,
  componentType,
  projectHandle,
  integrationHandle,
  onClose,
}: {
  environmentId: string;
  environmentName: string;
  componentId: string;
  componentType?: string;
  projectHandle: string;
  integrationHandle: string;
  onClose: () => void;
}) {
  const createMutation = useCreateOrgSecret();
  const queryClient = useQueryClient();
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBI = componentType === 'BI';

  const handleGenerate = () => {
    setError(null);
    createMutation.mutate(
      { environmentId, componentId },
      {
        onSuccess: (s) => {
          setSecret(s);
          if (componentId) {
            queryClient.invalidateQueries({ queryKey: ['componentSecrets', componentId, environmentId] });
          }
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  const config = secret ? (isBI ? biToml(environmentName, secret, projectHandle, integrationHandle) : miToml(environmentName, secret, projectHandle, integrationHandle)) : null;

  const handleCopy = async () => {
    if (!config) return;
    await navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDialogClose = (_event: unknown, reason: string) => {
    if (createMutation.isPending && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return;
    onClose();
  };

  return (
    <Dialog open onClose={handleDialogClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Runtime for {environmentName}</DialogTitle>
      <DialogContent>
        {!secret ? (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <DialogContentText sx={{ mb: 2 }}>
              Generate a new secret for <strong>{environmentName}</strong> environment.
            </DialogContentText>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>The secret will be shown once — copy it before closing.</strong>
            </Alert>
            <Button variant="contained" onClick={handleGenerate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Generating...' : 'Generate Secret'}
            </Button>
          </>
        ) : (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Copy this secret now. It will not be shown again.
            </Alert>
            <DialogContentText sx={{ mb: 1 }}>
              Add the following configuration to your runtime's <strong>{isBI ? 'Config.toml' : 'deployment.toml'}</strong> file:
            </DialogContentText>
            <Box sx={{ position: 'relative' }}>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                {config}
              </Box>
              <IconButton size="small" onClick={handleCopy} sx={{ position: 'absolute', top: 8, right: 8 }} aria-label="Copy">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </IconButton>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={createMutation.isPending}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function BoundSecretDrawer({ componentId, environmentId, environmentName, onClose }: { componentId: string; environmentId: string; environmentName: string; onClose: () => void }) {
  const { data: secrets = [], isLoading } = useComponentSecrets(componentId, environmentId);
  const revokeMutation = useRevokeOrgSecret();
  const [revoking, setRevoking] = useState<string | null>(null);

  const confirmRevoke = (keyId: string) => {
    revokeMutation.mutate(keyId, { onSettled: () => setRevoking(null) });
  };

  return (
    <Drawer anchor="right" open variant="persistent" sx={drawerSx}>
      <Stack sx={{ p: 3, height: '100%', overflow: 'auto' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">
            Secrets: <strong>{environmentName}</strong> environment
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="close">
            <X size={18} />
          </IconButton>
        </Stack>
        <Divider sx={{ mb: 2 }} />

        {isLoading ? (
          <CircularProgress sx={{ mx: 'auto', my: 4 }} />
        ) : secrets.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No bound secrets for this component in this environment.
          </Typography>
        ) : (
          <ListingTable>
            <ListingTable.Head>
              <ListingTable.Row>
                <ListingTable.Cell>Key ID</ListingTable.Cell>
                <ListingTable.Cell>Created</ListingTable.Cell>
                <ListingTable.Cell>Created By</ListingTable.Cell>
                <ListingTable.Cell>Runtimes</ListingTable.Cell>
                <ListingTable.Cell align="right">Action</ListingTable.Cell>
              </ListingTable.Row>
            </ListingTable.Head>
            <ListingTable.Body>
              {secrets.map((secret) => (
                <ListingTable.Row key={secret.keyId}>
                  <ListingTable.Cell>
                    <code>{secret.keyId}....</code>
                  </ListingTable.Cell>
                  <ListingTable.Cell>{formatDistanceToNow(secret.createdAt)}</ListingTable.Cell>
                  <ListingTable.Cell>{secret.createdBy ?? '—'}</ListingTable.Cell>
                  <ListingTable.Cell>
                    {secret.runtimes.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    ) : (
                      <Stack direction="row" gap={0.5} flexWrap="wrap">
                        {secret.runtimes.map((rt) => (
                          <Chip key={rt.runtimeId} label={rt.runtimeId} size="small" color={rt.status === 'RUNNING' ? 'success' : 'default'} />
                        ))}
                      </Stack>
                    )}
                  </ListingTable.Cell>
                  <ListingTable.Cell align="right">
                    <IconButton size="small" color="error" aria-label={`Revoke ${secret.keyId}`} onClick={() => setRevoking(secret.keyId)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </ListingTable.Cell>
                </ListingTable.Row>
              ))}
            </ListingTable.Body>
          </ListingTable>
        )}
      </Stack>

      {revoking && (
        <Dialog open onClose={() => setRevoking(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Revoke Secret</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Revoke secret <strong>{revoking}....</strong>? Any runtime using this secret will no longer be able to authenticate.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRevoking(null)}>Cancel</Button>
            <Button variant="contained" color="error" disabled={revokeMutation.isPending} onClick={() => confirmRevoke(revoking)}>
              Revoke
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Drawer>
  );
}

function EnvironmentRuntimeCard({
  environmentName,
  environmentId,
  componentId,
  componentType,
  projectHandle,
  integrationHandle,
  runtimes,
  onDelete,
  onViewLogs,
  autoOpenAddRuntime,
  onAutoOpenConsumed,
}: {
  environmentName: string;
  environmentId: string;
  componentId: string | undefined;
  componentType?: string;
  projectHandle: string;
  integrationHandle: string;
  runtimes: GqlRuntime[];
  onDelete: (runtime: GqlRuntime) => void;
  onViewLogs: (runtime: GqlRuntime) => void;
  autoOpenAddRuntime?: boolean;
  onAutoOpenConsumed?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { hasAnyPermission } = useAccessControl();

  useEffect(() => {
    if (!autoOpenAddRuntime || !componentId) return;
    if (!hasAnyPermission([Permissions.INTEGRATION_MANAGE], undefined, componentId)) return;
    setAddOpen(true);
    onAutoOpenConsumed?.();
  }, [autoOpenAddRuntime, componentId, hasAnyPermission, onAutoOpenConsumed]);

  const filtered = runtimes.filter((r) => !query || r.runtimeId.toLowerCase().includes(query.toLowerCase()) || r.runtimeType.toLowerCase().includes(query.toLowerCase()) || (r.component?.displayName ?? '').toLowerCase().includes(query.toLowerCase()));
  const maxPage = Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1);
  const safePage = Math.min(page, maxPage);
  const paged = filtered.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage);

  return (
    <>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                {environmentName}
              </Typography>
              <Chip label={`${filtered.length} runtime${filtered.length !== 1 ? 's' : ''}`} size="small" color={filtered.length > 0 ? 'primary' : 'default'} />
            </Stack>
            {componentId && (
              <Authorized permissions={[Permissions.INTEGRATION_MANAGE]}>
                <Stack direction="row" gap={1}>
                  <Button variant="outlined" size="small" onClick={() => setDrawerOpen(true)}>
                    Manage Secrets
                  </Button>
                  <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
                    Add Runtime
                  </Button>
                </Stack>
              </Authorized>
            )}
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <SearchField value={query} onChange={setQuery} placeholder="Search runtimes..." sx={{ mb: 2, width: '100%', maxWidth: 400 }} />
          {filtered.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              {query ? 'No runtimes match your search.' : 'No runtimes registered for this environment.'}
            </Typography>
          ) : (
            <>
              <ListingTable>
                <ListingTable.Head>
                  <ListingTable.Row>
                    <ListingTable.Cell>Runtime Name</ListingTable.Cell>
                    <ListingTable.Cell>Runtime ID</ListingTable.Cell>
                    <ListingTable.Cell>Type</ListingTable.Cell>
                    <ListingTable.Cell>Status</ListingTable.Cell>
                    <ListingTable.Cell>Version</ListingTable.Cell>
                    <ListingTable.Cell>Platform</ListingTable.Cell>
                    <ListingTable.Cell>OS</ListingTable.Cell>
                    <ListingTable.Cell>Registration Time</ListingTable.Cell>
                    <ListingTable.Cell>Last Heartbeat</ListingTable.Cell>
                    <ListingTable.Cell>Actions</ListingTable.Cell>
                  </ListingTable.Row>
                </ListingTable.Head>
                <ListingTable.Body>
                  {paged.map((r) => (
                    <ListingTable.Row key={r.runtimeId}>
                      <ListingTable.Cell>{r.runtimeName || r.runtimeId}</ListingTable.Cell>
                      <ListingTable.Cell>{r.runtimeId}</ListingTable.Cell>
                      <ListingTable.Cell>{r.runtimeType}</ListingTable.Cell>
                      <ListingTable.Cell>
                        <Chip label={r.status} size="small" color={r.status === 'RUNNING' ? 'success' : 'default'} />
                      </ListingTable.Cell>
                      <ListingTable.Cell>{r.version || '—'}</ListingTable.Cell>
                      <ListingTable.Cell>
                        <Typography variant="body2">{formatPlatform(r)}</Typography>
                        {r.platformHome && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {r.platformHome}
                          </Typography>
                        )}
                      </ListingTable.Cell>
                      <ListingTable.Cell>{[r.osName, r.osVersion].filter(Boolean).join(' ')}</ListingTable.Cell>
                      <ListingTable.Cell>{r.registrationTime ? formatDate(r.registrationTime) : '—'}</ListingTable.Cell>
                      <ListingTable.Cell>{r.lastHeartbeat ? formatDate(r.lastHeartbeat) : '—'}</ListingTable.Cell>
                      <ListingTable.Cell>
                        <Stack direction="row" gap={0.5}>
                          {r.runtimeType === 'MI' && (
                            <IconButton size="small" color="primary" aria-label={`View logs for ${r.runtimeId}`} disabled={r.status !== 'RUNNING'} onClick={() => onViewLogs(r)} title="View Logs">
                              <FileText size={16} />
                            </IconButton>
                          )}
                          <IconButton size="small" color="error" aria-label={`Delete runtime ${r.runtimeId}`} disabled={r.status === 'RUNNING'} onClick={() => onDelete(r)}>
                            <Trash2 size={16} />
                          </IconButton>
                        </Stack>
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  ))}
                </ListingTable.Body>
              </ListingTable>
              {filtered.length > rowsPerPage && (
                <TablePagination
                  sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 1 }}
                  component="div"
                  count={filtered.length}
                  page={safePage}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 25]}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {drawerOpen && componentId && <BoundSecretDrawer componentId={componentId} environmentId={environmentId} environmentName={environmentName} onClose={() => setDrawerOpen(false)} />}
      {addOpen && componentId && (
        <AddRuntimeModal environmentId={environmentId} environmentName={environmentName} componentId={componentId} componentType={componentType} projectHandle={projectHandle} integrationHandle={integrationHandle} onClose={() => setAddOpen(false)} />
      )}
    </>
  );
}

function isSoleUser(secrets: GqlBoundSecret[], runtimeId: string): string | null {
  for (const s of secrets) {
    if (s.runtimes.length === 1 && s.runtimes[0].runtimeId === runtimeId) return s.keyId;
  }
  return null;
}

export default function Runtime(scope: ProjectScope | ComponentScope): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: project } = useProjectByHandler(scope.project);
  const projectId = project?.id ?? '';
  const projectHandle = project?.handler ?? scope.project;
  const { data: component } = useComponentByHandler(projectId, hasComponent(scope) ? scope.component : undefined);
  const componentId = component?.id;
  const integrationHandle = component?.handler || (hasComponent(scope) ? scope.component : '');
  const { data: environments = [] } = useEnvironments(projectId);

  const [deleting, setDeleting] = useState<GqlRuntime | null>(null);
  const [alsoRevoke, setAlsoRevoke] = useState(false);
  const [viewingLogs, setViewingLogs] = useState<GqlRuntime | null>(null);
  const deleteMutation = useDeleteRuntime();
  const params = new URLSearchParams(location.search);
  const shouldAutoOpenAddRuntime = params.get('action') === 'add-runtime';
  const autoOpenEnvironmentId = params.get('environmentId');

  const clearAutoOpenAction = useCallback(() => {
    if (!shouldAutoOpenAddRuntime) return;
    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('action');
    nextParams.delete('environmentId');
    navigate(
      {
        pathname: location.pathname,
        search: nextParams.toString() ? `?${nextParams.toString()}` : '',
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate, shouldAutoOpenAddRuntime]);

  const runtimeQueries = useQueries({
    queries: environments.map((env) => ({
      queryKey: componentId ? ['runtimes', env.id, projectId, componentId] : ['runtimes', env.id, projectId],
      queryFn: () => gql<{ runtimes: GqlRuntime[] }>(componentId ? RUNTIMES_QUERY : PROJECT_RUNTIMES_QUERY, componentId ? { environmentId: env.id, projectId, componentId } : { environmentId: env.id, projectId }).then((d) => d.runtimes),
      enabled: hasComponent(scope) ? componentId !== undefined : true,
    })),
  });

  const secretQueries = useQueries({
    queries: environments.map((env) => ({
      queryKey: ['componentSecrets', componentId ?? '', env.id],
      queryFn: () => gql<{ componentSecrets: GqlBoundSecret[] }>(COMPONENT_SECRETS_QUERY, { componentId, environmentId: env.id }).then((d) => d.componentSecrets),
      enabled: !!componentId,
    })),
  });

  const isLoading = runtimeQueries.some((q) => q.isLoading);

  const deletingEnvIndex = deleting ? environments.findIndex((_, i) => runtimeQueries[i]?.data?.some((r) => r.runtimeId === deleting.runtimeId)) : -1;
  const deletingEnvSecrets = deletingEnvIndex >= 0 ? (secretQueries[deletingEnvIndex]?.data ?? []) : [];
  const orphanedKeyId = deleting ? isSoleUser(deletingEnvSecrets, deleting.runtimeId) : null;

  const handleStartDelete = (r: GqlRuntime) => {
    setDeleting(r);
    setAlsoRevoke(false);
  };

  const handleConfirmDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(
      { runtimeId: deleting.runtimeId, revokeSecret: alsoRevoke || undefined },
      {
        onSuccess: () => {
          setDeleting(null);
          setAlsoRevoke(false);
        },
      },
    );
  };

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Runtime</PageTitle.Header>
      </PageTitle>

      {isLoading ? (
        <CircularProgress sx={{ display: 'block', mx: 'auto', py: 8 }} />
      ) : (
        <>
          {environments.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>
              No environments found. Create an environment to register runtimes.
            </Typography>
          ) : (
            environments.map((env, index) => {
              const runtimes = runtimeQueries[index]?.data ?? [];
              return (
                <EnvironmentRuntimeCard
                  key={env.id}
                  environmentName={env.name}
                  environmentId={env.id}
                  componentId={componentId}
                  componentType={component?.componentType}
                  projectHandle={projectHandle}
                  integrationHandle={integrationHandle}
                  runtimes={runtimes}
                  onDelete={handleStartDelete}
                  onViewLogs={setViewingLogs}
                  autoOpenAddRuntime={shouldAutoOpenAddRuntime && (autoOpenEnvironmentId ? env.id === autoOpenEnvironmentId : index === 0)}
                  onAutoOpenConsumed={clearAutoOpenAction}
                />
              );
            })
          )}
        </>
      )}

      {viewingLogs && <LogFilesDrawer runtimeId={viewingLogs.runtimeId} onClose={() => setViewingLogs(null)} />}

      {deleting && (
        <Dialog open onClose={() => setDeleting(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Delete Runtime</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete runtime <strong>{deleting.runtimeId}</strong>?
            </DialogContentText>
            {orphanedKeyId && (
              <FormControlLabel
                sx={{ mt: 1 }}
                control={<Checkbox checked={alsoRevoke} onChange={(_, v) => setAlsoRevoke(v)} />}
                label={
                  <Typography variant="body2">
                    Also revoke secret <code>{orphanedKeyId}....</code> (no other runtimes use it)
                  </Typography>
                }
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="contained" color="error" disabled={deleteMutation.isPending} onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </PageContent>
  );
}
