import {
  Table,
  TableColumn,
  Progress,
  ResponseErrorPanel,
  InfoCard,
} from '@backstage/core-components';
import useAsync from 'react-use/lib/useAsync';
import { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@material-ui/core';
import { Snackbar, Alert } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@material-ui/icons';

type Component = {
  componentId: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  project: {
    projectId: string;
    name: string;
  };
};

type Props = {
  projectId?: string;
};

export const IComponentFetchComponent = ({ projectId }: Props) => {
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [componentToDelete, setComponentToDelete] = useState<Component | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const { value, loading, error } = useAsync(async (): Promise<Component[]> => {
    if (!projectId) return [];
    const response = await fetch('http://localhost:9446/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query Components {\n  components(projectId: \"${projectId}\") {\n    componentId\n    name\n    description\n    createdBy\n    createdAt\n    updatedAt\n    updatedBy\n    project {\n      projectId\n      name\n    }\n  }\n}`,
      }),
    });
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data?.components || [];
  }, [projectId, refreshIndex]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setName('');
    setDescription('');
  };

  const handleCreateComponent = async () => {
    try {
      const response = await fetch('http://localhost:9446/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation CreateComponent {\n  createComponent(component: { projectId: \"${projectId}\", name: \"${name}\", description: \"${description}\" }) {\n    componentId\n    name\n    description\n    createdBy\n    createdAt\n    updatedAt\n    updatedBy\n  }\n}`,
        }),
      });
      const json = await response.json();
      if (json.errors) {
        setSnackbarMsg('Error creating component: ' + json.errors[0].message);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } else {
        setSnackbarMsg('Component created successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setRefreshIndex(i => i + 1);
        handleClose();
      }
    } catch (err: any) {
      setSnackbarMsg('Network error: ' + err.message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleEditOpen = (component: Component) => {
    setEditingComponent(component);
    setName(component.name);
    setDescription(component.description);
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditingComponent(null);
    setName('');
    setDescription('');
  };

  const handleUpdateComponent = async () => {
    if (!editingComponent) return;

    try {
      const response = await fetch('http://localhost:9446/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation UpdateComponent {
            updateComponent(componentId: "${editingComponent.componentId}", name: "${name}", description: "${description}") {
              componentId
              name
              description
              createdBy
              createdAt
              updatedAt
              updatedBy
            }
          }`,
        }),
      });
      const json = await response.json();
      if (json.errors) {
        setSnackbarMsg('Error updating component: ' + json.errors[0].message);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } else {
        setSnackbarMsg('Component updated successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setRefreshIndex(i => i + 1);
        handleEditClose();
      }
    } catch (err: any) {
      setSnackbarMsg('Network error: ' + err.message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleDeleteOpen = (component: Component) => {
    setComponentToDelete(component);
    setDeleteInput('');
    setDeleteOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteOpen(false);
    setComponentToDelete(null);
    setDeleteInput('');
  };

  const handleDeleteComponent = async () => {
    if (!componentToDelete) return;

    try {
      const response = await fetch('http://localhost:9446/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation DeleteComponent {
            deleteComponent(componentId: "${componentToDelete.componentId}")
          }`,
        }),
      });
      const json = await response.json();
      if (json.errors) {
        setSnackbarMsg('Error deleting component: ' + json.errors[0].message);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } else {
        setSnackbarMsg('Component deleted successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setRefreshIndex(i => i + 1);
        handleDeleteClose();
      }
    } catch (err: any) {
      setSnackbarMsg('Network error: ' + err.message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  if (!projectId) {
    return <InfoCard title="No project selected">Select a project to view components.</InfoCard>;
  }
  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  const columns: TableColumn[] = [
    { title: 'Component ID', field: 'componentId' },
    { title: 'Name', field: 'name' },
    { title: 'Description', field: 'description' },
    { title: 'Created By', field: 'createdBy' },
    {
      title: 'Created At',
      field: 'createdAt',
      render: (data) => {
        const row = data as Component;
        return row.createdAt ? new Date(row.createdAt).toLocaleString() : '';
      },
    },
    { title: 'Updated By', field: 'updatedBy' },
    {
      title: 'Updated At',
      field: 'updatedAt',
      render: (data) => {
        const row = data as Component;
        return row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '';
      },
    },
    {
      title: 'Actions',
      render: (data) => {
        const row = data as Component;
        return (
          <div>
            <IconButton
              onClick={() => handleEditOpen(row)}
              size="small"
              title="Edit component"
            >
              <EditIcon />
            </IconButton>
            <IconButton
              onClick={() => handleDeleteOpen(row)}
              size="small"
              title="Delete component"
            >
              <DeleteIcon />
            </IconButton>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Button variant="contained" color="primary" onClick={handleOpen} style={{ marginBottom: 16 }}>
        Create Component
      </Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Create Component</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">Cancel</Button>
          <Button onClick={handleCreateComponent} color="primary" disabled={!name || !description}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={handleEditClose}>
        <DialogTitle>Edit Component</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose} color="secondary">Cancel</Button>
          <Button onClick={handleUpdateComponent} color="primary" disabled={!name || !description}>Update</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={handleDeleteClose}>
        <DialogTitle>Delete Component</DialogTitle>
        <DialogContent>
          <p>Type the component name (<b>{componentToDelete?.name}</b>) to confirm deletion:</p>
          <TextField
            autoFocus
            margin="dense"
            label="Component Name"
            type="text"
            fullWidth
            value={deleteInput}
            onChange={e => setDeleteInput(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose} color="secondary">Cancel</Button>
          <Button onClick={handleDeleteComponent} color="primary" disabled={deleteInput !== componentToDelete?.name}>Delete</Button>
        </DialogActions>
      </Dialog>
      <Table
        title="Components"
        options={{ search: true, paging: true, pageSize: 10 }}
        columns={columns}
        data={value || []}
      />
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </>
  );
};

