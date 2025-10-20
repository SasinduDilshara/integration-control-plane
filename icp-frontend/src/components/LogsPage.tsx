import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Pagination,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Description as LogIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  Refresh as RefreshIcon,
  BugReport as DebugIcon,
  AccessTime as TimeIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { useLogs } from '../services/hooks';
import { useProjects, useComponents, useEnvironments, useRuntimes } from '../services/hooks';
import { useAuth } from '../contexts/AuthContext';

const LogsPage: React.FC = () => {
  const { user } = useAuth();

  // Time range mode: 'preset' or 'custom'
  const [timeRangeMode, setTimeRangeMode] = useState<'preset' | 'custom'>('preset');

  // Preset duration in seconds
  const [duration, setDuration] = useState(3600); // Default 1 hour

  // Custom time range
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');

  // Calculate initial time range
  const getInitialTimeRange = () => {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 3600000); // 1 hour ago
    return {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
  };

  // Stored time range for API calls (initialized with valid values)
  const [apiTimeRange, setApiTimeRange] = useState<{ startTime: string; endTime: string }>(
    getInitialTimeRange()
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [componentFilter, setComponentFilter] = useState('ALL');
  const [environmentFilter, setEnvironmentFilter] = useState('ALL');
  const [runtimeFilter, setRuntimeFilter] = useState('ALL');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 50;

  // Fetch all filter options
  const { value: allProjects } = useProjects();
  const { value: allComponents } = useComponents();
  const { value: allEnvironments } = useEnvironments();
  const { value: allRuntimes } = useRuntimes();

  // Get accessible project IDs based on user roles
  const accessibleProjectIds = useMemo(() => {
    if (!user) return [];

    // Super admin has access to all projects
    if (user.isSuperAdmin) {
      return allProjects.map(p => p.projectId);
    }

    // Get unique project IDs from user roles
    const projectIds = new Set<string>();
    user.roles.forEach(role => {
      projectIds.add(role.projectId);
    });

    return Array.from(projectIds);
  }, [user, allProjects]);

  // Filter projects based on user access
  const accessibleProjects = useMemo(() => {
    if (!user) return [];

    // Super admin sees all projects
    if (user.isSuperAdmin) {
      return allProjects;
    }

    // Filter projects based on roles
    return allProjects.filter(project =>
      accessibleProjectIds.includes(project.projectId)
    );
  }, [user, allProjects, accessibleProjectIds]);

  // Check if user has access to production environments for a project
  const hasProdAccess = useCallback((projectId: string): boolean => {
    if (!user) return false;

    // Super admin has access to everything
    if (user.isSuperAdmin) return true;

    // Check if user has any role for this project with prod access
    return user.roles.some(role =>
      role.projectId === projectId && role.environmentType === 'prod'
    );
  }, [user]);

  // Check if user has access to non-production environments for a project
  const hasNonProdAccess = useCallback((projectId: string): boolean => {
    if (!user) return false;

    // Super admin has access to everything
    if (user.isSuperAdmin) return true;

    // Check if user has any role for this project with non-prod access
    return user.roles.some(role =>
      role.projectId === projectId && role.environmentType === 'non-prod'
    );
  }, [user]);

  // Filter environments based on user access and selected project
  const accessibleEnvironments = useMemo(() => {
    if (!user) return [];

    // Super admin sees all environments
    if (user.isSuperAdmin) {
      return allEnvironments;
    }

    // If a specific project is selected, filter by that project's permissions
    if (projectFilter !== 'ALL') {
      const project = allProjects.find(p => p.name === projectFilter);
      if (!project) return [];

      const hasProd = hasProdAccess(project.projectId);
      const hasNonProd = hasNonProdAccess(project.projectId);

      return allEnvironments.filter(env => {
        if (env.isProduction) {
          return hasProd;
        } else {
          return hasNonProd;
        }
      });
    }

    // If no project selected, show all environments user has access to across all their projects
    const accessibleEnvs = new Set<string>();

    accessibleProjectIds.forEach(projectId => {
      const hasProd = hasProdAccess(projectId);
      const hasNonProd = hasNonProdAccess(projectId);

      allEnvironments.forEach(env => {
        if (env.isProduction && hasProd) {
          accessibleEnvs.add(env.environmentId);
        } else if (!env.isProduction && hasNonProd) {
          accessibleEnvs.add(env.environmentId);
        }
      });
    });

    return allEnvironments.filter(env => accessibleEnvs.has(env.environmentId));
  }, [user, allEnvironments, projectFilter, allProjects, accessibleProjectIds, hasProdAccess, hasNonProdAccess]);

  // Filter components based on accessible projects
  const accessibleComponents = useMemo(() => {
    if (!user) return [];

    // Super admin sees all components
    if (user.isSuperAdmin) {
      return allComponents;
    }

    // If a specific project is selected, filter by that project
    if (projectFilter !== 'ALL') {
      const project = allProjects.find(p => p.name === projectFilter);
      if (!project) return [];

      return allComponents.filter(component =>
        component.project.projectId === project.projectId
      );
    }

    // Filter components based on accessible projects
    return allComponents.filter(component =>
      accessibleProjectIds.includes(component.project.projectId)
    );
  }, [user, allComponents, projectFilter, allProjects, accessibleProjectIds]);

  // Filter runtimes based on accessible components and environments
  const accessibleRuntimes = useMemo(() => {
    if (!user) return [];

    // Super admin sees all runtimes
    if (user.isSuperAdmin) {
      return allRuntimes;
    }

    // Filter runtimes based on accessible components and environments
    return allRuntimes.filter(runtime => {
      const componentAccessible = accessibleProjectIds.includes(runtime.component.project.projectId);

      if (!componentAccessible) return false;

      // Check environment access
      const env = runtime.environment;
      if (env.isProduction) {
        return hasProdAccess(runtime.component.project.projectId);
      } else {
        return hasNonProdAccess(runtime.component.project.projectId);
      }
    });
  }, [user, allRuntimes, accessibleProjectIds, hasProdAccess, hasNonProdAccess]);

  // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Calculate start and end times for preset duration
  const calculatePresetTimeRange = useCallback((): { startTime: string; endTime: string } => {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - duration * 1000);

    return {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
  }, [duration]);

  // Initialize custom time inputs on mount
  useEffect(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    setCustomStartTime(formatDateTimeLocal(oneHourAgo));
    setCustomEndTime(formatDateTimeLocal(now));
  }, []); // Only on mount

  // Update API time range when duration or mode changes
  useEffect(() => {
    if (timeRangeMode === 'preset') {
      setApiTimeRange(calculatePresetTimeRange());
    }
  }, [duration, timeRangeMode, calculatePresetTimeRange]);

  // Reset dependent filters when project changes
  useEffect(() => {
    setComponentFilter('ALL');
    setEnvironmentFilter('ALL');
    setRuntimeFilter('ALL');
  }, [projectFilter]);

  // Reset runtime filter when component or environment changes
  useEffect(() => {
    setRuntimeFilter('ALL');
  }, [componentFilter, environmentFilter]);

  // Calculate log start index for pagination
  const logStartIndex = (currentPage - 1) * logsPerPage;

  // Base request parameters for logs
  const logsRequest = {
    startTime: apiTimeRange.startTime,
    endTime: apiTimeRange.endTime,
    logStartIndex,
    logCount: logsPerPage,
    ...(projectFilter !== 'ALL' && { project: projectFilter }),
    ...(componentFilter !== 'ALL' && { component: componentFilter }),
    ...(environmentFilter !== 'ALL' && { environment: environmentFilter }),
    ...(runtimeFilter !== 'ALL' && { runtime: runtimeFilter }),
    ...(levelFilter !== 'ALL' && { logLevel: levelFilter }),
  };

  // Fetch logs and counts in a single call
  const {
    data: logs,
    logCount,
    loading,
    error,
    refetch
  } = useLogs(logsRequest);

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
    { label: 'Total Logs', value: logCount.total.toLocaleString(), color: '#2196f3', icon: <LogIcon /> },
    { label: 'Errors', value: logCount.error.toLocaleString(), color: '#f44336', icon: <ErrorIcon /> },
    { label: 'Warnings', value: logCount.warn.toLocaleString(), color: '#ff9800', icon: <WarningIcon /> },
    { label: 'Info', value: logCount.info.toLocaleString(), color: '#4caf50', icon: <InfoIcon /> },
    { label: 'Debug', value: logCount.debug.toLocaleString(), color: '#9c27b0', icon: <DebugIcon /> },
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

  // Client-side search on current page only
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === '' ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.runtime.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Calculate total pages based on total count from backend
  const totalPages = Math.ceil(logCount.total / logsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setExpandedRows(new Set());
  }, [levelFilter, projectFilter, componentFilter, environmentFilter, runtimeFilter]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    setExpandedRows(new Set());
    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefresh = () => {
    // Update time range to current time for preset mode
    if (timeRangeMode === 'preset') {
      setApiTimeRange(calculatePresetTimeRange());
    } else {
      // For custom mode, update with the selected custom times
      setApiTimeRange({
        startTime: new Date(customStartTime).toISOString(),
        endTime: new Date(customEndTime).toISOString(),
      });
    }
    // Refetch will be triggered automatically by the state change
  };

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

  // Validate custom time range
  const isCustomTimeRangeValid = (): boolean => {
    if (!customStartTime || !customEndTime) return false;
    return new Date(customStartTime) < new Date(customEndTime);
  };

  // Calculate display range
  const startIndex = logStartIndex + 1;
  const endIndex = Math.min(logStartIndex + filteredLogs.length, logCount.total);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h4" gutterBottom>
          Logs Dashboard
        </Typography>
      </Box>

      {/* Time Range Filter */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <RadioGroup
            row
            value={timeRangeMode}
            onChange={(e) => setTimeRangeMode(e.target.value as 'preset' | 'custom')}
          >
            <FormControlLabel
              value="preset"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TimeIcon sx={{ fontSize: 20 }} />
                  <Typography>Quick Select</Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="custom"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <DateRangeIcon sx={{ fontSize: 20 }} />
                  <Typography>Custom Range</Typography>
                </Box>
              }
            />
          </RadioGroup>
        </Box>

        {timeRangeMode === 'preset' ? (
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
              onClick={handleRefresh}
              disabled={loading}
              sx={{ ml: 'auto' }}
            >
              Refresh
            </Button>
          </Box>
        ) : (
          <Box>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  label="Start Time"
                  type="datetime-local"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    max: customEndTime || undefined,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  label="End Time"
                  type="datetime-local"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    min: customStartTime || undefined,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={loading || !isCustomTimeRangeValid()}
                  sx={{ height: '56px' }}
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
            {!isCustomTimeRangeValid() && customStartTime && customEndTime && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                End time must be after start time
              </Alert>
            )}
          </Box>
        )}
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
              placeholder="Search logs by message or runtime (current page only)..."
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
            {searchTerm && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Search is applied only to the current page ({logsPerPage} logs). Use filters for global search.
              </Alert>
            )}
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
                {accessibleProjects.map((project) => (
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
                {accessibleComponents.map((component) => (
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
                {accessibleEnvironments.map((env) => (
                  <MenuItem key={env.environmentId} value={env.name}>
                    {env.name} {env.isProduction && '(Prod)'}
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
                {accessibleRuntimes.map((runtime) => (
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
        <>
          {/* Pagination Info */}
          {logCount.total > 0 && (
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Showing {startIndex} - {endIndex} of {logCount.total.toLocaleString()} logs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Page {currentPage} of {totalPages}
              </Typography>
            </Box>
          )}

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
                    Project
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.contrastText' }}>
                    Component
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.contrastText' }}>
                    Environment
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.contrastText' }}>
                    Runtime
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
                        >
                          {expandedRows.has(index) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {formatTimestamp(log.time)}
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
                      <TableCell>{log.project}</TableCell>
                      <TableCell>{log.component}</TableCell>
                      <TableCell>
                        <Chip label={log.environment} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {log.runtime}
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
                siblingCount={1}
                boundaryCount={1}
              />
            </Box>
          )}
        </>
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
