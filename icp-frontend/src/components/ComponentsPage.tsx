import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

const ComponentsPage: React.FC = () => {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Components
            </Typography>
            <Typography variant="body1">
                Components page is being updated to Material-UI v5...
            </Typography>
            <CircularProgress />
        </Box>
    );
};

export default ComponentsPage;