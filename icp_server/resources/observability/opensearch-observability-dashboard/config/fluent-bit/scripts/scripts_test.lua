-- Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
--
-- WSO2 LLC. licenses this file to you under the Apache License,
-- Version 2.0 (the "License"); you may not use this file except
-- in compliance with the License.
-- You may obtain a copy of the License at
--
--     http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing,
-- software distributed under the License is distributed on an
-- "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
-- KIND, either express or implied. See the License for the
-- specific language governing permissions and limitations
-- under the License.

-- Unit tests for Fluent Bit Lua scripts
-- Run: lua scripts_test.lua (from the scripts/ directory)

dofile("scripts.lua")

local pass_count = 0
local fail_count = 0
local total_count = 0

local function assert_eq(test_name, actual, expected)
    total_count = total_count + 1
    if actual == expected then
        pass_count = pass_count + 1
        print(string.format("[PASS] %s", test_name))
    else
        fail_count = fail_count + 1
        print(string.format("[FAIL] %s — expected: %q, got: %q", test_name, tostring(expected), tostring(actual)))
    end
end

local function run_metrics(record)
    local code, ts, result = extract_bal_metrics_data("test.tag", 1234567890, record)
    return result, code
end

-- ============================================================
-- 1. extract_bal_metrics_data — Status Classification
-- ============================================================

print("\n=== extract_bal_metrics_data: Status Classification ===\n")

-- 1a. Bug scenario: HTTP 500 WITHOUT http.status_code_group
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "500"})
    assert_eq("500 without status_code_group → status=failed", r["status"], "failed")
    assert_eq("500 without status_code_group → group=5xx", r["status_code_group"], "5xx")
end

-- 1b. HTTP 500 with empty string status_code_group
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "500", ["http.status_code_group"] = ""})
    assert_eq("500 with empty status_code_group → status=failed", r["status"], "failed")
    assert_eq("500 with empty status_code_group → group=5xx", r["status_code_group"], "5xx")
end

-- 1c. HTTP 500 with correct status_code_group="5xx"
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "500", ["http.status_code_group"] = "5xx"})
    assert_eq("500 with group=5xx → status=failed", r["status"], "failed")
    assert_eq("500 with group=5xx → group=5xx", r["status_code_group"], "5xx")
end

-- 1d. HTTP 502 without status_code_group
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "502"})
    assert_eq("502 without status_code_group → status=failed", r["status"], "failed")
    assert_eq("502 without status_code_group → group=5xx", r["status_code_group"], "5xx")
end

-- 1e. HTTP 503 without status_code_group
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "503"})
    assert_eq("503 without status_code_group → status=failed", r["status"], "failed")
end

-- 1f. HTTP 404 without status_code_group
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "404"})
    assert_eq("404 without status_code_group → status=failed", r["status"], "failed")
    assert_eq("404 without status_code_group → group=4xx", r["status_code_group"], "4xx")
end

-- 1g. HTTP 404 with status_code_group="4xx"
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "404", ["http.status_code_group"] = "4xx"})
    assert_eq("404 with group=4xx → status=failed", r["status"], "failed")
    assert_eq("404 with group=4xx → group=4xx", r["status_code_group"], "4xx")
end

-- 1h. HTTP 200 without status_code_group → successful
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "200"})
    assert_eq("200 without status_code_group → status=successful", r["status"], "successful")
    assert_eq("200 without status_code_group → group=empty", r["status_code_group"], "")
end

-- 1i. HTTP 200 with status_code_group="2xx" → successful
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "200", ["http.status_code_group"] = "2xx"})
    assert_eq("200 with group=2xx → status=successful", r["status"], "successful")
    assert_eq("200 with group=2xx → group=2xx", r["status_code_group"], "2xx")
end

-- 1j. HTTP 301 redirect → successful
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "301"})
    assert_eq("301 without status_code_group → status=successful", r["status"], "successful")
end

-- ============================================================
-- 2. extract_bal_metrics_data — Edge Cases
-- ============================================================

print("\n=== extract_bal_metrics_data: Edge Cases ===\n")

