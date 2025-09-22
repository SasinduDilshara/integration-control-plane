import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Container, Box } from '@mui/material';

// Import ICP components
import RuntimesPage from './components/RuntimesPage';
import EnvironmentsPage from './components/EnvironmentsPage';
import ComponentsPage from './components/ComponentsPage';
import ProjectsPage from './components/ProjectsPage';
import Navigation from './components/Navigation';

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

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                        <Toolbar>
                            <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                Integration Control Plane
                            </Typography>
                            <Navigation />
                        </Toolbar>
                    </AppBar>

                    <Container maxWidth="xl" sx={{ flexGrow: 1, pt: 11, pb: 3 }}>
                        <Routes>
                            <Route path="/" element={<Navigate to="/runtimes" replace />} />
                            <Route path="/runtimes" element={<RuntimesPage />} />
                            <Route path="/environments" element={<EnvironmentsPage />} />
                            <Route path="/components" element={<ComponentsPage />} />
                            <Route path="/projects" element={<ProjectsPage />} />
                        </Routes>
                    </Container>
                </Box>
            </Router>
        </ThemeProvider>
    );
} export default App;