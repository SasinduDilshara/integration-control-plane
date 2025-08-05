// Copyright (c) 2025, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
//
// WSO2 Inc. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
//  http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

// Server configuration
configurable int serverPort = 8080;
configurable string serverHost = "0.0.0.0";

// Authentication configuration
configurable string jwtSecret = "your-secret-key-change-in-production";
configurable string jwtIssuer = "icp-server";
configurable string jwtAudience = "icp-users";
configurable int jwtExpiryHours = 24;

// Operational configuration
configurable int heartbeatTimeoutSeconds = 300; // 5 minutes
configurable int schedulerIntervalSeconds = 60; // 1 minute
configurable int maxPendingCommands = 100;

// Logging configuration
configurable string logLevel = "INFO"; // DEBUG, INFO, WARN, ERROR
configurable boolean enableAuditLogging = true;
configurable boolean enableMetrics = true;

// Connection pool and timeout settings
configurable int dbConnectionTimeoutSeconds = 30;
configurable int httpTimeoutSeconds = 30;
configurable int maxRetryAttempts = 3;

