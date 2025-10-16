import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Alert,
  CircularProgress,
  Button,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Description as LogIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  Refresh as RefreshIcon,
  BugReport as DebugIcon,
} from '@mui/icons-material';
import { useLogs } from '../services/hooks';
import { useProjects, useComponents, useEnvironments, useRuntimes } from '../services/hooks';
import { LogEntry } from '../types';

const LogsPage: React.FC = () => {
  // Duration in seconds
  const [duration, setDuration] = useState(3600); // Default 1 hour
  const [logLimit] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [componentFilter, setComponentFilter] = useState('ALL');
  const [environmentFilter, setEnvironmentFilter] = useState('ALL');
  const [runtimeFilter, setRuntimeFilter] = useState('ALL');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Fetch filter options
  const { value: projects } = useProjects();
  const { value: components } = useComponents();
  const { value: environments } = useEnvironments();
  const { value: runtimes } = useRuntimes();

  // Prepare request
  const logRequest = {
    duration,
    logLimit,
    ...(projectFilter !== 'ALL' && { project: projectFilter }),
    ...(componentFilter !== 'ALL' && { component: componentFilter }),
    ...(environmentFilter !== 'ALL' && { environment: environmentFilter }),
    ...(runtimeFilter !== 'ALL' && { runtime: runtimeFilter }),
    ...(levelFilter !== 'ALL' && { logLevel: levelFilter }),
  };

  // Fetch logs
  const { data: logs, loading, error, stats, refetch } = useLogs(logRequest);

  const durationOptions = [
    { label: '5m', value: 300 },
    { label: '15m', value: 900 },
    { label: '30m', value: 1800 },
    { label: '1h', value: 3600 },
    { label: '3h', value: 10800 },
    { label: '6h', value: 21600 },
    { label: '12h', value: 43200 },
    { label: '24h', value: 86400 },
  ];

  const logStats = [
    { label: 'Total Logs', value: stats.total.toLocaleString(), color: '#2196f3', icon: <LogIcon /> },
    { label: 'Errors', value: stats.errors.toLocaleString(), color: '#f44336', icon: <ErrorIcon /> },
    { label: 'Warnings', value: stats.warnings.toLocaleString(), color: '#ff9800', icon: <WarningIcon /> },
    { label: 'Info', value: stats.info.toLocaleString(), color: '#4caf50', icon: <InfoIcon /> },
    { label: 'Debug', value: stats.debug.toLocaleString(), color: '#9c27b0', icon: <DebugIcon /> },
  ];

  const getLevelIcon = (level: string) => {
    const upperLevel = level.toUpperCase();
    switch (upperLevel) {
      case 'ERROR':
        return <ErrorIcon sx={{ fontSize: 20 }} />;
      case 'WARN':
      case 'WARNING':
        return <WarningIcon sx={{ fontSize: 20 }} />;
      case 'DEBUG':
        return <DebugIcon sx={{ fontSize: 20 }} />;
      default:
        return <InfoIcon sx={{ fontSize: 20 }} />;
    }
  };

  const getLevelColor = (level: string) => {
    const upperLevel = level.toUpperCase();
    switch (upperLevel) {
      case 'ERROR':
        return '#f44336';
      case 'WARN':
      case 'WARNING':
        return '#ff9800';
      case 'DEBUG':
        return '#9c27b0';
      default:
        return '#2196f3';
    }
  };

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === '' ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.runtime.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h4" gutterBottom>
          Logs Dashboard
        </Typography>
      </Box>

      {/* Duration Filter */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Time Range:
          </Typography>
          <ToggleButtonGroup
            value={duration}
            exclusive
            onChange={(e, newDuration) => {
              if (newDuration !== null) {
                setDuration(newDuration);
              }
            }}
            size="small"
            color="primary"
          >
            {durationOptions.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refetch}
            disabled={loading}
            sx={{ ml: 'auto' }}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* Log Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {logStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={2.4} key={index}>
            <Card
              elevation={2}
              sx={{
                borderLeft: `4px solid ${stat.color}`,
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                </Box>
                <Typography variant="overline" color="text.secondary">
                  {stat.label}
                </Typography>
                <Typography variant="h4" component="div" sx={{ color: stat.color }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search logs by message, module, or runtime..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel>Log Level</InputLabel>
              <Select
                value={levelFilter}
                label="Log Level"
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Levels</MenuItem>
                <MenuItem value="ERROR">Error</MenuItem>
                <MenuItem value="WARN">Warning</MenuItem>
                <MenuItem value="INFO">Info</MenuItem>
                <MenuItem value="DEBUG">Debug</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel>Project</InputLabel>
              <Select
                value={projectFilter}
                label="Project"
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Projects</MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.projectId} value={project.name}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel>Component</InputLabel>
              <Select
                value={componentFilter}
                label="Component"
                onChange={(e) => setComponentFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Components</MenuItem>
                {components.map((component) => (
                  <MenuItem key={component.componentId} value={component.name}>
                    {component.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel>Environment</InputLabel>
              <Select
                value={environmentFilter}
                label="Environment"
                onChange={(e) => setEnvironmentFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Environments</MenuItem>
                {environments.map((env) => (
                  <MenuItem key={env.environmentId} value={env.name}>
                    {env.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel>Runtime</InputLabel>
              <Select
                value={runtimeFilter}
                label="Runtime"
                onChange={(e) => setRuntimeFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Runtimes</MenuItem>
                {runtimes.map((runtime) => (
                  <MenuItem key={runtime.runtimeId} value={runtime.runtimeId}>
                    {runtime.runtimeId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading logs: {error.message}
        </Alert>
      )}

      {/* Logs Table */}
      {!loading && !error && (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.light' }}>
                <TableCell sx={{ width: 50 }} />
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.contrastText' }}>
                  Timestamp
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.contrastText' }}>
                  Level
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.contrastText' }}>
                  Module
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.contrastText' }}>
                  Project
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.contrastText' }}>
                  Component
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.contrastText' }}>
                  Environment
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.contrastText' }}>
                  Message
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log, index) => (
                <React.Fragment key={index}>
                  <TableRow
                    sx={{
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      borderLeft: `3px solid ${getLevelColor(log.level)}`,
                    }}
                  >
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => toggleRowExpansion(index)}
                        disabled={Object.keys(log.additionalTags).length === 0}
                      >
                        {expandedRows.has(index) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getLevelIcon(log.level)}
                        label={log.level.toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: `${getLevelColor(log.level)}20`,
                          color: getLevelColor(log.level),
                          fontWeight: 600,
                          '& .MuiChip-icon': {
                            color: getLevelColor(log.level),
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{log.module}</TableCell>
                    <TableCell>{log.project}</TableCell>
                    <TableCell>{log.component}</TableCell>
                    <TableCell>
                      <Chip label={log.environment} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 400 }}>{log.message}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                      <Collapse in={expandedRows.has(index)} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Typography variant="h6" gutterBottom component="div">
                            Additional Information
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                  Runtime ID
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {log.runtime}
                                </Typography>
                              </Paper>
                            </Grid>
                            {Object.entries(log.additionalTags).map(([key, value]) => (
                              <Grid item xs={12} md={6} key={key}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    {key}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                  </Typography>
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!loading && !error && filteredLogs.length === 0 && (
        <Paper elevation={1} sx={{ p: 4, mt: 2, textAlign: 'center' }}>
          <LogIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No logs found matching your filters
          </Typography>
        </Paper>
      )}

    </Container>
  );
};

export default LogsPage;
