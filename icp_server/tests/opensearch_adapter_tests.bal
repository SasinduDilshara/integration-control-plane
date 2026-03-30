// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
//  http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import ballerina/test;

// ──────────────────────────────────────────────────────────────────────────────
// Unit tests for constructLogEntry() — Issue #152
// Verifies that the error field is included in the logfmt output string
// ──────────────────────────────────────────────────────────────────────────────

@test:Config {
    groups: ["opensearch-adapter", "construct-log-entry"]
}
function testConstructLogEntryWithError() returns error? {
    LogSource logSrc = {
        time: "2026-03-30T10:00:01.000+05:30",
        level: "ERROR",
        message: "Heartbeat response error",
        'error: "{\"causes\":[{\"message\":\"Connection refused: localhost/127.0.0.1:9445\"}],\"message\":\"Something wrong with the connection\"}",
        service_type: "ballerina",
        module: "ballerinax/wso2.icp",
        app_name: "musicforweather",
        icp_runtimeId: "musicforweather"
    };

    string logEntry = constructLogEntry(logSrc);

    test:assertTrue(logEntry.includes("error=\""), "Log entry should contain error field");
    test:assertTrue(logEntry.includes("Connection refused"), "Log entry should contain error details");
    test:assertTrue(logEntry.includes("Something wrong with the connection"), "Log entry should contain error message");
}

@test:Config {
    groups: ["opensearch-adapter", "construct-log-entry"]
}
function testConstructLogEntryWithoutError() returns error? {
    LogSource logSrc = {
        time: "2026-03-30T10:00:02.000+05:30",
        level: "INFO",
        message: "Application started successfully",
        service_type: "ballerina",
        module: "ballerinax/wso2.icp",
        app_name: "musicforweather",
        icp_runtimeId: "musicforweather"
    };

    string logEntry = constructLogEntry(logSrc);

    test:assertFalse(logEntry.includes("error="), "Log entry should not contain error field for INFO logs without error");
    test:assertTrue(logEntry.includes("message=\"Application started successfully\""), "Log entry should contain the message");
}

@test:Config {
    groups: ["opensearch-adapter", "construct-log-entry"]
}
function testConstructLogEntryWithEmptyError() returns error? {
    LogSource logSrc = {
        time: "2026-03-30T10:00:03.000+05:30",
        level: "ERROR",
        message: "Some error",
        'error: "",
        service_type: "ballerina",
        icp_runtimeId: "test-runtime"
    };

    string logEntry = constructLogEntry(logSrc);

    test:assertFalse(logEntry.includes("error="), "Log entry should not contain error field when error is empty string");
}

@test:Config {
    groups: ["opensearch-adapter", "construct-log-entry"]
}
function testConstructLogEntryWithNullError() returns error? {
    LogSource logSrc = {
        time: "2026-03-30T10:00:04.000+05:30",
        level: "WARN",
        message: "A warning",
        'error: (),
        service_type: "ballerina",
        icp_runtimeId: "test-runtime"
    };

    string logEntry = constructLogEntry(logSrc);

    test:assertFalse(logEntry.includes("error="), "Log entry should not contain error field when error is null");
}

@test:Config {
    groups: ["opensearch-adapter", "construct-log-entry"]
}
function testConstructLogEntryWithSimpleStringError() returns error? {
    LogSource logSrc = {
        time: "2026-03-30T10:00:05.000+05:30",
        level: "ERROR",
        message: "Connection failed",
        'error: "Connection refused",
        service_type: "ballerina",
        icp_runtimeId: "test-runtime"
    };

    string logEntry = constructLogEntry(logSrc);

    test:assertTrue(logEntry.includes("error=\"Connection refused\""), "Log entry should contain simple error string");
}

@test:Config {
    groups: ["opensearch-adapter", "construct-log-entry"]
}
function testConstructLogEntryWithLargeNestedError() returns error? {
    string largeError = "{\"causes\":[{\"message\":\"Connection refused: localhost/127.0.0.1:9445\",\"detail\":{},\"stackTrace\":[\"frame1\",\"frame2\",\"frame3\"]},{\"message\":\"Retry exhausted\",\"detail\":{\"retries\":3},\"stackTrace\":[]}],\"message\":\"Something wrong with the connection\",\"detail\":{\"endpoint\":\"https://localhost:9445/heartbeat\"},\"stackTrace\":[\"main\",\"heartbeat\",\"send\"]}";

    LogSource logSrc = {
        time: "2026-03-30T10:00:06.000+05:30",
        level: "ERROR",
        message: "Heartbeat response error",
        'error: largeError,
        service_type: "ballerina",
        module: "ballerinax/wso2.icp",
        app_name: "musicforweather",
        icp_runtimeId: "musicforweather"
    };

    string logEntry = constructLogEntry(logSrc);

    test:assertTrue(logEntry.includes("error=\""), "Log entry should contain error field for large nested error");
    test:assertTrue(logEntry.includes("Retry exhausted"), "Log entry should contain nested error details");
}

