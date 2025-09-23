import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Container,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    Dashboard as RuntimesIcon,
    CloudQueue as EnvironmentsIcon,
    Extension as ComponentsIcon,
    Folder as ProjectsIcon,
    IntegrationInstructions as IntegrationIcon,
    Visibility as MonitoringIcon,
    Security as SecurityIcon,
    Speed as PerformanceIcon,
} from '@mui/icons-material';

const HomePage: React.FC = () => {
    const features = [
        {
            title: 'Runtime Management',
            description: 'Monitor and manage integration runtimes across your infrastructure',
            icon: <RuntimesIcon color="primary" />,
        },
        {
            title: 'Environment Control',
            description: 'Organize and manage different deployment environments',
            icon: <EnvironmentsIcon color="primary" />,
        },
        {
            title: 'Project Organization',
            description: 'Structure your integration projects for better organization',
            icon: <ProjectsIcon color="primary" />,
        },
        {
            title: 'Component Management',
            description: 'Track and manage individual integration components',
            icon: <ComponentsIcon color="primary" />,
        },
    ];

    const benefits = [
        'Centralized monitoring and control',
        'Real-time status tracking',
        'Streamlined deployment management',
        'Enhanced operational visibility',
        'Improved integration governance',
    ];

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography variant="h2" component="h1" gutterBottom color="primary">
                    Integration Control Plane
                </Typography>
                <Typography variant="h5" color="text.secondary" sx={{ mb: 4, maxWidth: 800, mx: 'auto' }}>
                    A comprehensive platform for managing, monitoring, and controlling your integration infrastructure
                </Typography>
            </Box>

            <Grid container spacing={4} sx={{ mb: 6 }}>
                <Grid item xs={12} md={8}>
                    <Paper elevation={2} sx={{ p: 4, height: '100%' }}>
                        <Typography variant="h4" gutterBottom color="primary">
                            What is ICP?
                        </Typography>
                        <Typography variant="body1" paragraph>
                            The Integration Control Plane (ICP) is a centralized management platform designed to provide
                            comprehensive oversight of your integration ecosystem. It offers a unified interface for
                            monitoring, managing, and controlling integration runtimes, environments, projects, and components.
                        </Typography>
                        <Typography variant="body1" paragraph>
                            With ICP, you can gain real-time visibility into your integration infrastructure, streamline
                            deployment processes, and ensure optimal performance across all your integration assets.
                        </Typography>
                        <Typography variant="body1">
                            Whether you're managing a small integration setup or a large-scale enterprise integration
                            landscape, ICP provides the tools and insights you need to maintain control and efficiency.
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={2} sx={{ p: 4, height: '100%' }}>
                        <Typography variant="h5" gutterBottom color="primary">
                            Key Benefits
                        </Typography>
                        <List>
                            {benefits.map((benefit, index) => (
                                <ListItem key={index} sx={{ py: 0.5 }}>
                                    <ListItemIcon>
                                        <IntegrationIcon color="primary" />
                                    </ListItemIcon>
                                    <ListItemText primary={benefit} />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>
            </Grid>

            <Typography variant="h4" gutterBottom color="primary" sx={{ textAlign: 'center', mb: 4 }}>
                Core Features
            </Typography>

            <Grid container spacing={3}>
                {features.map((feature, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Card
                            elevation={3}
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.2s ease-in-out',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6,
                                }
                            }}
                        >
                            <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
                                <Box sx={{ mb: 2, fontSize: '3rem' }}>
                                    {feature.icon}
                                </Box>
                                <Typography variant="h6" component="h3" gutterBottom>
                                    {feature.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {feature.description}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Box sx={{ mt: 6, textAlign: 'center' }}>
                <Paper elevation={1} sx={{ p: 4, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
                    <Typography variant="h5" gutterBottom>
                        Get Started
                    </Typography>
                    <Typography variant="body1">
                        Navigate through the sidebar to explore different sections of the Integration Control Plane.
                        Start by setting up your environments and projects, then add components and monitor your runtimes.
                    </Typography>
                </Paper>
            </Box>
        </Container>
    );
};

export default HomePage;