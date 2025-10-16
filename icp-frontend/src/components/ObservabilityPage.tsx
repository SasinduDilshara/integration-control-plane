import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Container,
  Paper,
  Chip,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Description as LogsIcon,
  BubbleChart as TracesIcon,
  Speed as MetricsIcon,
  Notifications as AlertsIcon,
  ShowChart as AnalyticsIcon,
} from '@mui/icons-material';

const ObservabilityPage: React.FC = () => {
  const observabilityFeatures = [
    {
      title: 'Metrics',
      description: 'Monitor real-time metrics and performance indicators across all integration components',
      icon: <MetricsIcon sx={{ fontSize: 48 }} />,
      color: '#1976d2',
      metrics: ['Response Time', 'Throughput', 'Error Rate', 'Resource Usage'],
    },
    {
      title: 'Logs',
      description: 'Centralized log aggregation and analysis for troubleshooting and audit trails',
      icon: <LogsIcon sx={{ fontSize: 48 }} />,
      color: '#2e7d32',
      metrics: ['Error Logs', 'Access Logs', 'System Logs', 'Audit Trails'],
    },
    {
      title: 'Traces',
      description: 'Distributed tracing to track requests across multiple services and components',
      icon: <TracesIcon sx={{ fontSize: 48 }} />,
      color: '#ed6c02',
      metrics: ['Request Traces', 'Latency Analysis', 'Service Dependencies', 'Call Chains'],
    },
    {
      title: 'Alerts',
      description: 'Proactive alerting and notification system for critical events and anomalies',
      icon: <AlertsIcon sx={{ fontSize: 48 }} />,
      color: '#d32f2f',
      metrics: ['Active Alerts', 'Alert History', 'Notification Rules', 'Escalation Policies'],
    },
    {
      title: 'Analytics',
      description: 'Advanced analytics and insights for capacity planning and optimization',
      icon: <AnalyticsIcon sx={{ fontSize: 48 }} />,
      color: '#7b1fa2',
      metrics: ['Trend Analysis', 'Capacity Planning', 'Performance Insights', 'Cost Analysis'],
    },
    {
      title: 'Timeline',
      description: 'Historical timeline view of events, deployments, and system changes',
      icon: <TimelineIcon sx={{ fontSize: 48 }} />,
      color: '#0288d1',
      metrics: ['Deployment History', 'Incident Timeline', 'Change Events', 'System Updates'],
    },
  ];

  const observabilityStats = [
    { label: 'Active Monitors', value: '24', trend: '+3 from last week' },
    { label: 'Total Metrics', value: '156', trend: '12 critical' },
    { label: 'Log Entries (24h)', value: '2.4M', trend: 'Normal activity' },
    { label: 'Active Traces', value: '1.2K', trend: 'Avg latency: 45ms' },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h3" component="h1" gutterBottom color="primary">
          Observability Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Comprehensive monitoring, logging, and tracing for your integration infrastructure
        </Typography>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {observabilityStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <Typography variant="overline" color="text.secondary">
                {stat.label}
              </Typography>
              <Typography variant="h3" component="div" color="primary" sx={{ my: 1 }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.trend}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Observability Features */}
      <Typography variant="h4" gutterBottom color="primary" sx={{ mb: 3 }}>
        Observability Components
      </Typography>

      <Grid container spacing={3}>
        {observabilityFeatures.map((feature, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <Card
              elevation={3}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 8,
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Box sx={{ color: feature.color, mr: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" component="h3">
                    {feature.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {feature.description}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                  {feature.metrics.map((metric, idx) => (
                    <Chip
                      key={idx}
                      label={metric}
                      size="small"
                      sx={{
                        backgroundColor: `${feature.color}15`,
                        color: feature.color,
                        fontWeight: 500,
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Additional Information */}
      <Box sx={{ mt: 6 }}>
        <Paper elevation={1} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom color="primary">
            About Observability
          </Typography>
          <Typography variant="body1" paragraph>
            The Observability platform provides comprehensive visibility into your integration infrastructure.
            It combines metrics, logs, and traces to give you a complete picture of system health and performance.
          </Typography>
          <Typography variant="body1">
            Use the observability tools to identify issues proactively, optimize performance, and ensure
            your integration services meet their SLAs. The platform supports custom dashboards, advanced
            filtering, and integration with popular monitoring tools.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default ObservabilityPage;