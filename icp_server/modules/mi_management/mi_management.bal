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

// Package: mi_management
// Provides utility functions to call the WSO2 MI Management REST API
// (at /management path) using HMAC-signed JWT auth — the same auth mechanism
// used for the /icp/artifacts internal API.
//
// Management API swagger: resources/management-api.yaml
// Server base: https://{host}:{port}/management
//
// Response format note: when a name filter is provided (e.g. ?apiName=X), the
// MI Management API returns the artifact object directly. Without a filter it
// returns {"count": N, "list": [{...}, ...]}. extractFirstFromMgmtList()
// handles both transparently.

import ballerina/http;
import ballerina/log;

// Path prefix for all Management API endpoints
const string MGMT_API_PATH = "/management";

// ============================================================
// Management API Response Types
// These types reflect what the MI Management REST API returns
// for single-artifact queries (name-filtered requests).
// They differ from /icp/artifacts types by design:
//   - /icp/artifacts  → artifact source XML / configuration
//   - /management     → operational metadata (status, URLs, etc.)
// ============================================================

// GET /management/proxy-services?proxyServiceName={name}
public type MgmtProxyServiceInfo record {|
    string name;
    string wsdl1_1?;
    string wsdl2_0?;
    string configuration?;
|};

// GET /management/apis?apiName={name}
public type MgmtRestApiInfo record {|
    string name;
    string url?;
    string tracing?;
    string stats?;
    string configuration?;
|};

// GET /management/endpoints?endpointName={name}
public type MgmtEndpointInfo record {|
    string name;
    string 'type?;
    boolean isActive?;
|};

// GET /management/sequences?sequenceName={name}
public type MgmtSequenceInfo record {|
    string name;
    string container?;
    string tracing?;
    string stats?;
|};

// GET /management/tasks?taskName={name}
public type MgmtTaskInfo record {|
    string name;
    string configuration?;
    string triggerType?;
    string triggerInterval?;
    string triggerCount?;
    string implementation?;
    string taskGroup?;
|};

// GET /management/local-entries?name={name}
public type MgmtLocalEntryInfo record {|
    string name;
    string 'type?;
    string value?;
|};

// GET /management/message-stores?name={name}
public type MgmtMessageStoreInfo record {|
    string name;
    string 'type?;
    int size?;
    string container?;
|};

// GET /management/message-processors?name={name}
public type MgmtMessageProcessorInfo record {|
    string name;
    string 'type?;
    string status?;
    string messageStore?;
|};

// GET /management/inbound-endpoints?inboundEndpointName={name}
// Full single-item response: {name, protocol, sequence, error, status, stats,
//   tracing, configuration, parameters:[{name,value},...]}
public type MgmtInboundEndpointInfo record {|
    string name;
    string protocol?;
    string status?;
    string stats?;
    string tracing?;
|};

// GET /management/connectors (no name filter — filtered client-side)
public type MgmtConnectorInfo record {|
    string name;
    string 'package?;
    string description?;
    string status?;
|};

// Individual template entry (used in sequence and endpoint template lists)
public type MgmtTemplateInfo record {|
    string name;
|};

// GET /management/data-services?dataServiceName={name}
public type MgmtDataServiceInfo record {|
    string name;
    string wsdl1_1?;
    string wsdl2_0?;
|};

public type MgmtDataServiceDataSource record {|
    string dataSourceId;
    string dataSourceType?;
    MgmtArtifactParameter[] properties;
|};

public type MgmtDataServiceQuery record {|
    string id;
    string dataSourceId?;
    string namespace?;
|};

public type MgmtDataServiceResource record {|
    string resourcePath;
    string resourceMethod?;
    string resourceQuery?;
|};

public type MgmtDataServiceOperation record {|
    string operationName;
    string queryName?;
|};

public type MgmtDataServiceOverview record {|
    string serviceName;
    string serviceDescription?;
    string wsdl1_1?;
    string wsdl2_0?;
    string swagger_url?;
    MgmtDataServiceDataSource[] dataSources;
    MgmtDataServiceQuery[] queries;
    MgmtDataServiceResource[] resources;
    MgmtDataServiceOperation[] operations;
|};

