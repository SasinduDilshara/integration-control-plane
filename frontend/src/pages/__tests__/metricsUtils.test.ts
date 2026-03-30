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
import { describe, it, expect } from 'vitest';
import type { MetricEntry } from '../../api/metrics';
import { normalizeServiceType, sumTimeSeries, avgNonZeroTimeSeries, deriveApis, aggregate } from '../metricsUtils';

// Helper to create a minimal MetricEntry for testing
function makeEntry(overrides: { tags?: Record<string, string>; requests?: Record<string, number>; avgLatency?: Record<string, number> }): MetricEntry {
  const emptyTs = { name: '', timeSeriesData: {} };
  return {
    tags: overrides.tags ?? {},
    requests_total: { name: 'requests_total', timeSeriesData: overrides.requests ?? {} },
    response_time_seconds_avg: { name: 'avg', timeSeriesData: overrides.avgLatency ?? {} },
    response_time_seconds_min: emptyTs,
    response_time_seconds_max: emptyTs,
    response_time_seconds_percentile_33: emptyTs,
    response_time_seconds_percentile_50: emptyTs,
    response_time_seconds_percentile_66: emptyTs,
    response_time_seconds_percentile_95: emptyTs,
    response_time_seconds_percentile_99: emptyTs,
  };
}

describe('normalizeServiceType', () => {
  it('returns BI for undefined', () => expect(normalizeServiceType(undefined)).toBe('BI'));
  it('returns BI for empty string', () => expect(normalizeServiceType('')).toBe('BI'));
  it('returns BI for "ballerina"', () => expect(normalizeServiceType('ballerina')).toBe('BI'));
  it('returns BI for "Ballerina"', () => expect(normalizeServiceType('Ballerina')).toBe('BI'));
  it('returns BI for "BI"', () => expect(normalizeServiceType('BI')).toBe('BI'));
  it('returns MI for "MI"', () => expect(normalizeServiceType('MI')).toBe('MI'));
  it('uppercases other types', () => expect(normalizeServiceType('mi')).toBe('MI'));
});

describe('sumTimeSeries', () => {
  it('sums all values', () => expect(sumTimeSeries({ a: 1, b: 2, c: 3 })).toBe(6));
  it('returns 0 for empty', () => expect(sumTimeSeries({})).toBe(0));
});

describe('avgNonZeroTimeSeries', () => {
  it('averages non-zero values', () => expect(avgNonZeroTimeSeries({ a: 0, b: 2, c: 4 })).toBe(3));
  it('returns 0 for all zeros', () => expect(avgNonZeroTimeSeries({ a: 0, b: 0 })).toBe(0));
  it('returns 0 for empty', () => expect(avgNonZeroTimeSeries({})).toBe(0));
});

describe('aggregate — Issue #154: 500 errors counted as errors', () => {
  it('counts failed entries in errorCount', () => {
    const metrics = [makeEntry({ tags: { status: 'failed', sublevel: '/api' }, requests: { t1: 3, t2: 2 } }), makeEntry({ tags: { status: 'successful', sublevel: '/api' }, requests: { t1: 10, t2: 8 } })];
    const result = aggregate(metrics);
    expect(result.errorCount).toBe(5);
    expect(result.totalRequests).toBe(23);
    expect(result.errorPercentage).toBeCloseTo((5 / 23) * 100, 2);
  });

  it('returns 0 errors when all successful', () => {
    const metrics = [makeEntry({ tags: { status: 'successful' }, requests: { t1: 10 } })];
    const result = aggregate(metrics);
    expect(result.errorCount).toBe(0);
    expect(result.errorPercentage).toBe(0);
  });

  it('returns 100% errors when all failed', () => {
    const metrics = [makeEntry({ tags: { status: 'failed' }, requests: { t1: 5 } })];
    const result = aggregate(metrics);
    expect(result.errorCount).toBe(5);
    expect(result.errorPercentage).toBe(100);
  });

  it('handles empty metrics', () => {
    const result = aggregate([]);
    expect(result.totalRequests).toBe(0);
    expect(result.errorCount).toBe(0);
    expect(result.errorPercentage).toBe(0);
  });

  it('separates failed and successful into requestsData buckets', () => {
    const metrics = [makeEntry({ tags: { status: 'failed' }, requests: { '2026-03-13T05:00:00Z': 3 } }), makeEntry({ tags: { status: 'successful' }, requests: { '2026-03-13T05:00:00Z': 7 } })];
    const result = aggregate(metrics);
    expect(result.requestsData).toHaveLength(1);
    expect(result.requestsData[0].failed).toBe(3);
    expect(result.requestsData[0].successful).toBe(7);
  });
});

