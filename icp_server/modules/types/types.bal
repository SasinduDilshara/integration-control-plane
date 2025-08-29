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
import ballerina/time;

// === Enums ===

public enum RuntimeType {
    MI,
    BI
}

public enum DeploymentType {
    VM,
    K8S
}

public enum RuntimeStatus {
    RUNNING,
    FAILED,
    DISABLED,
    OFFLINE,
    STOPPED
}

public enum ArtifactState {
    ENABLED,
    DISABLED,
    STARTING,
    STOPPING,
    FAILED
}

public enum ArtifactType {
    SERVICE = "services",
    LISTENER = "listeners"
}

// === Core Domain Types ===

public type Artifact record {
    string name;
};

public type Resource record {
    string[] methods;
    string url;
};

public type ListenerDetail record {
    *Artifact;
    string protocol?;
    string package;
    ArtifactState state = ENABLED;
};

public type ServiceDetail record {
    *Artifact;
    string? basePath;
    string package;
    Artifact[] listeners;
    Resource[] resources;
    ArtifactState state = ENABLED;
};

public type ArtifactDetail ServiceDetail|ListenerDetail;

public type Artifacts record {
    ListenerDetail[] listeners;
    ServiceDetail[] services;
};

public type Node record {
    string platformName = "ballerina";
    string platformVersion?;
    string platformHome?;
    string ballerinaHome?;
    string osName?;
    string osVersion?;
};

// Heartbeat that includes all runtime information for registration/updates
public type Heartbeat record {|
    string runtimeId;
    RuntimeType runtimeType;
    RuntimeStatus status;
    string environment;
    string version?;
    Node nodeInfo;
    Artifacts artifacts;
    string runtimeHash;
    time:Utc timestamp;
|};

// Delta heartbeat with hash value
public type DeltaHeartbeat record {|
    string runtimeId;
    string runtimeHash;
    time:Utc timestamp;
|};

// === ICP Control Types ===

public type ControlCommand record {
    string commandId;
    string runtimeId;
    string targetArtifact;
    string action;
    time:Utc issuedAt;
    string status; // pending, sent, acknowledged, failed
};

public type HeartbeatResponse record {
    boolean acknowledged;
    boolean fullHeartbeatRequired?;
    ControlCommand[] commands?;
};

public type RuntimeRegistrationResponse record {
    boolean success;
    string message?;
    string[] errors?;
};

// === Configuration ===

public type IcpServer record {|
    string serverUrl;
    string authToken;
    decimal heartbeatInterval;
|};

public type Observability record {|
    string opensearchUrl;
    string logIndex;
    boolean metricsEnabled;
|};

public type IcpConfig record {|
    IcpServer icp;
    Observability observability;
|};

public type RequestLimit record {
    int maxUriLength;
    int maxHeaderSize;
    int maxEntityBodySize;
};

// === Summary / View Types ===

public type RuntimeSummary record {
    string runtimeId;
    RuntimeType runtimeType;
    RuntimeStatus status;
    string environment;
    int totalServices;
    int totalListeners;
    time:Utc lastHeartbeat?;
    boolean isOnline;
};

public type ChangeNotification record {
    anydata[] deployedArtifacts;
    anydata[] undeployedArtifacts;
    anydata[] stateChangedArtifacts;
};

// === API Wrappers / Auth ===

public type UserClaims record {
    string sub;
    string[] roles;
    int exp;
};

public type ApiResponse record {
    boolean success;
    string message?;
    json data?;
    string[] errors?;
};

public type AccessTokenResponse record {|
    string AccessToken;
|};

// Database record types for mapping query results
public type RuntimeDBRecord record {
    string runtime_id;
    string runtime_type;
    string status;
    string environment;
    string version?;
    string platform_name?;
    string platform_version?;
    string platform_home?;
    string os_name?;
    string os_version?;
    time:Utc registration_time?;
    time:Utc last_heartbeat?;
};

// GraphQL response types
public type Runtime record {
    @sql:Column {
        name: "runtime_id"
    }
    string runtimeId;

    @sql:Column {
        name: "runtime_type"
    }
    string runtimeType;

    string status;
    string environment;
    string version?;

    @sql:Column {
        name: "platform_name"
    }
    string platformName?;

    @sql:Column {
        name: "platform_version"
    }
    string platformVersion?;

    @sql:Column {
        name: "platform_home"
    }
    string platformHome?;

    @sql:Column {
        name: "os_name"
    }
    string osName?;

    @sql:Column {
        name: "os_version"
    }
    string osVersion?;

    @sql:Column {
        name: "registration_time"
    }
    string registrationTime?;

    @sql:Column {
        name: "last_heartbeat"
    }
    string lastHeartbeat?;

    Service[] services = [];
    Listener[] listeners = [];
};

public type ServiceRecordInDB record {
    string service_name;
    string service_package;
    string base_path;
    ArtifactState state;
};

public type ListenerRecordInDB record {
    string listener_name;
    string listener_package;
    string protocol;
    ArtifactState state;
};

public type ResourceRecord record {
    string resource_url;
    string methods; // JSON string of array
};

public type Service record {
    string name;
    string package;
    string basePath;
    ArtifactState state = ENABLED;
    Resource[] resources;
};

public type Listener record {
    string name;
    string package;
    string protocol;
    ArtifactState state = ENABLED;
};

// === Project & Component Types ===

public type Project record {
    string projectId;
    string name;
    string description?;
    string createdBy?;
    string createdAt?;
};

public type ProjectInput record {
    string name;
    string description?;
};

public type Component record {
    @sql:Column {
        name: "component_id"
    }
    string componentId;
    Project project;
    string name;
    string description?;
    @sql:Column {
        name: "created_by"
    }
    string createdBy?;
    @sql:Column {
        name: "created_at"
    }
    string createdAt?;
};

public type ComponentInput record {
    string projectId;
    string name;
    string description?;
};

public type Environment record {
    @sql:Column {
        name: "environment_id"
    }
    string environmentId;
    string name;
    string description?;

    @sql:Column {
        name: "created_at"
    }
    string createdAt?;

    @sql:Column {
        name: "updated_at"
    }
    string updatedAt?;
};

public type EnvironmentInput record {
    string name;
    string description?;
};
