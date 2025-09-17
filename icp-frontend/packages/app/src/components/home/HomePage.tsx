import { useState } from 'react';
import {
  Header,
  InfoCard,
  Page,
} from '@backstage/core-components';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Chip,
} from '@material-ui/core';
import { ExpandMore as ExpandMoreIcon } from '@material-ui/icons';

export const HomePage = () => {
  const [expanded, setExpanded] = useState<string | false>('getting-started');

  const handleChange = (panel: string) => (_event: React.ChangeEvent<{}>, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Page themeId="tool">
      <Header title="WSO2 Integrator: ICP" />
      <Box p={3}>
        <InfoCard title="Welcome to WSO2 Integration Control Plane" variant="fullHeight">
          <Box mb={2}>
            <Typography variant="body1" gutterBottom>
              Manage and monitor your integration projects, components, and runtimes from a centralized dashboard.
            </Typography>
          </Box>

          <Accordion
            expanded={expanded === 'getting-started'}
            onChange={handleChange('getting-started')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Getting Started <Chip label="Essential" size="small" color="primary" style={{ marginLeft: 8 }} />
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Follow these steps to begin working with the Integration Control Plane:
                </Typography>
                <ul style={{ marginTop: 8 }}>
                  <li><strong>Projects:</strong> Create and organize your integration projects</li>
                  <li><strong>Components:</strong> Manage individual integration components within projects</li>
                  <li><strong>Environments:</strong> Set up and configure deployment environments</li>
                  <li><strong>Runtimes:</strong> Monitor active runtime instances and their health</li>
                </ul>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded === 'features'}
            onChange={handleChange('features')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Key Features <Chip label="Overview" size="small" color="secondary" style={{ marginLeft: 8 }} />
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <ul>
                  <li><strong>Project Management:</strong> Create, update, and organize integration projects</li>
                  <li><strong>Component Lifecycle:</strong> Manage components with full CRUD operations</li>
                  <li><strong>Runtime Monitoring:</strong> Real-time status monitoring of runtime instances</li>
                  <li><strong>Environment Configuration:</strong> Multi-environment deployment support</li>
                  <li><strong>Cross-Navigation:</strong> Seamless navigation between related entities</li>
                  <li><strong>Advanced Filtering:</strong> Filter by project, component, environment, and status</li>
                </ul>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded === 'navigation'}
            onChange={handleChange('navigation')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Quick Navigation <Chip label="Tips" size="small" color="default" style={{ marginLeft: 8 }} />
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Navigate efficiently through the platform:
                </Typography>
                <ul style={{ marginTop: 8 }}>
                  <li><strong>Projects Page:</strong> View and manage all integration projects</li>
                  <li><strong>Components Page:</strong> Manage components and click rows to view related runtimes</li>
                  <li><strong>Environments Page:</strong> Configure deployment environments</li>
                  <li><strong>Runtimes Page:</strong> Monitor runtime instances with advanced filtering</li>
                </ul>
                <Typography variant="body2" style={{ marginTop: 12, fontStyle: 'italic' }}>
                  💡 Tip: Click on any component row to automatically navigate to its runtime instances!
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded === 'support'}
            onChange={handleChange('support')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Support & Documentation
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Get help and learn more:
                </Typography>
                <ul style={{ marginTop: 8 }}>
                  <li>📚 <strong>Documentation:</strong> Visit the WSO2 ICP documentation site</li>
                  <li>🔧 <strong>API Reference:</strong> GraphQL API documentation</li>
                  <li>💬 <strong>Community Support:</strong> WSO2 community forums</li>
                  <li>🐛 <strong>Issue Tracking:</strong> Report bugs and feature requests</li>
                </ul>
              </Box>
            </AccordionDetails>
          </Accordion>
        </InfoCard>
      </Box>
    </Page>
  );
};