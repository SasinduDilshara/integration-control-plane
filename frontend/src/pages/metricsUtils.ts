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
import type { MetricEntry } from '../api/metrics';

export function normalizeServiceType(st?: string): string {
  if (!st || st.toLowerCase() === 'ballerina' || st === 'BI') return 'BI';
  return st.toUpperCase();
}

export function sumTimeSeries(ts: Record<string, number>): number {
  let s = 0;
  for (const v of Object.values(ts)) s += v;
  return s;
}

export function avgNonZeroTimeSeries(ts: Record<string, number>): number {
  let s = 0,
    c = 0;
  for (const v of Object.values(ts)) {
    if (v > 0) {
      s += v;
      c++;
    }
  }
  return c > 0 ? s / c : 0;
}

export interface ApiSummary {
  name: string;
  deployment: string;
  method: string;
  serviceType: string;
  integrationName: string;
  key: string;
  requestCount: number;
  avgResponseTime: number;
  errorRate: number;
  entries: MetricEntry[];
}

export function deriveApis(metrics: MetricEntry[], runtimeComponentMap: Record<string, string>): ApiSummary[] {
  const apiMap: Record<string, { successful: MetricEntry[]; failed: MetricEntry[]; method: string; serviceType: string; integrationName: string }> = {};
  for (const m of metrics) {
    const serviceType = normalizeServiceType(m.tags.service_type);
    const isMI = serviceType === 'MI';
    const groupCtx = isMI ? (m.tags.method ?? '') : (m.tags.deployment ?? m.tags.app_name ?? '');
    const runtimeId = m.tags.icp_runtimeId ?? '';
    const integrationName = runtimeComponentMap[runtimeId] ?? '';
    const ownerKey = runtimeId || integrationName || 'unknown';
    const key = `${serviceType}\0${ownerKey}\0${m.tags.sublevel}\0${groupCtx}`;
    if (!apiMap[key]) apiMap[key] = { successful: [], failed: [], method: m.tags.method ?? '', serviceType, integrationName };
    if (integrationName && !apiMap[key].integrationName) apiMap[key].integrationName = integrationName;
    apiMap[key][m.tags.status === 'failed' ? 'failed' : 'successful'].push(m);
  }
  return Object.entries(apiMap)
    .map(([key, { successful, failed, method, serviceType, integrationName }]) => {
      const [, , name, deployment] = key.split('\0');
      const allEntries = [...successful, ...failed];
      const successReqs = successful.reduce((s, m) => s + sumTimeSeries(m.requests_total.timeSeriesData), 0);
      const failReqs = failed.reduce((s, m) => s + sumTimeSeries(m.requests_total.timeSeriesData), 0);
      const total = successReqs + failReqs;
      const avgMs = (successful.reduce((s, m) => s + avgNonZeroTimeSeries(m.response_time_seconds_avg.timeSeriesData), 0) / Math.max(successful.length, 1)) * 1000;
      const isMI = serviceType === 'MI';
      return {
        name,
        deployment: isMI ? '' : deployment,
        method: isMI ? deployment : method,
        serviceType,
        integrationName,
        key,
        requestCount: total,
        avgResponseTime: avgMs,
        errorRate: total > 0 ? (failReqs / total) * 100 : 0,
        entries: allEntries,
      };
    })
    .sort((a, b) => b.requestCount - a.requestCount);
}

export function aggregate(metrics: MetricEntry[]) {
  const requestsByTime: Record<string, { time: string; successful: number; failed: number }> = {};
  const latencyByTime: Record<string, { time: string; avg: number; p50: number; p95: number; p99: number; count: number }> = {};
  let totalRequests = 0;
  let errorCount = 0;
  let latestP95 = 0;

  for (const m of metrics) {
    const isFailed = m.tags.status === 'failed';
    for (const [ts, val] of Object.entries(m.requests_total.timeSeriesData)) {
      if (!requestsByTime[ts]) requestsByTime[ts] = { time: ts, successful: 0, failed: 0 };
      if (isFailed) {
        requestsByTime[ts].failed += val;
        errorCount += val;
      } else {
        requestsByTime[ts].successful += val;
      }
      totalRequests += val;
    }
    for (const [ts, val] of Object.entries(m.response_time_seconds_avg.timeSeriesData)) {
      if (val === 0) continue;
      if (!latencyByTime[ts]) latencyByTime[ts] = { time: ts, avg: 0, p50: 0, p95: 0, p99: 0, count: 0 };
      const e = latencyByTime[ts];
      e.count += 1;
      e.avg += val;
      e.p50 += m.response_time_seconds_percentile_50.timeSeriesData[ts] ?? 0;
      e.p95 += m.response_time_seconds_percentile_95.timeSeriesData[ts] ?? 0;
      e.p99 += m.response_time_seconds_percentile_99.timeSeriesData[ts] ?? 0;
    }
  }

  const timestamps = Object.keys(requestsByTime).sort();
  const latencyData = timestamps.map((ts) => {
    const e = latencyByTime[ts];
    if (!e || e.count === 0) return { time: ts, avg: 0, p50: 0, p95: 0, p99: 0 };
    const c = e.count;
    return { time: ts, avg: (e.avg / c) * 1000, p50: (e.p50 / c) * 1000, p95: (e.p95 / c) * 1000, p99: (e.p99 / c) * 1000 };
  });
  for (let i = latencyData.length - 1; i >= 0; i--) {
    if (latencyData[i].p95 > 0) {
      latestP95 = latencyData[i].p95;
      break;
    }
  }

  const requestsData = timestamps.map((ts) => requestsByTime[ts]);
  const errorPercentage = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
  return { requestsData, latencyData, totalRequests, errorCount, errorPercentage, latestP95 };
}