// GET /management/data-sources?name={name}
public type MgmtDataSourceInfo record {|
    string name;
    string 'type?;
    string description?;
    string driverClass?;
    string userName?;
    string url?;
|};

// Artifact entry inside a carbon app
public type MgmtCarbonAppArtifactInfo record {|
    string name;
    string 'type?;
|};

// GET /management/applications?carbonAppName={name}
// Response: {"totalCount":N, "activeCount":N, "faultyCount":N, "activeList":[...], "faultyList":[...]}
public type MgmtCarbonAppInfo record {|
    string name;
    string version?;
    MgmtCarbonAppArtifactInfo[] artifacts?;
|};

// Key-value pair extracted from a management API artifact response.
// Equivalent to types:Parameter but sourced from the management API.
// Note: for inbound endpoints, the management API uses field name 'name'
// (not 'key') in the parameters array; this type normalises to 'key'.
public type MgmtArtifactParameter record {|
    string key;
    string value;
|};

// ============================================================
// Internal helpers
// ============================================================

// Extract the first (or name-matching) item from a management API response.
//
// The MI Management API has two response formats:
//   1. List format (no name filter): {"count": N, "list": [{...}, ...]}
//   2. Direct format (name filter):  {"name": "...", "url": "...", ...}
//
// This function handles both transparently.
isolated function extractFirstFromMgmtList(json response, string? expectedName = ()) returns json|error {
    if response !is map<json> {
        return error("Management API response is not a JSON object");
    }
    map<json> respMap = <map<json>>response;
    json listField = respMap["list"];

    // List format: extract the matching item from the array
    if listField is json[] {
        json[] items = listField;
        if items.length() == 0 {
            return error("Management API response list is empty");
        }
        if expectedName is () {
            return items[0];
        }
        foreach json item in items {
            if item is map<json> {
                json nameField = (<map<json>>item)["name"];
                if nameField is string && nameField == expectedName {
                    return item;
                }
            }
        }
        return error(string `Artifact '${expectedName}' not found in management API response (searched ${items.length()} items)`);
    }

    // Direct format: the response IS the item itself
    return response;
}

