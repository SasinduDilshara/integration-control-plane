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
import ballerinax/mysql;
import ballerinax/mysql.driver as _;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

type Config record {
    string host = dbHost;
    int port = dbPort;
    string name = dbName;
    string username = dbUser;
    string password = dbPassword;
    int maxPoolSize = 10;
};

type MySQLConfig record {
    *Config;
};

enum DatabaseType {
    MYSQL = "mysql",
    POSTGRESQL = "postgresql"
}

public client class DatabaseConnectionManager {
    private final sql:Client dbClient;
    private final string dbType;

    public function init(string dbType) returns error? {
        self.dbType = dbType;
        sql:ConnectionPool pool = {
            maxOpenConnections: maxOpenConnections,
            minIdleConnections: minIdleConnections,
            maxConnectionLifeTime: maxConnectionLifeTime
        };

        if dbType == MYSQL {
            self.dbClient = check new mysql:Client(dbHost, dbUser, dbPassword, dbName, dbPort, connectionPool = pool);
        } else {
            self.dbClient = check new postgresql:Client(dbHost, dbUser, dbPassword, dbName, dbPort, connectionPool = pool);
        }
    }

    public isolated function getClient() returns sql:Client {
        return self.dbClient;
    }

    public isolated function close() returns error? {
        return self.dbClient.close();
    }
}
