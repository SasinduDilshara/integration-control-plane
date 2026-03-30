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
import { Button, Card, CardContent, Checkbox, CircularProgress, Grid, IconButton, ListItemText, MenuItem, PageContent, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@wso2/oxygen-ui';
import { LineChart } from '@wso2/oxygen-ui-charts-react';
import { BarChart3, RefreshCw } from '@wso2/oxygen-ui-icons-react';
import { useMemo, useState, type JSX } from 'react';
import { useProjectByHandler, useComponentByHandler, useComponents, useEnvironments, useProjectRuntimes } from '../api/queries';
import { useMetrics, type MetricsRequest } from '../api/metrics';
import EmptyListing from '../components/EmptyListing';
import NotFound from '../components/NotFound';
import { resourceUrl, broaden, hasComponent, type ProjectScope, type ComponentScope } from '../nav';
import { deriveApis, aggregate, type ApiSummary } from './metricsUtils';

const TIME_RANGES: Record<string, number> = { 'Past 1 hour': 1, 'Past 6 hours': 6, 'Past 24 hours': 24, 'Past 7 days': 168 };
const RESOLUTIONS: Record<string, string> = { '1 Minute': '1m', '5 Minutes': '5m', '15 Minutes': '15m', '1 Hour': '1h' };
const LINE_OPTS = { dot: false, connectNulls: true, type: 'linear' as const };

function apiDisplayLabel(api: ApiSummary): string {
  const parts = [api.name];
  if (api.deployment) parts.push(api.deployment);
  if (api.method) parts.push(api.method);
  return parts.length > 1 ? `${parts[0]} (${parts.slice(1).join(' · ')})` : parts[0];
}

function apiDisplayLabelWithType(api: ApiSummary, showType: boolean): string {
  const base = apiDisplayLabel(api);
  if (showType) {
    const st = api.serviceType || 'BI';
    if (api.integrationName) return `[${st} · ${api.integrationName}] ${base}`;
    return `[${st}] ${base}`;
  }
  return base;
}

// Build per-API chart data: each selected API becomes a line
function buildApiChartData(apis: ApiSummary[], showType: boolean) {
  const allTimestamps = new Set<string>();
  for (const api of apis) {
    for (const entry of api.entries) {
      for (const ts of Object.keys(entry.requests_total.timeSeriesData)) allTimestamps.add(ts);
    }
  }
  const sorted = [...allTimestamps].sort();
  const reqData = sorted.map((ts) => {
    const row: Record<string, string | number> = { label: formatTime(ts) };
    for (const api of apis) {
      const key = apiDisplayLabelWithType(api, showType);
      row[key] = api.entries.reduce((s, e) => s + (e.requests_total.timeSeriesData[ts] ?? 0), 0);
    }
    return row;
  });
  const latData = sorted.map((ts) => {
    const row: Record<string, string | number> = { label: formatTime(ts) };
    for (const api of apis) {
      const key = apiDisplayLabelWithType(api, showType);
      let sum = 0,
        count = 0;
      for (const e of api.entries) {
        const v = e.response_time_seconds_avg.timeSeriesData[ts] ?? 0;
        if (v > 0) {
          sum += v;
          count++;
        }
      }
      row[key] = count > 0 ? (sum / count) * 1000 : 0;
    }
    return row;
  });
  return { reqData, latData };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isUnavailable(error: unknown): boolean {
  if (!error) return false;
  const status = (error as any).status;
  const message = (error as Error).message ?? '';
  return status === 503 || message.includes('Observability service is unavailable') || message.includes('OpenSearch service is unavailable');
}

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0'];

function StatCard({ title, value, color }: { title: string; value: string; color?: string }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function Metrics(scope: ProjectScope | ComponentScope): JSX.Element {
  const isComponent = hasComponent(scope);
  const { data: project, isLoading: loadingProject } = useProjectByHandler(scope.project);
  const projectId = project?.id ?? '';
  const { data: singleComponent, isLoading: loadingComponent } = useComponentByHandler(projectId, isComponent ? scope.component : undefined);
  const { data: components = [], isLoading: loadingComponents } = useComponents(scope.org, projectId);
  const { data: environments = [], isLoading: loadingEnvironments } = useEnvironments(projectId);

  const [envFilter, setEnvFilter] = useState('');
  const [timeRange, setTimeRange] = useState('Past 1 hour');
  const [resolution, setResolution] = useState('1 Minute');
  const [integrationFilter, setIntegrationFilter] = useState('all');
  const [selectedApiKeys, setSelectedApiKeys] = useState<string[]>([]);

  const effectiveEnvId = envFilter || environments[0]?.id || '';
  const componentId = isComponent ? (singleComponent?.id ?? '') : '';

  // Fetch all runtimes for the project to build runtimeId → integration name map
  const { data: projectRuntimes = [] } = useProjectRuntimes(effectiveEnvId, projectId);
  const runtimeComponentMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of projectRuntimes) {
      if (r.component?.displayName) map[r.runtimeId] = r.component.displayName;
    }
    return map;
  }, [projectRuntimes]);

  const metricsRequest = useMemo<MetricsRequest | null>(() => {
    if (!effectiveEnvId) return null;
    if (isComponent && !componentId) return null;
    const hours = TIME_RANGES[timeRange] ?? 1;
    const now = new Date();
    const req: MetricsRequest = {
      environmentId: effectiveEnvId,
      startTime: new Date(now.getTime() - hours * 3600_000).toISOString(),
      endTime: now.toISOString(),
      resolutionInterval: RESOLUTIONS[resolution] ?? '1m',
    };
    if (isComponent) {
      req.componentId = componentId;
    } else if (integrationFilter !== 'all') {
      req.componentId = integrationFilter;
    }
    return req;
  }, [isComponent, componentId, integrationFilter, effectiveEnvId, timeRange, resolution]);

  const { data: metricsData, isLoading, error, refetch } = useMetrics(metricsRequest);
  const allInboundMetrics = useMemo(() => metricsData?.inboundMetrics ?? [], [metricsData]);

  const inboundMetrics = allInboundMetrics;
  const filtersDisabled = isUnavailable(error);

  const { requestsData, latencyData, totalRequests, errorCount, errorPercentage, latestP95 } = useMemo(() => aggregate(inboundMetrics), [inboundMetrics]);
  const apis = useMemo(() => deriveApis(inboundMetrics, runtimeComponentMap), [inboundMetrics, runtimeComponentMap]);
  const top5 = apis.slice(0, 5);

  // Auto-select all APIs by default
  const effectiveSelectedApis = useMemo(() => {
    const valid = apis.filter((a) => selectedApiKeys.includes(a.key));
    return valid.length > 0 ? valid : apis;
  }, [apis, selectedApiKeys]);

  const showIntegrationName = true;
  const { reqData: apiReqData, latData: apiLatData } = useMemo(() => buildApiChartData(effectiveSelectedApis, showIntegrationName), [effectiveSelectedApis, showIntegrationName]);
  const apiLineKeys = effectiveSelectedApis.map((a) => apiDisplayLabelWithType(a, showIntegrationName));

  const requestsChartData = useMemo(() => requestsData.map((d) => ({ ...d, label: formatTime(d.time) })), [requestsData]);
  const latencyChartData = useMemo(() => latencyData.map((d) => ({ ...d, label: formatTime(d.time) })), [latencyData]);

  // Early returns
  const loadingContext = isComponent ? loadingComponent : loadingComponents;
  if (loadingProject || loadingContext || loadingEnvironments) {
    return (
      <PageContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </PageContent>
    );
  }
  if (!project) {
    return <NotFound message="Project not found" backTo={resourceUrl(broaden(scope)!, 'overview')} backLabel="Back to Organization" />;
  }
  if (isComponent && !singleComponent) {
    return <NotFound message="Component not found" backTo={resourceUrl(broaden(scope)!, 'overview')} backLabel="Back to Project" />;
  }
  if (environments.length === 0) {
    return (
      <PageContent>
        <EmptyListing icon={<BarChart3 size={48} />} title="No environments" description="Configure an environment to view metrics." />
      </PageContent>
    );
  }

  return (
    <PageContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h1">Metrics</Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={() => refetch()} disabled={filtersDisabled || !metricsRequest}>
            <RefreshCw size={18} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack direction="row" gap={2} sx={{ mb: 3 }} flexWrap="wrap" alignItems="center">
        {environments.length > 0 && (
          <Select value={effectiveEnvId} onChange={(e) => setEnvFilter(e.target.value as string)} size="small" sx={{ minWidth: 140 }} inputProps={{ 'aria-label': 'Environment' }} disabled={filtersDisabled}>
            {environments.map((e) => (
              <MenuItem key={e.id} value={e.id}>
                {e.name}
              </MenuItem>
            ))}
          </Select>
        )}
        <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value as string)} size="small" sx={{ minWidth: 160 }} inputProps={{ 'aria-label': 'Time range' }} disabled={filtersDisabled}>
          {Object.keys(TIME_RANGES).map((k) => (
            <MenuItem key={k} value={k}>
              {k}
            </MenuItem>
          ))}
        </Select>
        <Select value={resolution} onChange={(e) => setResolution(e.target.value as string)} size="small" sx={{ minWidth: 140 }} inputProps={{ 'aria-label': 'Resolution' }} disabled={filtersDisabled}>
          {Object.keys(RESOLUTIONS).map((k) => (
            <MenuItem key={k} value={k}>
              Resolution: {k}
            </MenuItem>
          ))}
        </Select>
        {!isComponent && components.length > 0 && (
          <Select value={integrationFilter} onChange={(e) => setIntegrationFilter(e.target.value as string)} size="small" sx={{ minWidth: 160 }} inputProps={{ 'aria-label': 'Integration' }} disabled={filtersDisabled}>
            <MenuItem value="all">All Integrations</MenuItem>
            {components.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.displayName}
              </MenuItem>
            ))}
          </Select>
        )}
      </Stack>

      {isLoading ? (
        <CircularProgress size={28} sx={{ display: 'block', mx: 'auto', my: 6 }} />
      ) : error ? (
        <Stack alignItems="center" gap={2} sx={{ py: 6 }}>
          {isUnavailable(error) ? (
            <>
              <BarChart3 size={48} style={{ color: '#78909c' }} />
              <Typography variant="h6" textAlign="center">
                Observability Service Not Configured
              </Typography>
              <Typography color="text.secondary" textAlign="center" sx={{ maxWidth: 600 }}>
                Please ensure the Observability backend is configured and running to view metrics.
              </Typography>
            </>
          ) : (
            <>
              <Typography color="error" textAlign="center">
                Failed to fetch metrics: {(error as Error).message ?? 'Service unavailable'}
              </Typography>
              <Button variant="contained" startIcon={<RefreshCw size={16} />} onClick={() => refetch()}>
                Retry
              </Button>
            </>
          )}
        </Stack>
      ) : inboundMetrics.length === 0 ? (
        <EmptyListing icon={<BarChart3 size={48} />} title="No metrics data" description="No metrics available for the selected time range." />
      ) : (
        <>
          {/* Summary cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="Total Requests" value={totalRequests.toLocaleString()} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="Error Count" value={errorCount.toLocaleString()} color="error.main" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="Error Percentage" value={`${errorPercentage.toFixed(2)}%`} color="error.main" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="95th Percentile (Latest)" value={`${latestP95.toFixed(2)} ms`} />
            </Grid>
          </Grid>

          {/* Overview charts */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Requests Per Minute
                  </Typography>
                  <LineChart
                    data={requestsChartData}
                    xAxisDataKey="label"
                    height={350}
                    legend={{ show: true, align: 'center', verticalAlign: 'bottom' }}
                    grid={{ show: true, strokeDasharray: '3 3' }}
                    lines={[
                      { dataKey: 'successful', name: 'Success', stroke: '#4caf50', ...LINE_OPTS },
                      { dataKey: 'failed', name: 'Failed', stroke: '#d32f2f', ...LINE_OPTS },
                    ]}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Request Latency
                  </Typography>
                  <LineChart
                    data={latencyChartData}
                    xAxisDataKey="label"
                    height={350}
                    legend={{ show: true, align: 'center', verticalAlign: 'bottom' }}
                    grid={{ show: true, strokeDasharray: '3 3' }}
                    lines={[
                      { dataKey: 'avg', name: 'Average', stroke: '#4caf50', ...LINE_OPTS },
                      { dataKey: 'p50', name: '50th Percentile', stroke: '#2196f3', ...LINE_OPTS },
                      { dataKey: 'p95', name: '95th Percentile', stroke: '#ff9800', ...LINE_OPTS },
                      { dataKey: 'p99', name: '99th Percentile', stroke: '#9c27b0', ...LINE_OPTS },
                    ]}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Most Used APIs + Statistics of APIs */}
          {top5.length > 0 && (
            <>
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Most Used APIs
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Rank</TableCell>
                          <TableCell>Integration</TableCell>
                          <TableCell>API Name</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell align="right">Request Count</TableCell>
                          <TableCell align="right">Avg Response Time (ms)</TableCell>
                          <TableCell align="right">Error Rate (%)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {top5.map((api, i) => (
                          <TableRow key={api.key}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell>{api.integrationName || '\u2014'}</TableCell>
                            <TableCell>
                              {api.name}
                              {api.deployment ? ` (${api.deployment})` : ''}
                            </TableCell>
                            <TableCell>{api.method || '\u2014'}</TableCell>
                            <TableCell align="right">{api.requestCount}</TableCell>
                            <TableCell align="right">{api.avgResponseTime.toFixed(2)}</TableCell>
                            <TableCell align="right">{api.errorRate.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              <Typography variant="h6" sx={{ mb: 1 }}>
                Statistics of APIs
              </Typography>
              <Select
                multiple
                value={effectiveSelectedApis.map((a) => a.key)}
                onChange={(e) => setSelectedApiKeys(e.target.value as string[])}
                size="small"
                sx={{ minWidth: 200, mb: 2 }}
                inputProps={{ 'aria-label': 'API selection' }}
                renderValue={(selected) => ((selected as string[]).length === apis.length ? 'All APIs' : `APIs: ${(selected as string[]).length} selected`)}>
                {apis.map((a) => (
                  <MenuItem key={a.key} value={a.key}>
                    <Checkbox checked={effectiveSelectedApis.some((s) => s.key === a.key)} size="small" />
                    <ListItemText primary={apiDisplayLabelWithType(a, showIntegrationName)} />
                  </MenuItem>
                ))}
              </Select>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        Requests Per Minute
                      </Typography>
                      <LineChart
                        data={apiReqData}
                        xAxisDataKey="label"
                        height={350}
                        legend={{ show: false }}
                        grid={{ show: true, strokeDasharray: '3 3' }}
                        lines={apiLineKeys.map((k, i) => ({ dataKey: k, name: k, stroke: COLORS[i % COLORS.length], ...LINE_OPTS }))}
                      />
                      <Stack sx={{ mt: 1 }} gap={0.5}>
                        {apiLineKeys.map((k, i) => (
                          <Stack key={k} direction="row" alignItems="center" gap={1}>
                            <span style={{ width: 14, height: 3, backgroundColor: COLORS[i % COLORS.length], display: 'inline-block', borderRadius: 1 }} />
                            <Typography variant="caption" noWrap>
                              {k}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        Average Request Latency
                      </Typography>
                      <LineChart
                        data={apiLatData}
                        xAxisDataKey="label"
                        height={350}
                        legend={{ show: false }}
                        grid={{ show: true, strokeDasharray: '3 3' }}
                        lines={apiLineKeys.map((k, i) => ({ dataKey: k, name: k, stroke: COLORS[i % COLORS.length], ...LINE_OPTS }))}
                      />
                      <Stack sx={{ mt: 1 }} gap={0.5}>
                        {apiLineKeys.map((k, i) => (
                          <Stack key={k} direction="row" alignItems="center" gap={1}>
                            <span style={{ width: 14, height: 3, backgroundColor: COLORS[i % COLORS.length], display: 'inline-block', borderRadius: 1 }} />
                            <Typography variant="caption" noWrap>
                              {k}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}
        </>
      )}
    </PageContent>
  );
}
