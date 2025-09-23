import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Box, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

// Import ICP components
import HomePage from './components/HomePage';
import RuntimesPage from './components/RuntimesPage';
import EnvironmentsPage from './components/EnvironmentsPage';
import ComponentsPage from './components/ComponentsPage';
import ProjectsPage from './components/ProjectsPage';
import Navigation, { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED } from './components/Navigation';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#dc004e',
        },
    },
});

function AppContent() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const navigate = useNavigate();

    const handleSidebarToggle = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const handleTitleClick = () => {
        navigate('/');
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    ml: sidebarOpen ? `${DRAWER_WIDTH}px` : `${DRAWER_WIDTH_COLLAPSED}px`,
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="toggle sidebar"
                        edge="start"
                        onClick={handleSidebarToggle}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography
                        variant="h6"
                        sx={{
                            flexGrow: 1,
                            cursor: 'pointer',
                            '&:hover': {
                                opacity: 0.8,
                            },
                        }}
                        onClick={handleTitleClick}
                    >
                        Integration Control Plane
                    </Typography>
                </Toolbar>
            </AppBar>

            <Navigation open={sidebarOpen} onToggle={handleSidebarToggle} />

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    transition: (theme) =>
                        theme.transitions.create('margin', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                    mt: '64px', // Height of AppBar
                    minHeight: 'calc(100vh - 64px)',
                    backgroundColor: (theme) => theme.palette.grey[50],
                }}
            >
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/runtimes" element={<RuntimesPage />} />
                    <Route path="/environments" element={<EnvironmentsPage />} />
                    <Route path="/components" element={<ComponentsPage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                </Routes>
            </Box>
        </Box>
    );
}

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <AppContent />
            </Router>
        </ThemeProvider>
    );
}

export default App;