@test:Config {
    groups: ["opensearch-adapter", "construct-log-entry"]
}
function testConstructLogEntryErrorFieldOrder() returns error? {
    LogSource logSrc = {
        time: "2026-03-30T10:00:07.000+05:30",
        level: "ERROR",
        message: "Test error",
        'error: "some error",
        service_type: "ballerina",
        module: "test/module",
        traceId: "abc123",
        spanId: "span456",
        icp_runtimeId: "runtime1"
    };

    string logEntry = constructLogEntry(logSrc);

    // Error should appear after message and before traceId/spanId/runtimeId
    int? messageIdx = logEntry.indexOf("message=");
    int? errorIdx = logEntry.indexOf("error=");
    int? traceIdx = logEntry.indexOf("traceId=");

    test:assertTrue(messageIdx is int, "Log entry should contain message");
    test:assertTrue(errorIdx is int, "Log entry should contain error");
    test:assertTrue(traceIdx is int, "Log entry should contain traceId");
    test:assertTrue(<int>messageIdx < <int>errorIdx, "Error should appear after message");
    test:assertTrue(<int>errorIdx < <int>traceIdx, "Error should appear before traceId");
}

@test:Config {
    groups: ["opensearch-adapter", "construct-log-entry"]
}
function testConstructLogEntryMIServiceTypeWithError() returns error? {
    LogSource logSrc = {
        time: "2026-03-30T10:00:08.000+05:30",
        level: "ERROR",
        message: "MI deployment failed",
        'error: "Artifact deployment error",
        service_type: "MI",
        artifact_container: "CarbonApplication",
        icp_runtimeId: "mi-runtime"
    };

    string logEntry = constructLogEntry(logSrc);

    test:assertTrue(logEntry.includes("error=\"Artifact deployment error\""), "MI log entry should contain error field");
    test:assertTrue(logEntry.includes("artifact_container=\"CarbonApplication\""), "MI log entry should contain MI-specific fields");
}

// ──────────────────────────────────────────────────────────────────────────────
// Unit tests for LogSource deserialization — Issue #152
// Verifies that the error field is captured from JSON data
// ──────────────────────────────────────────────────────────────────────────────

