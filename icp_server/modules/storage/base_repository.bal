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

import ballerina/sql;

public client class BaseRepository {
    final sql:Client dbClient;

    public function init(sql:Client dbClient) {
        self.dbClient = dbClient;
    }

    // Common helper methods
    isolated function toJsonString(anydata value) returns string|error {
        json|error jsonValue = value.cloneWithType(json);
        if jsonValue is error {
            return error("Failed to convert to JSON", jsonValue);
        }
        return jsonValue.toJsonString();
    }

    isolated function fromJsonString(string jsonStr, typedesc<anydata> targetType) returns anydata|error {
        json|error jsonValue = jsonStr.fromJsonString();
        if jsonValue is error {
            return error("Invalid JSON string", jsonValue);
        }
        return jsonValue.cloneWithType(targetType);
    }
}
