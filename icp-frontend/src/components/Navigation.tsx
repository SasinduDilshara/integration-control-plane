import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Divider,
    IconButton,
    Box,
    Collapse,
} from '@mui/material';
import {
    Dashboard as RuntimesIcon,
    CloudQueue as EnvironmentsIcon,
    Extension as ComponentsIcon,
    Folder as ProjectsIcon,
    Home as HomeIcon,
    Visibility as OverviewIcon,
    Insights as InsightsIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    ExpandLess,
    ExpandMore,
    ShowChart as MetricsIcon,
    Description as LogsIcon,
    People as PeopleIcon,
} from '@mui/icons-material';

interface NavigationProps {
    open: boolean;
    onToggle: () => void;
}

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 64;

interface NavigationItem {
    label: string;
    path?: string;
    icon: React.ReactNode;
    children?: NavigationItem[];
}

const Navigation: React.FC<NavigationProps> = ({ open, onToggle }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [projectsExpanded, setProjectsExpanded] = useState(true);

    const navigationItems: NavigationItem[] = [
        {
            label: 'Home',
            path: '/',
            icon: <HomeIcon />
        },
        {
            label: 'Environments',
            path: '/environments',
            icon: <EnvironmentsIcon />
        },
        {
            label: 'Overview',
            path: '/environment-overview',
            icon: <OverviewIcon />
        },
        {
            label: 'Observability',
            icon: <InsightsIcon />,
            children: [
                {
                    label: 'Logs',
                    path: '/observability/logs',
                    icon: <LogsIcon />
                },
                {
                    label: 'Metrics',
                    path: '/observability/metrics',
                    icon: <MetricsIcon />
                },
            ]
        },
        {
            label: 'Projects',
            path: '/projects',
            icon: <ProjectsIcon />
        },
        {
            label: 'Components',
            path: '/components',
            icon: <ComponentsIcon />
        },
        {
            label: 'Runtimes',
            path: '/runtimes',
            icon: <RuntimesIcon />
        },
        {
            label: 'Overview',
            path: '/environment-overview',
            icon: <OverviewIcon />
        },
        {
            label: 'Users',
            path: '/users',
            icon: <PeopleIcon />
        },
    ];

    // Auto-expand parent if child route is active
    useEffect(() => {
        navigationItems.forEach((item) => {
            if (item.children) {
                const hasActiveChild = item.children.some(
                    (child) => child.path === location.pathname
                );
                if (hasActiveChild && !expandedItems.includes(item.label)) {
                    setExpandedItems((prev) => [...prev, item.label]);
                }
            }
        });
    }, [location.pathname]);

    const handleNavigate = (path: string) => {
        navigate(path);
    };

    const handleToggleExpand = (label: string) => {
        setExpandedItems((prev) =>
            prev.includes(label)
                ? prev.filter((item) => item !== label)
                : [...prev, label]
        );
    };

    const isActive = (path?: string) => {
        return path === location.pathname;
    };

    const isParentActive = (item: NavigationItem) => {
        if (item.children) {
            return item.children.some((child) => child.path === location.pathname);
        }
        return false;
    };

    const renderNavigationItem = (item: NavigationItem, isChild = false) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.includes(item.label);
        const itemIsActive = item.path ? isActive(item.path) : isParentActive(item);

        return (
            <React.Fragment key={item.label}>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={() => {
                            if (hasChildren) {
                                handleToggleExpand(item.label);
                            } else if (item.path) {
                                handleNavigate(item.path);
                            }
                        }}
                        selected={itemIsActive}
                        sx={{
                            minHeight: 48,
                            justifyContent: open ? 'initial' : 'center',
                            px: 2.5,
                            pl: isChild ? 4 : 2.5,
                            '&.Mui-selected': {
                                backgroundColor: 'primary.light',
                                color: 'primary.contrastText',
                                '&:hover': {
                                    backgroundColor: 'primary.main',
                                },
                                '& .MuiListItemIcon-root': {
                                    color: 'primary.contrastText',
                                },
                            },
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: 0,
                                mr: open ? 3 : 'auto',
                                justifyContent: 'center',
                                color: itemIsActive ? 'inherit' : 'action.active',
                            }}
                        >
                            {item.icon}
                        </ListItemIcon>
                        <ListItemText
                            primary={item.label}
                            sx={{
                                opacity: open ? 1 : 0,
                                transition: (theme) =>
                                    theme.transitions.create('opacity', {
                                        easing: theme.transitions.easing.sharp,
                                        duration: theme.transitions.duration.short,
                                    }),
                            }}
                        />
                        {hasChildren && open && (
                            isExpanded ? <ExpandLess /> : <ExpandMore />
                        )}
                    </ListItemButton>
                </ListItem>

                {hasChildren && (
                    <Collapse in={isExpanded && open} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {item.children!.map((child) => renderNavigationItem(child, true))}
                        </List>
                    </Collapse>
                )}
            </React.Fragment>
        );
    };

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
                    boxSizing: 'border-box',
                    transition: (theme) =>
                        theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                    overflowX: 'hidden',
                },
            }}
        >
            <Toolbar />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                <IconButton onClick={onToggle} size="small">
                    {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </IconButton>
            </Box>

            <Divider />

            <List>
                {navigationItems.map((item) => renderNavigationItem(item))}
            </List>
        </Drawer>
    );
};

export { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED };
export default Navigation;
