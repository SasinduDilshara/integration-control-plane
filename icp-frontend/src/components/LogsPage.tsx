import React, { useState, useEffect } from 'react';
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
  FormLabel,
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
  AccessTime as TimeIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { useLogs } from '../services/hooks';
import { useProjects, useComponents, useEnvironments, useRuntimes } from '../services/hooks';
import { LogEntry } from '../types';

const LogsPage: React.FC = () => {
  // Time range mode: 'preset' or 'custom'
  const [timeRangeMode, setTimeRangeMode] = useState<'preset' | 'custom'>('preset');

  // Preset duration in seconds
  const [duration, setDuration] = useState(3600); // Default 1 hour

  // Custom time range
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');

  const [logLimit] = useState(100);
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

  // Fetch filter options
  const { value: projects } = useProjects();
  const { value: components } = useComponents();
  const { value: environments } = useEnvironments();
  const { value: runtimes } = useRuntimes();

  // Initialize custom time range with default values (last 1 hour)
  useEffect(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    setCustomEndTime(formatDateTimeLocal(now));
    setCustomStartTime(formatDateTimeLocal(oneHourAgo));
  }, []);

  // Format date for datetime-local input
  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Calculate duration from custom time range
  const getCustomDuration = (): number => {
    if (!customStartTime || !customEndTime) return 3600;
    const start = new Date(customStartTime).getTime();
    const end = new Date(customEndTime).getTime();
    return Math.floor((end - start) / 1000); // Convert to seconds
  };

  // Prepare request
  const logRequest = {
    duration: timeRangeMode === 'preset' ? duration : getCustomDuration(),
    logLimit,
    ...(projectFilter !== 'ALL' && { project: projectFilter }),
    ...(componentFilter !== 'ALL' && { component: componentFilter }),
    ...(environmentFilter !== 'ALL' && { environment: environmentFilter }),
    ...(runtimeFilter !== 'ALL' && { runtime: runtimeFilter }),
    ...(levelFilter !== 'ALL' && { logLevel: levelFilter }),
    ...(timeRangeMode === 'custom' && customStartTime && { startTime: new Date(customStartTime).toISOString() }),
    ...(timeRangeMode === 'custom' && customEndTime && { endTime: new Date(customEndTime).toISOString() }),
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

  // Calculate pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setExpandedRows(new Set());
  }, [searchTerm, levelFilter, projectFilter, componentFilter, environmentFilter, runtimeFilter, duration, timeRangeMode, customStartTime, customEndTime]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    setExpandedRows(new Set());
    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
              onClick={refetch}
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
                  onClick={refetch}
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
        <>
          {/* Pagination Info */}
          {filteredLogs.length > 0 && (
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Showing {startIndex + 1} - {Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} logs
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
                {paginatedLogs.map((log, index) => (
                  <React.Fragment key={startIndex + index}>
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
                          onClick={() => toggleRowExpansion(startIndex + index)}
                        >
                          {expandedRows.has(startIndex + index) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
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
                        <Collapse in={expandedRows.has(startIndex + index)} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2 }}>
                            <Typography variant="h6" gutterBottom component="div">
                              Additional Information
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Module
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                    {log.module}
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

          {/* Pagination Controls */}
          {filteredLogs.length > logsPerPage && (
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
