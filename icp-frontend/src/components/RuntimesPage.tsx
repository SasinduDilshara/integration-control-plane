import React, { useState, useMemo } from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    Typography,
    Snackbar,
    Tooltip,
} from '@mui/material';
import { Alert } from '@mui/lab';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import {
    MaterialReactTable,
    type MRT_ColumnDef,
    type MRT_Row,
} from 'material-react-table';

import {
    useRuntimes,
    useDeleteRuntime,
} from '../services/hooks';
import {
    Runtime,
} from '../types';

const RuntimesPage: React.FC = () => {
    // Data hooks
    const { loading, error, value: runtimes, retry } = useRuntimes();

    // Action hooks
    const { deleteRuntime, loading: deleting } = useDeleteRuntime();

    // State
    const [selectedRuntime, setSelectedRuntime] = useState<Runtime | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [runtimeToDelete, setRuntimeToDelete] = useState<Runtime | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    // Material React Table columns configuration
    const columns = useMemo<MRT_ColumnDef<Runtime>[]>(
        () => [
            {
                id: 'runtimeId',
                header: 'Runtime ID',
                accessorKey: 'runtimeId',
                enableResizing: true,
                grow: true,
                minSize: 100,
                maxSize: 200,
            },
            {
                id: 'runtimeType',
                header: 'Runtime Type',
                accessorKey: 'runtimeType',
                enableResizing: true,
                grow: true,
                minSize: 100,
                maxSize: 160,
            },
            {
                id: 'version',
                header: 'Version',
                accessorKey: 'version',
                enableResizing: true,
                grow: true,
                minSize: 80,
                maxSize: 120,
            },
            {
                id: 'environmentId',
                header: 'Environment',
                accessorKey: 'environmentId',
                enableResizing: true,
                grow: true,
                minSize: 100,
                maxSize: 200,
            },
            {
                id: 'componentId',
                header: 'Component',
                accessorKey: 'componentId',
                enableResizing: true,
                grow: true,
                minSize: 100,
                maxSize: 200,
            },
            {
                id: 'status',
                header: 'Status',
                accessorKey: 'status',
                enableResizing: true,
                grow: true,
                minSize: 80,
                maxSize: 130,
                Cell: ({ cell }) => {
                    const status = cell.getValue<string>();
                    const getStatusColor = (status: string) => {
                        switch (status?.toLowerCase()) {
                            case 'active':
                            case 'ready':
                            case 'running':
                                return '#4caf50';
                            case 'pending':
                            case 'creating':
                                return '#ff9800';
                            case 'error':
                            case 'failed':
                                return '#f44336';
                            default:
                                return '#9e9e9e';
                        }
                    };

                    return (
                        <Chip
                            label={status || 'Unknown'}
                            size="small"
                            sx={{
                                backgroundColor: getStatusColor(status),
                                color: 'white',
                                fontWeight: 'bold',
                            }}
                        />
                    );
                },
            },
            {
                id: 'description',
                header: 'Description',
                accessorKey: 'description',
                enableResizing: true,
                grow: true,
                minSize: 150,
                maxSize: 400,
                Cell: ({ cell }) => {
                    const desc = cell.getValue<string>();
                    return desc ? (
                        <Tooltip title={desc}>
                            <Typography
                                variant="body2"
                                sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {desc}
                            </Typography>
                        </Tooltip>
                    ) : '-';
                },
            },
            {
                id: 'actions',
                header: 'Actions',
                size: 100,
                minSize: 80,
                maxSize: 120,
                enableSorting: false,
                enableColumnFilter: false,
                enableResizing: false,
                Cell: ({ row }) => (
                    <Box sx={{ display: 'flex', gap: '0.5rem' }}>
                        <Tooltip title="Delete Runtime">
                            <IconButton
                                color="error"
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(row.original);
                                }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                ),
            },
        ],
        [runtimes]
    );

    const handleDeleteClick = (runtime: Runtime) => {
        setRuntimeToDelete(runtime);
        setDeleteDialogOpen(true);
        setDeleteConfirmation('');
    };

    const handleDeleteConfirm = async () => {
        if (runtimeToDelete && deleteConfirmation === runtimeToDelete.runtimeId) {
            try {
                await deleteRuntime(runtimeToDelete.runtimeId);
                setDeleteDialogOpen(false);
                setRuntimeToDelete(null);
                setDeleteConfirmation('');
                setSnackbar({ open: true, message: 'Runtime deleted successfully', severity: 'success' });
                retry();
            } catch (err) {
                setSnackbar({ open: true, message: 'Failed to delete runtime', severity: 'error' });
            }
        }
    };

    const handleRowClick = (runtime: Runtime) => {
        setSelectedRuntime(runtime);
        setDetailsOpen(true);
    };

    // Material React Table configuration
    const tableConfig = {
        columns,
        data: runtimes,
        enableColumnFilters: true,
        enableGlobalFilter: true,
        enableSorting: true,
        enablePagination: true,
        enableColumnResizing: true,
        columnResizeMode: 'onChange' as const,
        layoutMode: 'semantic' as const,
        defaultColumn: {
            enableResizing: true,
            grow: true,
        },
        initialState: {
            pagination: {
                pageSize: 10,
                pageIndex: 0,
            },
            showGlobalFilter: true,
        },
        muiTableBodyRowProps: ({ row }: { row: MRT_Row<Runtime> }) => ({
            onClick: () => handleRowClick(row.original),
            sx: { cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } },
        }),
        renderTopToolbarCustomActions: () => (
            <Box sx={{ display: 'flex', gap: '1rem', p: '0.5rem', alignItems: 'center' }}>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={retry}
                    disabled={loading}
                >
                    Refresh
                </Button>
            </Box>
        ),
        state: {
            isLoading: loading,
        },
    };

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Runtimes
                </Typography>
                <Alert severity="error">
                    Failed to load runtimes: {error.message}
                </Alert>
                <Button
                    startIcon={<RefreshIcon />}
                    onClick={retry}
                    sx={{ mt: 2 }}
                >
                    Retry
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Runtimes ({runtimes.length})
            </Typography>

            <MaterialReactTable {...tableConfig} />

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Delete Runtime</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        Are you sure you want to delete the runtime "{runtimeToDelete?.runtimeId}"?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        This action cannot be undone.
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        Type the runtime ID to confirm:
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace" gutterBottom>
                        {runtimeToDelete?.runtimeId}
                    </Typography>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Enter runtime ID"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                        disabled={
                            deleting ||
                            deleteConfirmation !== runtimeToDelete?.runtimeId
                        }
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Runtime Details Dialog */}
            <Dialog
                open={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Runtime Details</DialogTitle>
                <DialogContent>
                    {selectedRuntime && (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                {selectedRuntime.runtimeId}
                            </Typography>
                            <Typography variant="body2" paragraph>
                                <strong>Type:</strong> {selectedRuntime.runtimeType}
                            </Typography>
                            <Typography variant="body2" paragraph>
                                <strong>Status:</strong> {selectedRuntime.status}
                            </Typography>
                            <Typography variant="body2" paragraph>
                                <strong>Environment:</strong> {selectedRuntime.environment?.name || 'N/A'}
                            </Typography>
                            <Typography variant="body2" paragraph>
                                <strong>Component:</strong> {selectedRuntime.component?.name || 'N/A'}
                            </Typography>
                            <Typography variant="body2" paragraph>
                                <strong>Version:</strong> {selectedRuntime.version || 'N/A'}
                            </Typography>
                            {selectedRuntime.platformName && (
                                <Typography variant="body2" paragraph>
                                    <strong>Platform:</strong> {selectedRuntime.platformName} {selectedRuntime.platformVersion}
                                </Typography>
                            )}
                            {selectedRuntime.osName && (
                                <Typography variant="body2" paragraph>
                                    <strong>OS:</strong> {selectedRuntime.osName} {selectedRuntime.osVersion}
                                </Typography>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsOpen(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default RuntimesPage;