describe('deriveApis — Issue #154: error rate reflects failed status', () => {
  it('calculates error rate from failed entries', () => {
    const metrics = [
      makeEntry({ tags: { status: 'failed', sublevel: 'playlist', deployment: 'app1', icp_runtimeId: 'rt1' }, requests: { t1: 2 } }),
      makeEntry({ tags: { status: 'successful', sublevel: 'playlist', deployment: 'app1', icp_runtimeId: 'rt1' }, requests: { t1: 8 } }),
    ];
    const apis = deriveApis(metrics, { rt1: 'MusicMood' });
    expect(apis).toHaveLength(1);
    expect(apis[0].errorRate).toBeCloseTo(20, 2);
    expect(apis[0].requestCount).toBe(10);
  });

  it('returns 0% error rate when no failed entries', () => {
    const metrics = [makeEntry({ tags: { status: 'successful', sublevel: 'get', deployment: 'app1', icp_runtimeId: 'rt1' }, requests: { t1: 10 } })];
    const apis = deriveApis(metrics, {});
    expect(apis[0].errorRate).toBe(0);
  });

  it('returns 100% error rate when all entries failed', () => {
    const metrics = [makeEntry({ tags: { status: 'failed', sublevel: 'get', deployment: 'app1', icp_runtimeId: 'rt1' }, requests: { t1: 5 } })];
    const apis = deriveApis(metrics, {});
    expect(apis[0].errorRate).toBe(100);
  });

  it('groups BI metrics by sublevel + deployment', () => {
    const metrics = [
      makeEntry({ tags: { status: 'successful', sublevel: 'playlist', deployment: 'app1', icp_runtimeId: 'rt1' }, requests: { t1: 5 } }),
      makeEntry({ tags: { status: 'successful', sublevel: 'search', deployment: 'app1', icp_runtimeId: 'rt1' }, requests: { t1: 3 } }),
    ];
    const apis = deriveApis(metrics, {});
    expect(apis).toHaveLength(2);
  });

  it('groups MI metrics by sublevel + method', () => {
    const metrics = [
      makeEntry({ tags: { status: 'successful', sublevel: 'HelloWorld', method: 'GET', service_type: 'MI', icp_runtimeId: 'rt1' }, requests: { t1: 5 } }),
      makeEntry({ tags: { status: 'successful', sublevel: 'HelloWorld', method: 'POST', service_type: 'MI', icp_runtimeId: 'rt1' }, requests: { t1: 3 } }),
    ];
    const apis = deriveApis(metrics, {});
    expect(apis).toHaveLength(2);
  });

  it('maps runtimeId to integration name', () => {
    const metrics = [makeEntry({ tags: { status: 'successful', sublevel: 'playlist', deployment: 'app1', icp_runtimeId: 'rt-abc' }, requests: { t1: 1 } })];
    const apis = deriveApis(metrics, { 'rt-abc': 'MusicMood' });
    expect(apis[0].integrationName).toBe('MusicMood');
  });

  it('sorts APIs by request count descending', () => {
    const metrics = [
      makeEntry({ tags: { status: 'successful', sublevel: 'low', deployment: 'a', icp_runtimeId: 'r1' }, requests: { t1: 1 } }),
      makeEntry({ tags: { status: 'successful', sublevel: 'high', deployment: 'a', icp_runtimeId: 'r2' }, requests: { t1: 100 } }),
    ];
    const apis = deriveApis(metrics, {});
    expect(apis[0].name).toBe('high');
    expect(apis[1].name).toBe('low');
  });
});
