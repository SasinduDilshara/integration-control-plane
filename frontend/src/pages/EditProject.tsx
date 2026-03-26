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

import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, PageContent, Stack, TextField, Typography } from '@wso2/oxygen-ui';
import { ArrowLeft, Trash2 } from '@wso2/oxygen-ui-icons-react';
import { useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useProjects, type GqlProject } from '../api/queries';
import { useUpdateProject, useDeleteProject } from '../api/mutations';
import { orgProjectsUrl } from '../paths';

function EditProjectForm({ project, orgHandler }: { project: GqlProject; orgHandler: string }): JSX.Element {
  const navigate = useNavigate();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();
  const backUrl = orgProjectsUrl(orgHandler);
  const isDirty = name !== project.name || description !== (project.description ?? '');

  const save = () => {
    setError(null);
    updateMutation.mutate(
      { id: project.id, orgId: project.orgId, name: name.trim(), description, version: project.version },
      {
        onSuccess: () => navigate(backUrl, { state: { updated: true, name: name.trim() } }),
        onError: (err) => setError(err.message ?? 'Failed to update project. Please try again.'),
      },
    );
  };

  const handleDelete = () => {
    setDeleteError(null);
    deleteMutation.mutate(
      { orgId: project.orgId, projectId: project.id },
      {
        onSuccess: (result) => {
          if (result.status === 'success') {
            navigate(backUrl, { state: { deleted: true, name: project.name } });
          } else {
            const statusMsg = result.status ? ` (Status: ${result.status})` : '';
            setDeleteError(result.details ?? `Failed to delete project. Please try again.${statusMsg}`);
          }
        },
        onError: (err) => setDeleteError(err.message ?? 'Failed to delete project. Please try again.'),
      },
    );
  };

  const handleCloseDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteError(null);
    setConfirmText('');
  };

  return (
    <PageContent>
      <Button startIcon={<ArrowLeft size={16} />} onClick={() => navigate(backUrl)} sx={{ mb: 2 }}>
        Back to Projects
      </Button>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Typography variant="h1">Edit Project</Typography>
        <Button variant="outlined" color="error" startIcon={<Trash2 size={18} />} onClick={() => setDeleteDialogOpen(true)}>
          Delete Project
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3, maxWidth: 600 }}>
          {error}
        </Alert>
      )}

      <Stack gap={3} sx={{ maxWidth: 600, mb: 4 }}>
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
        <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline rows={3} />
        <TextField label="Handler" value={project.handler} fullWidth disabled helperText="Handler cannot be changed" />
      </Stack>

      <Stack direction="row" gap={2}>
        <Button variant="outlined" onClick={() => navigate(backUrl)}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={!name.trim() || !isDirty || updateMutation.isPending}>
          Save
        </Button>
      </Stack>

      <Dialog open={deleteDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete the project "{project.name}"? This action cannot be undone and will remove all associated data.</DialogContentText>
          <DialogContentText sx={{ mt: 2, mb: 1 }}>
            Type <strong>{project.name}</strong> to confirm:
          </DialogContentText>
          <TextField fullWidth label="Confirm project name" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={project.name} autoFocus helperText={`Type "${project.name}" to enable deletion`} />
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button color="error" onClick={handleDelete} disabled={confirmText !== project.name || deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContent>
  );
}

export default function EditProject(): JSX.Element {
  const { orgHandler = 'default', projectId = '' } = useParams();
  const { data: projects, isLoading, isError } = useProjects();

  if (isLoading)
    return (
      <PageContent>
        <CircularProgress sx={{ display: 'block', mx: 'auto', py: 8 }} />
      </PageContent>
    );
  if (isError)
    return (
      <PageContent>
        <Typography>Failed to load projects</Typography>
      </PageContent>
    );
  const project = projects?.find((p) => p.id === projectId);
  if (!project)
    return (
      <PageContent>
        <Typography>Project not found</Typography>
      </PageContent>
    );

  return <EditProjectForm project={project} orgHandler={orgHandler} />;
}
