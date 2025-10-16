import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Container,
  Paper,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkIcon,
  Timer as ResponseTimeIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

const MetricsPage: React.FC = () => {
  const systemMetrics = [
    {
      title: 'CPU Usage',
      value: '67%',
      trend: '+5%',
      trendUp: true,
      icon: <MemoryIcon sx={{ fontSize: 40 }} />,
      color: '#ff9800',
      progress: 67,
    },
    {
      title: 'Memory Usage',
      value: '4.2 GB',
      trend: '-0.3 GB',
      trendUp: false,
      icon: <StorageIcon sx={{ fontSize: 40 }} />,
      color: '#2196f3',
      progress: 52,
    },
    {
      title: 'Network I/O',
      value: '125 MB/s',
      trend: '+12 MB/s',
      trendUp: true,
      icon: <NetworkIcon sx={{ fontSize: 40 }} />,
      color: '#4caf50',
      progress: 75,
    },
    {
      title: 'Response Time',
      value: '45 ms',
      trend: '-8 ms',
      trendUp: false,
      icon: <ResponseTimeIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
      progress: 30,
    },
  ];

  const performanceMetrics = [
    {
      label: 'Requests/sec',
      value: '1,247',
      change: '+12.5%',
      status: 'success',
    },
    {
      label: 'Avg Throughput',
      value: '850 msg/s',
      change: '+8.3%',
      status: 'success',
    },
    {
      label: 'Error Rate',
      value: '0.12%',
      change: '-0.05%',
      status: 'success',
    },
    {
      label: 'Active Connections',
      value: '342',
      change: '+23',
      status: 'info',
    },
    {
      label: 'Queue Depth',
      value: '156',
      change: '-12',
      status: 'success',
    },
    {
      label: 'Failed Requests',
      value: '8',
      change: '+2',
      status: 'warning',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return '#4caf50';
      case 'warning':
        return '#ff9800';
      case 'error':
        return '#f44336';
      default:
        return '#2196f3';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h4" gutterBottom>
          Logs Dashboard
        </Typography>
      </Box>

      {/* System Metrics */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        System Metrics
      </Typography>

      <Grid container spacing={3} sx={{ mb: 6 }}>
        {systemMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              elevation={3}
              sx={{
                height: '100%',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ color: metric.color, mr: 2 }}>
                    {metric.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4" component="div">
                      {metric.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {metric.title}
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={metric.progress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: `${metric.color}20`,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: metric.color,
                    },
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  {metric.trendUp ? (
                    <TrendingUpIcon sx={{ fontSize: 16, color: '#f44336', mr: 0.5 }} />
                  ) : (
                    <TrendingDownIcon sx={{ fontSize: 16, color: '#4caf50', mr: 0.5 }} />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {metric.trend} from last hour
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Performance Metrics */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Performance Metrics
      </Typography>

      <Grid container spacing={3}>
        {performanceMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                height: '100%',
                borderLeft: `4px solid ${getStatusColor(metric.status)}`,
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateX(4px)',
                  boxShadow: 4,
                },
              }}
            >
              <Typography variant="overline" color="text.secondary">
                {metric.label}
              </Typography>
              <Typography variant="h4" component="div" sx={{ my: 1 }}>
                {metric.value}
              </Typography>
              <Chip
                label={metric.change}
                size="small"
                sx={{
                  backgroundColor: `${getStatusColor(metric.status)}20`,
                  color: getStatusColor(metric.status),
                  fontWeight: 600,
                }}
              />
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default MetricsPage;