-- 2a. Non-metrics log is passed through unchanged
do
    local record = {logger = "default", message = "hello"}
    local code, ts, result = extract_bal_metrics_data("test.tag", 1234567890, record)
    assert_eq("non-metrics log: status field not set", result["status"], nil)
    assert_eq("non-metrics log: return code is 1", code, 1)
end

-- 2b. Missing both http.status_code and http.status_code_group
do
    local r = run_metrics({logger = "metrics"})
    assert_eq("no status code at all → status=successful", r["status"], "successful")
    assert_eq("no status code at all → group=empty", r["status_code_group"], "")
end

-- 2c. Non-numeric http.status_code
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "abc"})
    assert_eq("non-numeric status_code → status=successful", r["status"], "successful")
end

-- 2d. Boundary: HTTP 399 → successful
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "399"})
    assert_eq("399 → status=successful", r["status"], "successful")
end

-- 2e. Boundary: HTTP 400 → failed
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "400"})
    assert_eq("400 → status=failed", r["status"], "failed")
    assert_eq("400 → group=4xx", r["status_code_group"], "4xx")
end

-- 2f. Boundary: HTTP 499 → failed (4xx)
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "499"})
    assert_eq("499 → status=failed", r["status"], "failed")
    assert_eq("499 → group=4xx", r["status_code_group"], "4xx")
end

-- 2g. Boundary: HTTP 599 → failed (5xx)
do
    local r = run_metrics({logger = "metrics", ["http.status_code"] = "599"})
    assert_eq("599 → status=failed", r["status"], "failed")
    assert_eq("599 → group=5xx", r["status_code_group"], "5xx")
end

-- ============================================================
-- 3. extract_bal_metrics_data — Response Time Conversion
-- ============================================================

print("\n=== extract_bal_metrics_data: Response Time ===\n")

-- 3a. response_time_seconds converted to milliseconds with rounding
do
    local r = run_metrics({logger = "metrics", response_time_seconds = 0.123456})
    assert_eq("0.123456s → 123ms", r["response_time"], 123)
end

-- 3b. response_time_seconds rounds correctly
do
    local r = run_metrics({logger = "metrics", response_time_seconds = 0.1235})
    assert_eq("0.1235s → 124ms (rounded up)", r["response_time"], 124)
end

-- 3c. Zero response time
do
    local r = run_metrics({logger = "metrics", response_time_seconds = 0})
    assert_eq("0s → 0ms", r["response_time"], 0)
end

-- 3d. Missing response_time_seconds defaults to 0
do
    local r = run_metrics({logger = "metrics"})
    assert_eq("missing response_time → 0ms", r["response_time"], 0)
end

-- ============================================================
-- 4. extract_bal_metrics_data — Field Extraction
-- ============================================================

print("\n=== extract_bal_metrics_data: Field Extraction ===\n")

-- 4a. All fields extracted correctly
do
    local r = run_metrics({
        logger = "metrics",
        protocol = "HTTP/1.1",
        ["src.object.name"] = "MyService",
        ["entrypoint.function.name"] = "getUser",
        ["http.method"] = "GET",
        ["http.url"] = "/api/users/1",
        ["http.status_code"] = "200",
        ["http.status_code_group"] = "2xx",
        response_time_seconds = 0.05
    })
    assert_eq("protocol extracted", r["protocol"], "HTTP/1.1")
    assert_eq("integration from src.object.name", r["integration"], "MyService")
    assert_eq("sublevel from entrypoint.function.name", r["sublevel"], "getUser")
    assert_eq("method extracted", r["method"], "GET")
    assert_eq("url extracted", r["url"], "/api/users/1")
end

-- 4b. src.main=true overrides integration to "main"
do
    local r = run_metrics({
        logger = "metrics",
        ["src.main"] = "true",
        ["src.object.name"] = "MyService"
    })
    assert_eq("src.main=true → integration=main", r["integration"], "main")
end