// callMgmtApi makes a GET request to a management API path and returns the
// raw JSON payload. Shared by all public functions to avoid duplication.
isolated function callMgmtApi(
        http:Client mgmtClient,
        string hmacToken,
        string path
) returns json|error {
    log:printDebug("Calling MI management API", path = path);
    http:Response|error respResult = mgmtClient->get(path, {
        "Authorization": string `Bearer ${hmacToken}`,
        "Accept": "application/json"
    });

    if respResult is error {
        log:printError("MI management API request failed", 'error = respResult, path = path);
        return error(string `MI management API request failed: ${respResult.message()}`);
    }

    http:Response resp = respResult;
    if resp.statusCode != http:STATUS_OK {
        string|error errPayload = resp.getTextPayload();
        string errMsg = errPayload is string ? errPayload : "Unknown error";
        log:printError("MI management API returned non-OK status",
                statusCode = resp.statusCode, path = path, response = errMsg);
        return error(string `MI management API returned status ${resp.statusCode}: ${errMsg}`);
    }

    return check resp.getJsonPayload();
}

// fetchRawArtifactItem calls the appropriate MI Management API endpoint for
// the given artifact type and returns the raw JSON item.
//
// Handles:
//   - Path construction per artifact type
//   - Both list and direct-object response formats via extractFirstFromMgmtList
//   - Connector client-side name filtering (no name filter param on that endpoint)
//   - Template / carbon-app full-payload return (non-standard response shapes)
isolated function fetchRawArtifactItem(
        http:Client mgmtClient,
        string hmacToken,
        string artifactType,
        string artifactName
) returns json|error {
    string path;
    boolean isConnector = false;
    boolean isTemplate = false;
    boolean isCarbonApp = false;
    boolean isTask = false;

    // Artifact type values are the exact strings sent by the frontend
    // (kebab-case, with "api" as the special case for RestApi).
    if artifactType == "api" {
        path = string `${MGMT_API_PATH}/apis?apiName=${artifactName}`;
    } else if artifactType == "proxy-service" {
        path = string `${MGMT_API_PATH}/proxy-services?proxyServiceName=${artifactName}`;
    } else if artifactType == "endpoint" {
        path = string `${MGMT_API_PATH}/endpoints?endpointName=${artifactName}`;
    } else if artifactType == "sequence" {
        path = string `${MGMT_API_PATH}/sequences?sequenceName=${artifactName}`;
    } else if artifactType == "task" {
        path = string `${MGMT_API_PATH}/tasks?taskName=${artifactName}`;
        isTask = true;
    } else if artifactType == "local-entry" {
        path = string `${MGMT_API_PATH}/local-entries?name=${artifactName}`;
    } else if artifactType == "message-store" {
        path = string `${MGMT_API_PATH}/message-stores?name=${artifactName}`;
    } else if artifactType == "message-processor" {
        path = string `${MGMT_API_PATH}/message-processors?name=${artifactName}`;
    } else if artifactType == "inbound-endpoint" {
        path = string `${MGMT_API_PATH}/inbound-endpoints?inboundEndpointName=${artifactName}`;
    } else if artifactType == "connector" {
        // No name filter on this endpoint; filter client-side
        path = string `${MGMT_API_PATH}/connectors`;
        isConnector = true;
    } else if artifactType == "template" {
        // Returns {"sequenceTemplateList":[...], "endpointTemplateList":[...]}
        path = string `${MGMT_API_PATH}/templates?name=${artifactName}`;
        isTemplate = true;
    } else if artifactType == "data-service" {
        path = string `${MGMT_API_PATH}/data-services?dataServiceName=${artifactName}`;
    } else if artifactType == "data-source" {
        path = string `${MGMT_API_PATH}/data-sources?name=${artifactName}`;
    } else if artifactType == "carbon-app" {
        path = string `${MGMT_API_PATH}/applications?carbonAppName=${artifactName}`;
        isCarbonApp = true;
    } else {
        return error(string `Unsupported artifact type for MI management API: ${artifactType}`);
    }

    log:printDebug("Fetching artifact from MI management API",
            artifactType = artifactType, artifactName = artifactName, path = path);

    json payload = check callMgmtApi(mgmtClient, hmacToken, path);
    log:printDebug("Received artifact payload from MI management API", artifactType = artifactType, artifactName = artifactName);
    if isConnector {
        if payload is map<json> {
            json listField = (<map<json>>payload)["list"];
            if listField is json[] {
                foreach json item in <json[]>listField {
                    if item is map<json> {
                        json nameField = (<map<json>>item)["name"];
                        if nameField is string && nameField == artifactName {
                            return item;
                        }
                    }
                }
            }
        }
        return error(string `Connector '${artifactName}' not found in MI management API response`);
    }

    if isTemplate || isCarbonApp || isTask {
        return payload;
    }

    return check extractFirstFromMgmtList(payload, artifactName);
}

// ============================================================
// Public API functions
// ============================================================

// fetchArtifactDetails returns the synapse configuration XML for the named
// artifact, or the full metadata JSON when no 'configuration' field is present.
//
// Management-API equivalent of: GET /icp/artifacts?type={type}&name={name}
public isolated function fetchArtifactDetails(
        http:Client mgmtClient,
        string hmacToken,
        string artifactType,
        string artifactName
) returns string|error {
    log:printDebug("Fetching artifact details from MI management API",
            artifactType = artifactType, artifactName = artifactName);

    json item = check fetchRawArtifactItem(mgmtClient, hmacToken, artifactType, artifactName);

    // The 'configuration' field holds the full synapse XML source.
    // For some artifact types (e.g. tasks) the management API may return the
    // configuration at the top level of the response, or inside a 'list' array.
    // Both layouts are handled below.
    if item is map<json> {
        map<json> itemMap = <map<json>>item;

        // Case 1: configuration is a top-level field (direct-object response or
        //         hybrid response where task details sit alongside a 'list' field).
        json configField = itemMap["configuration"];
        if configField is string && configField.length() > 0 {
            return configField;
        }

        // Case 2: configuration is inside a 'list' array item (list-format response
        //         where the item was not already extracted by extractFirstFromMgmtList).
        json listField = itemMap["list"];
        if listField is json[] {
            foreach json listItem in <json[]>listField {
                if listItem is map<json> {
                    json listConfigField = (<map<json>>listItem)["configuration"];
                    if listConfigField is string && listConfigField.length() > 0 {
                        return listConfigField;
                    }
                }
            }
        }
    }

    return item.toJsonString();
}

// fetchArtifactWsdlUrl returns the WSDL 1.1 URL for a proxy service or data
// service, as reported by the MI Management API.
//
// Management-API equivalent of: GET /icp/artifacts/wsdl?proxy={name}
//                             or GET /icp/artifacts/wsdl?service={name}
//
// Use fetchWsdlContent to retrieve the actual XML from the returned URL.
public isolated function fetchArtifactWsdlUrl(
        http:Client mgmtClient,
        string hmacToken,
        string artifactType,
        string artifactName
) returns string|error {
    if artifactType != "proxy-service" && artifactType != "data-service" {
        return error(string `WSDL not available via MI management API for artifact type: ${artifactType}`);
    }

    log:printDebug("Fetching WSDL URL from MI management API",
            artifactType = artifactType, artifactName = artifactName);

    json item = check fetchRawArtifactItem(mgmtClient, hmacToken, artifactType, artifactName);

    if item is map<json> {
        json wsdlUrl = (<map<json>>item)["wsdl1_1"];
        if wsdlUrl is string && wsdlUrl.length() > 0 {
            log:printDebug("Got WSDL URL from MI management API",
                    artifactName = artifactName, wsdlUrl = wsdlUrl);
            return wsdlUrl;
        }
    }
    return error(string `WSDL URL not found for '${artifactName}' in MI management API response`);
}

// fetchWsdlContent fetches the actual WSDL XML from the URL returned by the
// MI Management API. The URL is typically on the MI HTTP service port (e.g.
// http://host:8290/services/TestProxy?wsdl), distinct from the management port.
//
// Security: Validates that the WSDL URL points to the trusted runtime host to prevent SSRF attacks.
public isolated function fetchWsdlContent(string wsdlUrl, string trustedHost, boolean allowInsecureTLS) returns string|error {
    int? schemeEndPos = wsdlUrl.indexOf("://");
    if schemeEndPos is () {
        return error(string `Invalid WSDL URL (missing scheme): ${wsdlUrl}`);
    }

    // Validate scheme is http or https only
    string scheme = wsdlUrl.substring(0, schemeEndPos);
    if scheme != "http" && scheme != "https" {
        return error(string `Invalid WSDL URL scheme '${scheme}' (only http/https allowed): ${wsdlUrl}`);
    }

    int? pathStartPos = wsdlUrl.indexOf("/", schemeEndPos + 3);
    if pathStartPos is () {
        return error(string `Invalid WSDL URL (no path component): ${wsdlUrl}`);
    }

    // Extract host:port from URL
    string hostAndPort = wsdlUrl.substring(schemeEndPos + 3, pathStartPos);

    // Extract hostname (before the port if present)
    string urlHost;
    int? portSeparatorPos = hostAndPort.indexOf(":");
    if portSeparatorPos is () {
        urlHost = hostAndPort;
    } else {
        urlHost = hostAndPort.substring(0, portSeparatorPos);
    }

    // Validate that the URL host matches the trusted runtime host
    if urlHost != trustedHost {
        return error(string `WSDL URL host '${urlHost}' does not match trusted runtime host '${trustedHost}' (potential SSRF attack)`);
    }

    string wsdlBaseUrl = wsdlUrl.substring(0, pathStartPos);
    string wsdlPath = wsdlUrl.substring(pathStartPos);

    log:printDebug("Fetching WSDL content", wsdlBaseUrl = wsdlBaseUrl, wsdlPath = wsdlPath);

    http:Client|error wsdlClientResult = allowInsecureTLS
        ? new (wsdlBaseUrl, {secureSocket: {enable: false}})
        : new (wsdlBaseUrl);

    if wsdlClientResult is error {
        return error(string `Failed to create HTTP client for WSDL URL: ${wsdlClientResult.message()}`);
    }
    http:Client wsdlClient = wsdlClientResult;

    http:Response|error wsdlRespResult = wsdlClient->get(wsdlPath, {"Accept": "application/xml"});
    if wsdlRespResult is error {
        return error(string `WSDL content fetch failed: ${wsdlRespResult.message()}`);
    }
    http:Response wsdlResp = wsdlRespResult;

    if wsdlResp.statusCode != http:STATUS_OK {
        string|error errPayload = wsdlResp.getTextPayload();
        string errMsg = errPayload is string ? errPayload : "Unknown error";
        return error(string `WSDL content fetch returned status ${wsdlResp.statusCode}: ${errMsg}`);
    }

    string|error wsdlContent = wsdlResp.getTextPayload();
    if wsdlContent is error {
        return error(string `Failed to read WSDL content: ${wsdlContent.message()}`);
    }
    return wsdlContent;
}

// fetchLocalEntryInfo returns the name, type, and value for the named local entry.
//
// Management-API equivalent of: GET /icp/artifacts/local-entry?name={name}
public isolated function fetchLocalEntryInfo(
        http:Client mgmtClient,
        string hmacToken,
        string entryName
) returns MgmtLocalEntryInfo|error {
    log:printDebug("Fetching local entry info from MI management API", entryName = entryName);

    json item = check fetchRawArtifactItem(mgmtClient, hmacToken, "local-entry", entryName);
    if item !is map<json> {
        return error(string `Unexpected response format for local entry '${entryName}'`);
    }
    map<json> m = <map<json>>item;
    json nameField = m["name"];
    json typeField = m["type"];
    json valueField = m["value"];
    return {
        name: nameField is string ? nameField : entryName,
        'type: typeField is string ? typeField : (),
        value: valueField is string ? valueField : ()
    };
}

// fetchInboundEndpointInfo returns metadata for the named inbound endpoint.
//
// Management-API equivalent of: GET /icp/artifacts/inbound/parameters?name={name}
//
// NOTE: Use fetchArtifactParameterInfo to get the full protocol-specific
// parameter list (the 'parameters' array in the management API response).
public isolated function fetchInboundEndpointInfo(
        http:Client mgmtClient,
        string hmacToken,
        string inboundName
) returns MgmtInboundEndpointInfo|error {
    log:printDebug("Fetching inbound endpoint info from MI management API", inboundName = inboundName);

    json item = check fetchRawArtifactItem(mgmtClient, hmacToken, "inbound-endpoint", inboundName);
    if item !is map<json> {
        return error(string `Unexpected response format for inbound endpoint '${inboundName}'`);
    }
    map<json> m = <map<json>>item;
    json nameField = m["name"];
    json protocolField = m["protocol"];
    json statusField = m["status"];
    json statsField = m["stats"];
    json tracingField = m["tracing"];
    return {
        name: nameField is string ? nameField : inboundName,
        protocol: protocolField is string ? protocolField : (),
        status: statusField is string ? statusField : (),
        stats: statsField is string ? statsField : (),
        tracing: tracingField is string ? tracingField : ()
    };
}

// fetchArtifactParameterInfo extracts key-value parameters from the management
// API response for the given artifact.
//
// Management-API equivalent of: GET /icp/artifacts/parameters?type={type}&name={name}
//
// For inbound endpoints: extracts the 'parameters' array [{name, value}, ...].
// For data sources: extracts the 'configurationParameters' object as key-value pairs.
// For message processors: extracts the 'parameters' object {key: value, ...} as key-value pairs.
public isolated function fetchArtifactParameterInfo(
        http:Client mgmtClient,
        string hmacToken,
        string artifactType,
        string artifactName
) returns MgmtArtifactParameter[]|error {
    json item = check fetchRawArtifactItem(mgmtClient, hmacToken, artifactType, artifactName);

    MgmtArtifactParameter[] params = [];
    if item !is map<json> {
        return params;
    }
    map<json> itemMap = <map<json>>item;

    // Data sources: configurationParameters is a JSON object {key: value, ...}
    if artifactType == "data-source" {
        json configParams = itemMap["configurationParameters"];
        if configParams is map<json> {
            foreach [string, json] [k, v] in (<map<json>>configParams).entries() {
                params.push({key: k, value: v.toJsonString()});
            }
        }
        return params;
    }

    // Message processors: parameters is a JSON object {key: value, ...}
    if artifactType == "message-processor" {
        json procParams = itemMap["parameters"];
        if procParams is map<json> {
            foreach [string, json] [k, v] in (<map<json>>procParams).entries() {
                params.push({key: k, value: v is string ? <string>v : v.toJsonString()});
            }
        }
        return params;
    }

    // Inbound endpoints: 'parameters' array [{name, value}, ...]
    json paramsField = itemMap["parameters"];
    if paramsField is json[] {
        foreach json p in paramsField {
            if p is map<json> {
                json nameField = (<map<json>>p)["name"];
                json valueField = (<map<json>>p)["value"];
                if nameField is string && valueField is string {
                    params.push({key: nameField, value: valueField});
                }
            }
        }
    }

    return params;
}

// fetchDataSourceOverview returns overview metadata for the named data source.
// Overview fields: name, type, description, driverClass, userName, url.
public isolated function fetchDataSourceOverview(
        http:Client mgmtClient,
        string hmacToken,
        string dataSourceName
) returns MgmtDataSourceInfo|error {
    log:printDebug("Fetching data source overview from MI management API", dataSourceName = dataSourceName);

    json item = check fetchRawArtifactItem(mgmtClient, hmacToken, "data-source", dataSourceName);
    if item !is map<json> {
        return error(string `Unexpected response format for data source '${dataSourceName}'`);
    }
    map<json> m = <map<json>>item;
    return {
        name: (m["name"] is string) ? <string>m["name"] : dataSourceName,
        'type: m["type"] is string ? <string>m["type"] : (),
        description: m["description"] is string ? <string>m["description"] : (),
        driverClass: m["driverClass"] is string ? <string>m["driverClass"] : (),
        userName: m["userName"] is string ? <string>m["userName"] : (),
        url: m["url"] is string ? <string>m["url"] : ()
    };
}

// fetchMessageStoreOverview returns overview metadata for the named message store.
// Overview fields: name, type, container, size.
public isolated function fetchMessageStoreOverview(
        http:Client mgmtClient,
        string hmacToken,
        string storeName
) returns MgmtMessageStoreInfo|error {
    log:printDebug("Fetching message store overview from MI management API", storeName = storeName);

    json item = check fetchRawArtifactItem(mgmtClient, hmacToken, "message-store", storeName);
    if item !is map<json> {
        return error(string `Unexpected response format for message store '${storeName}'`);
    }
    map<json> m = <map<json>>item;
    return {
        name: m["name"] is string ? <string>m["name"] : storeName,
        'type: m["type"] is string ? <string>m["type"] : (),
        size: m["size"] is int ? <int>m["size"] : (),
        container: m["container"] is string ? <string>m["container"] : ()
    };
}

// fetchMessageProcessorOverview returns overview metadata for the named message processor.
// Overview fields: name, type, messageStore.
public isolated function fetchMessageProcessorOverview(
        http:Client mgmtClient,
        string hmacToken,
        string processorName
) returns MgmtMessageProcessorInfo|error {
    log:printDebug("Fetching message processor overview from MI management API", processorName = processorName);

    json item = check fetchRawArtifactItem(mgmtClient, hmacToken, "message-processor", processorName);
    if item !is map<json> {
        return error(string `Unexpected response format for message processor '${processorName}'`);
    }
    map<json> m = <map<json>>item;
    return {
        name: m["name"] is string ? <string>m["name"] : processorName,
        'type: m["type"] is string ? <string>m["type"] : (),
        status: m["status"] is string ? <string>m["status"] : (),
        messageStore: m["messageStore"] is string ? <string>m["messageStore"] : ()
    };
}

// fetchDataServiceOverview parses the full MI management API response for a data service
// and returns structured overview data: dataSources, queries, resources, operations.
public isolated function fetchDataServiceOverview(
        http:Client mgmtClient,
        string hmacToken,
        string dataServiceName
) returns MgmtDataServiceOverview|error {
    log:printDebug("Fetching data service overview from MI management API", dataServiceName = dataServiceName);

    json item = check fetchRawArtifactItem(mgmtClient, hmacToken, "data-service", dataServiceName);
    if item !is map<json> {
        return error(string `Unexpected response format for data service '${dataServiceName}'`);
    }
    map<json> m = <map<json>>item;

    // Parse dataSources: [{dataSourceId, dataSourceType, dataSourceProperties:{k:v}}]
    MgmtDataServiceDataSource[] dataSources = [];
    json dsField = m["dataSources"];
    if dsField is json[] {
        foreach json ds in <json[]>dsField {
            if ds is map<json> {
                map<json> dsMap = <map<json>>ds;
                string dsId = dsMap["dataSourceId"] is string ? <string>dsMap["dataSourceId"] : "";
                string? dsType = dsMap["dataSourceType"] is string ? <string>dsMap["dataSourceType"] : ();
                MgmtArtifactParameter[] props = [];
                json propsField = dsMap["dataSourceProperties"];
                if propsField is map<json> {
                    foreach [string, json] [k, v] in (<map<json>>propsField).entries() {
                        props.push({key: k, value: v is string ? <string>v : v.toJsonString()});
                    }
                }
                dataSources.push({dataSourceId: dsId, dataSourceType: dsType, properties: props});
            }
        }
    }

    // Parse queries: [{id, dataSourceId, namespace}]
    MgmtDataServiceQuery[] queries = [];
    json queriesField = m["queries"];
    if queriesField is json[] {
        foreach json q in <json[]>queriesField {
            if q is map<json> {
                map<json> qMap = <map<json>>q;
                queries.push({
                    id: qMap["id"] is string ? <string>qMap["id"] : "",
                    dataSourceId: qMap["dataSourceId"] is string ? <string>qMap["dataSourceId"] : (),
                    namespace: qMap["namespace"] is string ? <string>qMap["namespace"] : ()
                });
            }
        }
    }

    // Parse resources: [{resourcePath, resourceMethod, resourceQuery}]
    MgmtDataServiceResource[] resources = [];
    json resourcesField = m["resources"];
    if resourcesField is json[] {
        foreach json r in <json[]>resourcesField {
            if r is map<json> {
                map<json> rMap = <map<json>>r;
                resources.push({
                    resourcePath: rMap["resourcePath"] is string ? <string>rMap["resourcePath"] : "",
                    resourceMethod: rMap["resourceMethod"] is string ? <string>rMap["resourceMethod"] : (),
                    resourceQuery: rMap["resourceQuery"] is string ? <string>rMap["resourceQuery"] : ()
                });
            }
        }
    }

    // Parse operations: [{operationName, queryName}]
    MgmtDataServiceOperation[] operations = [];
    json opsField = m["operations"];
    if opsField is json[] {
        foreach json op in <json[]>opsField {
            if op is map<json> {
                map<json> opMap = <map<json>>op;
                operations.push({
                    operationName: opMap["operationName"] is string ? <string>opMap["operationName"] : "",
                    queryName: opMap["queryName"] is string ? <string>opMap["queryName"] : ()
                });
            }
        }
    }

    return {
        serviceName: m["serviceName"] is string ? <string>m["serviceName"] : dataServiceName,
        serviceDescription: m["serviceDescription"] is string ? <string>m["serviceDescription"] : (),
        wsdl1_1: m["wsdl1_1"] is string ? <string>m["wsdl1_1"] : (),
        wsdl2_0: m["wsdl2_0"] is string ? <string>m["wsdl2_0"] : (),
        swagger_url: m["swagger_url"] is string ? <string>m["swagger_url"] : (),
        dataSources: dataSources,
        queries: queries,
        resources: resources,
        operations: operations
    };
}
