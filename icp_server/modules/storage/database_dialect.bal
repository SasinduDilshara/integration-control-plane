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

import ballerina/time;

// SQL Dialect abstraction for database-specific features

// Datetime conversion utility functions
public isolated function convertUtcToH2DateTime(time:Utc utcTime) returns string|error {
    time:Civil civilTime = time:utcToCivil(utcTime);
    int seconds = <int>civilTime.second;
    if seconds > 59 {
        seconds = 59;
    }
    return string `${civilTime.year}-${civilTime.month.toString().padStart(2, "0")}-${civilTime.day.toString().padStart(2, "0")} ${civilTime.hour.toString().padStart(2, "0")}:${civilTime.minute.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

public isolated function convertUtcToMySQLDateTime(time:Utc utcTime) returns string|error {
    time:Civil civilTime = time:utcToCivil(utcTime);
    int seconds = <int>civilTime.second;

    // Clamp seconds to valid range (0-59)
    if seconds > 59 {
        seconds = 59;
    }

    // Extract nanoseconds from the original UTC tuple (second element)
    decimal nanoSecondDecimal = utcTime[1];
    int nanoSeconds = <int>nanoSecondDecimal;

    // Convert nanoseconds to microseconds (MySQL supports up to 6 decimal places for microseconds)
    int microSeconds = nanoSeconds / 1000;

    // Format: YYYY-MM-DD HH:MM:SS.mmmmmm (6 digit microseconds)
    return string `${civilTime.year}-${civilTime.month.toString().padStart(2, "0")}-${civilTime.day.toString().padStart(2, "0")} ${civilTime.hour.toString().padStart(2, "0")}:${civilTime.minute.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${microSeconds.toString().padStart(6, "0")}`;
}

public isolated function convertUtcToDbDateTime(time:Utc utcTime) returns string|error {
    if dbType == H2 {
        return convertUtcToH2DateTime(utcTime);
    } else {
        return convertUtcToMySQLDateTime(utcTime);
    }
}
