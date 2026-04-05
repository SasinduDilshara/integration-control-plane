-- Unit tests for scripts.lua — Fluent Bit Lua processing pipeline
-- Issue #154: Metrics dashboard not capturing 500 responses as errors
--
-- Run with:  lua test_scripts.lua
-- Requires:  lua 5.x (tested with 5.4+)

local script_dir = debug.getinfo(1, "S").source:match("^@?(.*/)")
dofile((script_dir or "./") .. "scripts.lua")

-- ---------------------------------------------------------------------------
-- Minimal test harness
-- ---------------------------------------------------------------------------
local PASS, FAIL = 0, 0

local function assert_eq(label, got, expected)
    if got == expected then
        PASS = PASS + 1
        io.write(string.format("  PASS  %s\n", label))
    else
        FAIL = FAIL + 1
        io.write(string.format("  FAIL  %s\n        expected: %s\n        got:      %s\n",
            label, tostring(expected), tostring(got)))
    end
end

local function run(description, record_in)
    -- extract_bal_metrics_data returns (code, timestamp, modified_record)
    local _, _, record_out = extract_bal_metrics_data("tag", 0, record_in)
    io.write(string.format("\n[%s]\n", description))
    return record_out
end

-- ---------------------------------------------------------------------------
-- Helper: build a minimal metrics record
-- ---------------------------------------------------------------------------
local function metrics_record(overrides)
    local r = {
        logger = "metrics",
        ["response_time_seconds"] = 0.1,
        ["http.method"] = "GET",
        ["http.url"] = "/test",
    }
    for k, v in pairs(overrides or {}) do
        r[k] = v
    end
    return r
end

-- ===========================================================================
-- BUG SCENARIO (issue #154)
-- ===========================================================================

-- Test 1: 500 error WITHOUT http.status_code_group — the original bug
local r = run("BUG #154: 500 error, http.status_code_group absent → status must be 'failed'",
    metrics_record({ ["http.status_code"] = 500 }))
assert_eq("status == 'failed'",            r["status"],            "failed")
assert_eq("status_code_group == '5xx'",    r["status_code_group"], "5xx")

-- Test 2: 404 error WITHOUT http.status_code_group
r = run("404 error, http.status_code_group absent → status must be 'failed'",
    metrics_record({ ["http.status_code"] = 404 }))
assert_eq("status == 'failed'",            r["status"],            "failed")
assert_eq("status_code_group == '4xx'",    r["status_code_group"], "4xx")

-- ===========================================================================
-- NORMAL / HAPPY PATH
-- ===========================================================================

-- Test 3: 200 OK, no group field
r = run("200 OK, http.status_code_group absent → status must be 'successful'",
    metrics_record({ ["http.status_code"] = 200 }))
assert_eq("status == 'successful'",        r["status"],            "successful")
assert_eq("status_code_group == '2xx'",    r["status_code_group"], "2xx")

-- Test 4: http.status_code_group present as '4xx' (group wins)
r = run("http.status_code_group='4xx' explicitly set → status must be 'failed'",
    metrics_record({ ["http.status_code_group"] = "4xx" }))
assert_eq("status == 'failed'",            r["status"],            "failed")
assert_eq("status_code_group == '4xx'",    r["status_code_group"], "4xx")

-- Test 5: http.status_code_group present as '5xx' AND http.status_code=500
r = run("http.status_code_group='5xx' with http.status_code=500 → status must be 'failed'",
    metrics_record({ ["http.status_code"] = 500, ["http.status_code_group"] = "5xx" }))
assert_eq("status == 'failed'",            r["status"],            "failed")
assert_eq("status_code_group == '5xx'",    r["status_code_group"], "5xx")

-- Test 6: 201 Created
r = run("201 Created → status must be 'successful'",
    metrics_record({ ["http.status_code"] = 201 }))
assert_eq("status == 'successful'",        r["status"],            "successful")
assert_eq("status_code_group == '2xx'",    r["status_code_group"], "2xx")

-- Test 7: 301 Redirect
r = run("301 Redirect (3xx) → status must be 'successful'",
    metrics_record({ ["http.status_code"] = 301 }))
assert_eq("status == 'successful'",        r["status"],            "successful")
assert_eq("status_code_group == '3xx'",    r["status_code_group"], "3xx")

-- ===========================================================================
-- EDGE CASES
-- ===========================================================================

-- Test 8: Non-metrics logger — record must pass through untouched
r = run("Non-metrics logger → record returned unchanged (no status field added)",
    { logger = "error", message = "something broke" })
assert_eq("status field absent",           r["status"],            nil)
assert_eq("status_code_group absent",      r["status_code_group"], nil)

-- Test 9: http.status_code_group is empty string → fall back to http.status_code
r = run("http.status_code_group='' (empty) with http.status_code=500 → derive from code",
    metrics_record({ ["http.status_code"] = 500, ["http.status_code_group"] = "" }))
assert_eq("status == 'failed'",            r["status"],            "failed")
assert_eq("status_code_group == '5xx'",    r["status_code_group"], "5xx")

-- Test 10: Both fields absent → safe default
r = run("Both http.status_code and http.status_code_group absent → status 'successful', group ''",
    metrics_record())
assert_eq("status == 'successful'",        r["status"],            "successful")
assert_eq("status_code_group == ''",       r["status_code_group"], "")

-- Test 11: http.status_code = 0 (malformed) → should not crash, default 'successful'
r = run("http.status_code=0 (malformed) → status must be 'successful' (0xx is not an error group)",
    metrics_record({ ["http.status_code"] = 0 }))
assert_eq("status == 'successful'",        r["status"],            "successful")
assert_eq("status_code_group == '0xx'",    r["status_code_group"], "0xx")

-- Test 12: response_time conversion (milliseconds, rounded)
r = run("response_time_seconds=0.2156 → response_time rounded to 216 ms",
    metrics_record({ ["response_time_seconds"] = 0.2156 }))
assert_eq("response_time == 216",          r["response_time"],     216)

-- Test 13: http.status_code_group='2xx' explicitly set → not failed
r = run("http.status_code_group='2xx' explicitly set → status must be 'successful'",
    metrics_record({ ["http.status_code_group"] = "2xx" }))
assert_eq("status == 'successful'",        r["status"],            "successful")
assert_eq("status_code_group == '2xx'",    r["status_code_group"], "2xx")

-- Test 14: 503 Service Unavailable, no group field
r = run("503 Service Unavailable, no group field → status must be 'failed'",
    metrics_record({ ["http.status_code"] = 503 }))
assert_eq("status == 'failed'",            r["status"],            "failed")
assert_eq("status_code_group == '5xx'",    r["status_code_group"], "5xx")

-- ===========================================================================
-- Summary
-- ===========================================================================
io.write(string.format("\n%s\nResults: %d passed, %d failed\n",
    string.rep("-", 60), PASS, FAIL))

if FAIL > 0 then
    os.exit(1)
end