@test:Config {
    groups: ["opensearch-adapter", "log-source-deserialization"]
}
function testLogSourceDeserializationWithError() returns error? {
    json sourceJson = {
        "level": "ERROR",
        "message": "Heartbeat response error",
        "error": "{\"causes\":[{\"message\":\"Connection refused\"}]}",
        "time": "2026-03-30T10:00:01.000+05:30",
        "service_type": "ballerina",
        "icp_runtimeId": "musicforweather"
    };

    LogSource logSrc = check sourceJson.cloneWithType();

    test:assertEquals(logSrc?.'error, "{\"causes\":[{\"message\":\"Connection refused\"}]}", "Error field should be deserialized from JSON");
    test:assertEquals(logSrc?.message, "Heartbeat response error", "Message field should be deserialized");
    test:assertEquals(logSrc?.level, "ERROR", "Level field should be deserialized");
}

@test:Config {
    groups: ["opensearch-adapter", "log-source-deserialization"]
}
function testLogSourceDeserializationWithoutError() returns error? {
    json sourceJson = {
        "level": "INFO",
        "message": "Application started successfully",
        "time": "2026-03-30T10:00:02.000+05:30",
        "service_type": "ballerina",
        "icp_runtimeId": "musicforweather"
    };

    LogSource logSrc = check sourceJson.cloneWithType();

    test:assertEquals(logSrc?.'error, (), "Error field should be null when not present in source");
    test:assertEquals(logSrc?.message, "Application started successfully", "Message field should be deserialized");
}

// ──────────────────────────────────────────────────────────────────────────────
// Unit tests for deduplicateLogEntries() — Regression
// Verifies that deduplication still works correctly with LogContext populated
// ──────────────────────────────────────────────────────────────────────────────

@test:Config {
    groups: ["opensearch-adapter", "deduplication"]
}
function testDeduplicationWithErrorInLogContext() returns error? {
    string errorContent = "{\"message\":\"Connection refused\"}";

    // Two identical rows with error in LogContext (col 13)
    json[] row1 = [
        "2026-03-30T10:00:01.000Z", "ERROR", "time=... message=\"err\"", (), "",
        "app1", "mod1", "ballerina", (), (), (), "", "runtime1",
        errorContent, "", "",
        "err", "2026-03-30T10:00:01.000+05:30"
    ];
    json[] row2 = [
        "2026-03-30T10:00:01.000Z", "ERROR", "time=... message=\"err\"", (), "",
        "app1", "mod1", "ballerina", (), (), (), "", "runtime1",
        errorContent, "", "",
        "err", "2026-03-30T10:00:01.000+05:30"
    ];

    json[][] rows = [row1, row2];
    json[][] result = deduplicateLogEntries(rows);

    test:assertEquals(result.length(), 1, "Duplicate rows with same error should be deduplicated to one");
}

@test:Config {
    groups: ["opensearch-adapter", "deduplication"]
}
function testDeduplicationDifferentErrorsNotDeduplicated() returns error? {
    // Two rows with same timestamp/message but different errors — should NOT be deduplicated
    // because deduplication is based on raw message, not error content
    json[] row1 = [
        "2026-03-30T10:00:01.000Z", "ERROR", "logentry1", (), "",
        "app1", "mod1", "ballerina", (), (), (), "", "runtime1",
        "{\"message\":\"Error A\"}", "", "",
        "Heartbeat response error", "2026-03-30T10:00:01.000+05:30"
    ];
    json[] row2 = [
        "2026-03-30T10:00:01.000Z", "ERROR", "logentry2", (), "",
        "app1", "mod1", "ballerina", (), (), (), "", "runtime1",
        "{\"message\":\"Error B\"}", "", "",
        "Heartbeat response error", "2026-03-30T10:00:01.000+05:30"
    ];

    json[][] rows = [row1, row2];
    json[][] result = deduplicateLogEntries(rows);

    // Same raw message + timestamp + level + runtimeId + logFilePath → deduplicated
    test:assertEquals(result.length(), 1, "Rows with same dedup key should be deduplicated even with different errors");
}

// ──────────────────────────────────────────────────────────────────────────────
// Integration test: end-to-end constructLogEntry + LogContext for error logs
// ──────────────────────────────────────────────────────────────────────────────

@test:Config {
    groups: ["opensearch-adapter", "integration"]
}
function testErrorLogEndToEnd() returns error? {
    // Simulate the full flow: JSON → LogSource → constructLogEntry + LogContext
    json sourceJson = {
        "level": "ERROR",
        "message": "Heartbeat response error",
        "error": "{\"causes\":[{\"message\":\"Connection refused: localhost/127.0.0.1:9445\",\"detail\":{},\"stackTrace\":[]}],\"message\":\"Something wrong with the connection\",\"detail\":{},\"stackTrace\":[]}",
        "time": "2026-03-30T10:00:01.000+05:30",
        "service_type": "ballerina",
        "module": "ballerinax/wso2.icp",
        "app_name": "musicforweather",
        "icp_runtimeId": "musicforweather"
    };

    // Step 1: Deserialize
    LogSource logSrc = check sourceJson.cloneWithType();
    test:assertTrue(logSrc?.'error is string, "Error field should be deserialized as string");

    // Step 2: Construct log entry — error should be in the logfmt string
    string logEntry = constructLogEntry(logSrc);
    test:assertTrue(logEntry.includes("error=\""), "Log entry should include error field");
    test:assertTrue(logEntry.includes("Connection refused"), "Log entry should include error details");
    test:assertTrue(logEntry.includes("message=\"Heartbeat response error\""), "Log entry should still include message");
    test:assertTrue(logEntry.includes("module=\"ballerinax/wso2.icp\""), "Log entry should include module");
    test:assertTrue(logEntry.includes("icp.runtimeId=\"musicforweather\""), "Log entry should include runtime ID");

    // Step 3: LogContext column should carry the error value
    string? logContext = logSrc?.'error;
    test:assertTrue(logContext is string, "LogContext (error field) should not be null for error logs");
    test:assertTrue((<string>logContext).includes("Connection refused"), "LogContext should contain full error details");
}

@test:Config {
    groups: ["opensearch-adapter", "integration"]
}
function testInfoLogEndToEnd() returns error? {
    // INFO log without error — LogContext should be null, logEntry should have no error
    json sourceJson = {
        "level": "INFO",
        "message": "Application started successfully",
        "time": "2026-03-30T10:00:02.000+05:30",
        "service_type": "ballerina",
        "module": "ballerinax/wso2.icp",
        "app_name": "musicforweather",
        "icp_runtimeId": "musicforweather"
    };

    LogSource logSrc = check sourceJson.cloneWithType();

    string logEntry = constructLogEntry(logSrc);
    test:assertFalse(logEntry.includes("error="), "INFO log entry should not contain error field");
    test:assertTrue(logEntry.includes("message=\"Application started successfully\""), "Log entry should contain message");

    string? logContext = logSrc?.'error;
    test:assertEquals(logContext, (), "LogContext should be null for INFO logs without error");
}
