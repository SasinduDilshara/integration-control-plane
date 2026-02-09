/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  Box,
  Button,
  Grid,
  PageContent,
  PageTitle,
  Typography,
  Chip,
  Card,
  CardContent,
  Avatar,
  AvatarGroup,
  List,
  ListItem,
  ListItemText,
  Divider,
  ListingTable,
  Tooltip,
} from '@wso2/oxygen-ui'
import {
  Edit,
  Globe,
  Server,
  Activity,
  GitCommit,
  Clock,
  ExternalLink,
} from '@wso2/oxygen-ui-icons-react'
import { useNavigate, useParams, Link as NavigateLink } from 'react-router'
import { type JSX } from 'react'
import { LineChart } from '@wso2/oxygen-ui-charts-react'
import { mockComponents } from '../mock-data/mockComponents'
import { mockMcpServers } from '../mock-data/mockMcpServers'
import type { Component, McpServer } from '../mock-data/types'

// --- Types ---
type ChartPoint = { name: string; uData: number; pData: number }

// --- Constants ---
const chartData: ChartPoint[] = [
  { name: 'Mon', uData: 4000, pData: 2400 },
  { name: 'Tue', uData: 3000, pData: 1398 },
  { name: 'Wed', uData: 2000, pData: 9800 },
  { name: 'Thu', uData: 2780, pData: 3908 },
  { name: 'Fri', uData: 1890, pData: 4800 },
  { name: 'Sat', uData: 2390, pData: 3800 },
  { name: 'Sun', uData: 3490, pData: 4300 },
]

// --- Helper Components ---
const LastUpdated = ({ value }: { value: string }) => (
  <Box display="flex" alignItems="center" color="text.secondary" fontSize="0.75rem">
    <Clock size={12} style={{ marginRight: 4 }} />
    {value}
  </Box>
)

const Resources = <T,>({ title, headers, items, renderRow }: { title: string; headers: string[]; items: T[]; renderRow: (item: T) => JSX.Element }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h6" gutterBottom>{title}</Typography>
    <ListingTable.Container disablePaper>
      <ListingTable variant="card" density="compact">
        <ListingTable.Head>
          <ListingTable.Row>
            {headers.map(h => <ListingTable.Cell key={h}>{h}</ListingTable.Cell>)}
          </ListingTable.Row>
        </ListingTable.Head>
        <ListingTable.Body>{items.map(renderRow)}</ListingTable.Body>
      </ListingTable>
    </ListingTable.Container>
  </Box>
)

const Summary = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">{title}</Typography>
        {action}
      </Box>
      {children}
    </CardContent>
  </Card>
)

export default function Project(): JSX.Element {
  const navigate = useNavigate()
  const { id, orgId } = useParams<{ id: string; orgId: string }>()

  return (
    <PageContent>
      {/* Header */}
      <PageTitle>
        <PageTitle.BackButton component={<NavigateLink to={`/o/${orgId}/projects`} />} />
        <PageTitle.Header>
          Project Overview <Chip label="Beta" size="small" color="info" sx={{ ml: 1, verticalAlign: 'middle' }} />
        </PageTitle.Header>
        <PageTitle.SubHeader>Manage your project resources and settings</PageTitle.SubHeader>
        <PageTitle.Actions>
          <Button variant="outlined" startIcon={<Edit size={16} />}>Edit Project</Button>
          <Button variant="contained" color="primary" onClick={() => navigate(`/o/${orgId}/projects/${id}/components`)}>Manage Components</Button>
        </PageTitle.Actions>
      </PageTitle>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid size={{ xs: 12, lg: 8 }}>
          {/* API Proxies - Reused Component mapping */}
          <Resources
            title="API Proxies"
            headers={['Name', 'Status', 'Last Updated']}
            items={mockComponents.slice(0, 3)}
            renderRow={(c: Component) => (
              <ListingTable.Row key={c.id} variant="card">
                <ListingTable.Cell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Globe size={16} />
                    <Typography variant="body2">{c.name}</Typography>
                  </Box>
                </ListingTable.Cell>
                <ListingTable.Cell><Chip label={c.status} size="small" color={c.status === 'active' ? 'success' : 'default'} /></ListingTable.Cell>
                <ListingTable.Cell><LastUpdated value={c.lastModified} /></ListingTable.Cell>
              </ListingTable.Row>
            )}
          />

          {/* MCP Servers */}
          <Resources
            title="MCP Servers"
            headers={['Name', 'Type', 'Status']}
            items={mockMcpServers.slice(0, 3)}
            renderRow={(s: McpServer) => (
              <ListingTable.Row key={s.id} variant="card">
                <ListingTable.Cell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Server size={16} />
                    <Typography variant="body2">{s.name}</Typography>
                  </Box>
                </ListingTable.Cell>
                <ListingTable.Cell>{s.type}</ListingTable.Cell>
                <ListingTable.Cell><Chip label={s.status} size="small" color={s.status === 'connected' ? 'success' : 'error'} /></ListingTable.Cell>
              </ListingTable.Row>
            )}
          />

          {/* Analytics Chart */}
          <Box>
            <Typography variant="h6" gutterBottom>Traffic Analytics</Typography>
            <Card variant="outlined">
              <CardContent>
                <LineChart
                  data={chartData}
                  xAxisDataKey="name"
                  lines={[{ dataKey: 'pData', name: 'Requests' }, { dataKey: 'uData', name: 'Users' }]}
                  height={300}
                />
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box display="flex" flexDirection="column" gap={3}>
            <Summary title="Project Details">
              <List disablePadding>
                {[
                  { l: 'Project ID', v: 'proj_892305' },
                  { l: 'Environment', v: <Chip label="Production" size="small" color="success" /> },
                  { l: 'Region', v: 'US East (N. Virginia)' },
                  { l: 'Created', v: 'Oct 24, 2025' },
                ].map((i, k) => (
                  <Box key={k}>
                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemText primary={i.l} secondary={i.v} primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} />
                    </ListItem>
                    {k < 3 && <Divider />}
                  </Box>
                ))}
              </List>
            </Summary>

            <Summary title="Activity" action={<Tooltip title="View Logs"><Activity size={16} style={{ cursor: 'pointer' }} /></Tooltip>}>
              <List disablePadding>
                {[
                  { t: 'Deployed new version', d: '2 mins ago', i: <GitCommit size={16} /> },
                  { t: 'Config update', d: '1 hour ago', i: <Activity size={16} /> },
                  { t: 'Alert resolved', d: '3 hours ago', i: <Activity size={16} /> },
                ].map((a, k) => (
                  <ListItem key={k} sx={{ px: 0 }}>
                    <Box sx={{ mr: 2, color: 'text.secondary' }}>{a.i}</Box>
                    <ListItemText primary={a.t} secondary={a.d} />
                  </ListItem>
                ))}
              </List>
            </Summary>

            <Summary title="Contributors">
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <AvatarGroup max={4}>
                  <Avatar alt="Remy Sharp" src="/static/images/avatar/1.jpg" />
                  <Avatar alt="Travis Howard" src="/static/images/avatar/2.jpg" />
                  <Avatar alt="Cindy Baker" src="/static/images/avatar/3.jpg" />
                  <Avatar alt="Agnes Walker" src="/static/images/avatar/4.jpg" />
                </AvatarGroup>
                <Button size="small" startIcon={<ExternalLink size={14} />}>Manage</Button>
              </Box>
            </Summary>
          </Box>
        </Grid>
      </Grid>
    </PageContent>
  )
}
