import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

const ProjectsPage: React.FC = () => {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Projects
            </Typography>
            <Typography variant="body1">
                Projects page is being updated to Material-UI v5...
            </Typography>
            <CircularProgress />
        </Box>
    );
};

export default ProjectsPage;