-- 4c. Missing optional fields get defaults
do
    local r = run_metrics({logger = "metrics"})
    assert_eq("missing protocol → Unknown", r["protocol"], "Unknown")
    assert_eq("missing integration → Unknown", r["integration"], "Unknown")
    assert_eq("missing sublevel → empty", r["sublevel"], "")
    assert_eq("missing method → empty", r["method"], "")
    assert_eq("missing url → empty", r["url"], "")
end

-- ============================================================
-- 5. Integration: Simulated BI 500 error pipeline
-- ============================================================

print("\n=== Integration: BI 500 Error Pipeline ===\n")

-- Simulate the exact logfmt fields emitted by a Ballerina runtime
-- on an unhandled error (HTTP 500) — the scenario from issue #154
do
    local bi_record = {
        logger = "metrics",
        time = "2026-03-13T05:10:15.758551Z",
        level = "INFO",
        module = "ballerina/http",
        ["src.object.name"] = "MusicMoodService",
        ["entrypoint.function.name"] = "playlist",
        ["http.method"] = "GET",
        ["http.url"] = "/MusicMood/playlist?location=Colombo",
        ["http.status_code"] = "500",
        -- http.status_code_group is intentionally absent (this is the bug trigger)
        protocol = "HTTP/1.1",
        response_time_seconds = 0.042
    }
    local r = run_metrics(bi_record)
    assert_eq("[Issue #154] BI 500 unhandled error → status=failed", r["status"], "failed")
    assert_eq("[Issue #154] BI 500 unhandled error → group=5xx", r["status_code_group"], "5xx")
    assert_eq("[Issue #154] response_time converted", r["response_time"], 42)
    assert_eq("[Issue #154] integration extracted", r["integration"], "MusicMoodService")
    assert_eq("[Issue #154] sublevel extracted", r["sublevel"], "playlist")
end

-- ============================================================
-- 6. construct_bal_app_name
-- ============================================================

print("\n=== construct_bal_app_name ===\n")

do
    local _, _, r = construct_bal_app_name("tag", 0, {app_name = "my-app", module = "http"})
    assert_eq("app_name + module → combined app", r["app"], "my-app - http")
    assert_eq("deployment set", r["deployment"], "my-app")
end

do
    local _, _, r = construct_bal_app_name("tag", 0, {app_name = "my-app", ["src.module"] = "custom/mod"})
    assert_eq("src.module takes precedence over module", r["app"], "my-app - custom/mod")
end

do
    local _, _, r = construct_bal_app_name("tag", 0, {app_name = "my-app"})
    assert_eq("no module → app_name only", r["app"], "my-app")
end

do
    local _, _, r = construct_bal_app_name("tag", 0, {})
    assert_eq("missing app_name → unknown", r["app"], "unknown")
    assert_eq("missing app_name → deployment=unknown", r["deployment"], "unknown")
end

-- ============================================================
-- 7. generate_document_id — Deduplication
-- ============================================================

print("\n=== generate_document_id: Deduplication ===\n")

do
    local record1 = {time = "2026-03-13T05:10:15.758551Z", message = "hello", level = "INFO", icp_runtimeId = "rt1", log_file_path = "/var/log/app.log"}
    local record2 = {time = "2026-03-13T05:10:15.758551Z", message = "hello", level = "INFO", icp_runtimeId = "rt1", log_file_path = "/var/log/app.log"}
    generate_document_id("tag", 0, record1)
    generate_document_id("tag", 0, record2)
    assert_eq("identical records → same doc_id", record1["doc_id"], record2["doc_id"])
end

do
    local record1 = {time = "2026-03-13T05:10:15.758551Z", message = "hello", level = "INFO"}
    local record2 = {time = "2026-03-13T05:10:15.758552Z", message = "hello", level = "INFO"}
    generate_document_id("tag", 0, record1)
    generate_document_id("tag", 0, record2)
    assert_eq("different timestamps → different doc_id", record1["doc_id"] ~= record2["doc_id"], true)
end

-- ============================================================
-- Summary
-- ============================================================

print(string.format("\n=== Results: %d/%d passed, %d failed ===\n", pass_count, total_count, fail_count))
if fail_count > 0 then
    os.exit(1)
end
