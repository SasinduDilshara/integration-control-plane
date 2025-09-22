import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, Tab } from '@mui/material';

const Navigation: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { label: 'Runtimes', path: '/runtimes' },
        { label: 'Environments', path: '/environments' },
        { label: 'Components', path: '/components' },
        { label: 'Projects', path: '/projects' },
    ];

    const currentTab = tabs.findIndex(tab => tab.path === location.pathname);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        navigate(tabs[newValue].path);
    };

    return (
        <Tabs
            value={currentTab >= 0 ? currentTab : 0}
            onChange={handleTabChange}
            sx={{
                '& .MuiTab-root': {
                    color: 'white',
                    minWidth: 100,
                },
                '& .Mui-selected': {
                    color: 'white',
                },
                '& .MuiTabs-indicator': {
                    backgroundColor: 'white',
                },
            }}
        >
            {tabs.map((tab) => (
                <Tab key={tab.path} label={tab.label} />
            ))}
        </Tabs>
    );
};

export default Navigation;