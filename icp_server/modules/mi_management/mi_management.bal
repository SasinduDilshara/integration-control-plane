// Copyright (c) 2026, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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
// (at /management path) using HMAC-signed JWT auth

import ballerina/http;
import ballerina/log;
import wso2/icp_server.types;

// Path prefix for all Management API endpoints
const string MGMT_API_PATH = "/management";

// HTTP header constants
const string HEADER_AUTHORIZATION = "Authorization";
const string HEADER_ACCEPT = "Accept";
const string CONTENT_TYPE_JSON = "application/json";
const string CONTENT_TYPE_XML = "application/xml";

// Artifact type constants
public const string ARTIFACT_TYPE_API = "api";
public const string ARTIFACT_TYPE_PROXY_SERVICE = "proxy-service";
public const string ARTIFACT_TYPE_ENDPOINT = "endpoint";
public const string ARTIFACT_TYPE_SEQUENCE = "sequence";
public const string ARTIFACT_TYPE_TASK = "task";
public const string ARTIFACT_TYPE_LOCAL_ENTRY = "local-entry";
public const string ARTIFACT_TYPE_MESSAGE_STORE = "message-store";
public const string ARTIFACT_TYPE_MESSAGE_PROCESSOR = "message-processor";
public const string ARTIFACT_TYPE_INBOUND_ENDPOINT = "inbound-endpoint";
public const string ARTIFACT_TYPE_CONNECTOR = "connector";
public const string ARTIFACT_TYPE_TEMPLATE = "template";
public const string ARTIFACT_TYPE_DATA_SERVICE = "data-service";
public const string ARTIFACT_TYPE_DATA_SOURCE = "data-source";
public const string ARTIFACT_TYPE_CARBON_APP = "carbon-app";

// ============================================================
// Artifact-specific fetch functions
// ============================================================

isolated function fetchApiArtifact(http:Client mgmtClient, string hmacToken, string apiName) returns types:MgmtRestApiInfo|error {
    string path = string `${MGMT_API_PATH}/apis?apiName=${apiName}`;
    log:printDebug("Calling MI management API", path = path);
    types:MgmtRestApiInfo respResult = check mgmtClient->get(path, {
        [HEADER_AUTHORIZATION]: string `Bearer ${hmacToken}`,
        [HEADER_ACCEPT]: CONTENT_TYPE_JSON
    });
    return respResult;
}

public isolated function fetchProxyServiceArtifact(http:Client mgmtClient, string hmacToken, string proxyServiceName) returns types:MgmtProxyServiceInfo|error {
    string path = string `${MGMT_API_PATH}/proxy-services?proxyServiceName=${proxyServiceName}`;
    log:printDebug("Calling MI management API", path = path);
    types:MgmtProxyServiceInfo respResult = check mgmtClient->get(path, {
        [HEADER_AUTHORIZATION]: string `Bearer ${hmacToken}`,
        [HEADER_ACCEPT]: CONTENT_TYPE_JSON
    });
    return respResult;
}

isolated function fetchEndpointArtifact(http:Client mgmtClient, string hmacToken, string endpointName) returns types:MgmtEndpointInfo|error {
    string path = string `${MGMT_API_PATH}/endpoints?endpointName=${endpointName}`;
    log:printDebug("Calling MI management API", path = path);
    types:MgmtEndpointInfo respResult = check mgmtClient->get(path, {
        [HEADER_AUTHORIZATION]: string `Bearer ${hmacToken}`,
        [HEADER_ACCEPT]: CONTENT_TYPE_JSON
    });
    return respResult;
}

isolated function fetchSequenceArtifact(http:Client mgmtClient, string hmacToken, string sequenceName) returns types:MgmtSequenceInfo|error {
    string path = string `${MGMT_API_PATH}/sequences?sequenceName=${sequenceName}`;
    log:printDebug("Calling MI management API", path = path);
    types:MgmtSequenceInfo respResult = check mgmtClient->get(path, {
        [HEADER_AUTHORIZATION]: string `Bearer ${hmacToken}`,
        [HEADER_ACCEPT]: CONTENT_TYPE_JSON
    });
    return respResult;
}

isolated function fetchTaskArtifact(http:Client mgmtClient, string hmacToken, string taskName) returns types:MgmtTaskInfo|error {
    string path = string `${MGMT_API_PATH}/tasks?taskName=${taskName}`;
    log:printDebug("Calling MI management API", path = path);
    types:MgmtTaskInfo respResult = check mgmtClient->get(path, {
        [HEADER_AUTHORIZATION]: string `Bearer ${hmacToken}`,
        [HEADER_ACCEPT]: CONTENT_TYPE_JSON
    });
    return respResult;
}

public isolated function fetchLocalEntryArtifact(http:Client mgmtClient, string hmacToken, string entryName) returns types:MgmtLocalEntryInfo|error {
    string path = string `${MGMT_API_PATH}/local-entries?name=${entryName}`;
    log:printDebug("Calling MI management API", path = path);
    types:MgmtLocalEntryInfo respResult = check mgmtClient->get(path, {
        [HEADER_AUTHORIZATION]: string `Bearer ${hmacToken}`,
        [HEADER_ACCEPT]: CONTENT_TYPE_JSON
    });
    return respResult;
}

public isolated function fetchMessageStoreArtifact(http:Client mgmtClient, string hmacToken, string storeName) returns types:MgmtMessageStoreInfo|error {
    string path = string `${MGMT_API_PATH}/message-stores?name=${storeName}`;
    log:printDebug("Calling MI management API", path = path);
    types:MgmtMessageStoreInfo respResult = check mgmtClient->get(path, {
        [HEADER_AUTHORIZATION]: string `Bearer ${hmacToken}`,
        [HEADER_ACCEPT]: CONTENT_TYPE_JSON
    });
    return respResult;
}

public isolated function fetchMessageProcessorArtifact(http:Client mgmtClient, string hmacToken, string processorName) returns types:MgmtMessageProcessorInfo|error {
    string path = string `${MGMT_API_PATH}/message-processors?name=${processorName}`;
    log:printDebug("Calling MI management API", path = path);
    types:MgmtMessageProcessorInfo respResult = check mgmtClient->get(path, {
        [HEADER_AUTHORIZATION]: string `Bearer ${hmacToken}`,
        [HEADER_ACCEPT]: CONTENT_TYPE_JSON
    });
    return respResult;
}

public isolated function fetchInboundEndpointArtifact(http:Client mgmtClient, string hmacToken, string inboundName) returns types:MgmtInboundEndpointInfo|error {
    string path = string `${MGMT_API_PATH}/inbound-endpoints?inboundEndpointName=${inboundName}`;
    log:printDebug("Calling MI management API", path = path);
    types:MgmtInboundEndpointInfo respResult = check mgmtClient->get(path, {
        [HEADER_AUTHORIZATION]: string `Bearer ${hmacToken}`,
        [HEADER_ACCEPT]: CONTENT_TYPE_JSON
    });
    return respResult;
}

isolated function fetchConnectorArtifact(http:Client mgmtClient, string hmacToken, string connectorName, string? packageName) returns types:MgmtConnectorInfo|error {
    string path = string `${MGMT_API_PATH}/connectors`;
    log:printDebug("Calling MI management API", path = path);
    types:MgmtConnectorInfo[] result = check mgmtClient->get(path, {
        [HEADER_AUTHORIZATION]: string `Bearer ${hmacToken}`,
        [HEADER_ACCEPT]: CONTENT_TYPE_JSON
    });
    foreach types:MgmtConnectorInfo connector in result {
        if connector.name == connectorName && (packageName is () || connector.'package == packageName) {
            return connector;
        }
    }
    return error(string `Connector '${connectorName}' not found in MI management API response`);
}

isolated function fetchTemplateArtifact(http:Client mgmtClient, string hmacToken, string templateName, string templateType) returns types:MgmtTemplateInfo|error {
    string path = string `${MGMT_API_PATH}/templates?name=${templateName}&type=${templateType}`;
    log:printDebug("Calling MI management API", path = path);
    types:MgmtTemplateInfo respResult = check mgmtClient->get(path, {
        [HEADER_AUTHORIZATION]: string `Bearer ${hmacToken}`,
        [HEADER_ACCEPT]: CONTENT_TYPE_JSON
    });
    return respResult;
}

public isolated function fetchDataServiceArtifact(http:Client mgmtClient, string hmacToken, string dataServiceName) returns types:MgmtDataServiceInfo|error {
    string path = string `${MGMT_API_PATH}/data-services?dataServiceName=${dataServiceName}`;
    log:printDebug("Calling MI management API", path = path);
    types:MgmtDataServiceInfo respResult = check mgmtClient->get(path, {
        [HEADER_AUTHORIZATION]: string `Bearer ${hmacToken}`,
        [HEADER_ACCEPT]: CONTENT_TYPE_JSON
    });
    return respResult;
}

public isolated function fetchDataSourceArtifact(http:Client mgmtClient, string hmacToken, string dataSourceName) returns types:MgmtDataSourceInfo|error {
    string path = string `${MGMT_API_PATH}/data-sources?name=${dataSourceName}`;
    log:printDebug("Calling MI management API", path = path);
    types:MgmtDataSourceInfo result = check mgmtClient->get(path, {
        [HEADER_AUTHORIZATION]: string `Bearer ${hmacToken}`,
        [HEADER_ACCEPT]: CONTENT_TYPE_JSON
    });
    log:printDebug("Data source converted to type",
            dataSourceName = dataSourceName,
            hasConfigParams = result.configurationParameters is map<json>,
            configParamsValue = result.configurationParameters);
    return result;
}

isolated function fetchCarbonAppArtifact(http:Client mgmtClient, string hmacToken, string carbonAppName) returns types:MgmtCarbonAppInfo|error {
    string path = string `${MGMT_API_PATH}/applications?carbonAppName=${carbonAppName}`;
    log:printDebug("Calling MI management API", path = path);
    types:MgmtCarbonAppInfo respResult = check mgmtClient->get(path, {
        [HEADER_AUTHORIZATION]: string `Bearer ${hmacToken}`,
        [HEADER_ACCEPT]: CONTENT_TYPE_JSON
    });
    return respResult;
}

// ============================================================
// Dispatcher function
// ============================================================

// Artifact types that have a 'configuration' field i.e. source
public type ArtifactWithConfig types:MgmtRestApiInfo|types:MgmtProxyServiceInfo|types:MgmtEndpointInfo|
    types:MgmtSequenceInfo|types:MgmtTaskInfo|types:MgmtMessageStoreInfo|types:MgmtMessageProcessorInfo|
    types:MgmtInboundEndpointInfo|types:MgmtTemplateInfo|types:MgmtDataServiceInfo|types:MgmtDataSourceInfo;

// fetchRawArtifactItem dispatches to the appropriate artifact-specific fetch function
// based on the artifact type and returns the typed record.
isolated function getArtifactsWithSource(http:Client mgmtClient, string hmacToken, string artifactType, string artifactName, string? packageName = (), string? templateType = ()) returns ArtifactWithConfig|error {
    // Dispatch to artifact-specific fetch functions and return typed records
    if artifactType == ARTIFACT_TYPE_API {
        return check fetchApiArtifact(mgmtClient, hmacToken, artifactName);
    } else if artifactType == ARTIFACT_TYPE_PROXY_SERVICE {
        return check fetchProxyServiceArtifact(mgmtClient, hmacToken, artifactName);
    } else if artifactType == ARTIFACT_TYPE_ENDPOINT {
        return check fetchEndpointArtifact(mgmtClient, hmacToken, artifactName);
    } else if artifactType == ARTIFACT_TYPE_SEQUENCE {
        return check fetchSequenceArtifact(mgmtClient, hmacToken, artifactName);
    } else if artifactType == ARTIFACT_TYPE_TASK {
        return check fetchTaskArtifact(mgmtClient, hmacToken, artifactName);
    } else if artifactType == ARTIFACT_TYPE_MESSAGE_STORE {
        return check fetchMessageStoreArtifact(mgmtClient, hmacToken, artifactName);
    } else if artifactType == ARTIFACT_TYPE_MESSAGE_PROCESSOR {
        return check fetchMessageProcessorArtifact(mgmtClient, hmacToken, artifactName);
    } else if artifactType == ARTIFACT_TYPE_INBOUND_ENDPOINT {
        return check fetchInboundEndpointArtifact(mgmtClient, hmacToken, artifactName);
    } else if artifactType == ARTIFACT_TYPE_TEMPLATE {
        if templateType is () {
            return error(string `Template artifact type requires 'templateType' parameter to be specified`);
        }
        return check fetchTemplateArtifact(mgmtClient, hmacToken, artifactName, templateType);
    } else if artifactType == ARTIFACT_TYPE_DATA_SERVICE {
        return check fetchDataServiceArtifact(mgmtClient, hmacToken, artifactName);
    } else if artifactType == ARTIFACT_TYPE_DATA_SOURCE {
        return check fetchDataSourceArtifact(mgmtClient, hmacToken, artifactName);
    } else {
        return error(string `Unsupported artifact type for MI management API: ${artifactType}`);
    }
}

// ============================================================
// Public API functions
// ============================================================

// fetchArtifactDetails returns the synapse configuration XML for the named
// artifact, or the full metadata JSON when no 'configuration' field is present.
public isolated function getArtifactSource(http:Client mgmtClient, string hmacToken, string artifactType, string artifactName, string? packageName = (), string? templateType = ()) returns string|error {
    log:printDebug("Fetching artifact details from MI management API",
            artifactType = artifactType, artifactName = artifactName);

    ArtifactWithConfig artifact = check getArtifactsWithSource(mgmtClient, hmacToken, artifactType, artifactName, packageName, templateType);

    // Extract configuration field for artifacts that have it
    if artifact is ArtifactWithConfig {
        string? config = artifact.configuration;
        if config is string && config.length() > 0 {
            return config;
        }
    }

    // Fallback: return full artifact metadata as JSON
    return artifact.toJson().toJsonString();
}

// fetchWsdlContent fetches the actual WSDL XML from the URL returned by the
// MI Management API. The URL is typically on the MI HTTP service port (e.g.
// http://host:8290/services/TestProxy?wsdl), distinct from the management port.
//
// Security: Replaces the URL host with the trusted management hostname to prevent SSRF attacks.
// MI may report its own configured hostname in the WSDL URL (e.g. the machine name) which can
// differ from the hostname ICP uses to connect to the management API. By substituting the host,
// we ensure the request always goes to the trusted runtime, regardless of what hostname MI reports.

public isolated function fetchWsdlContent(string wsdlUrl, string trustedHost, boolean allowInsecureTLS) returns string|error {
    log:printInfo("Fetching WSDL content", wsdlUrl = wsdlUrl, trustedHost = trustedHost);
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

    // Extract host:port from URL, then pull out only the port.
    // We discard the host from the URL and substitute trustedHost (SSRF protection).
    string hostAndPort = wsdlUrl.substring(schemeEndPos + 3, pathStartPos);

    // Reject userinfo (e.g. user:pass@host) in the authority to prevent it being
    // misinterpreted as part of the port or host.
    if hostAndPort.indexOf("@") is int {
        return error(string `Invalid WSDL URL (userinfo not allowed in authority): ${wsdlUrl}`);
    }

    string urlPort;
    if hostAndPort.startsWith("[") {
        // IPv6 literal: check for port after closing bracket, e.g. "[::1]:8290"
        int? ipv6EndPos = hostAndPort.indexOf("]");
        if ipv6EndPos is () {
            return error(string `Invalid WSDL URL (unterminated IPv6 host): ${wsdlUrl}`);
        }
        string afterBracket = hostAndPort.substring(ipv6EndPos + 1);
        urlPort = afterBracket.startsWith(":") ? afterBracket.substring(1) : "";
    } else {
        // IPv4 or hostname: extract port if present
        int? portSeparatorPos = hostAndPort.indexOf(":");
        urlPort = portSeparatorPos is () ? "" : hostAndPort.substring(portSeparatorPos + 1);
    }

    // Validate the extracted port is either absent or a numeric value in range 1–65535.
    if urlPort != "" {
        int|error portNum = int:fromString(urlPort);
        if portNum is error || portNum < 1 || portNum > 65535 {
            return error(string `Invalid WSDL URL (invalid port '${urlPort}'): ${wsdlUrl}`);
        }
    }

    // Build the fetch URL using the trusted management hostname but keeping the original port and path.
    string trustedHostAndPort = urlPort == "" ? trustedHost : string `${trustedHost}:${urlPort}`;
    string wsdlBaseUrl = string `${scheme}://${trustedHostAndPort}`;
    string wsdlPath = wsdlUrl.substring(pathStartPos);

    log:printInfo("WSDL URL host replaced for security", originalUrl = wsdlUrl, trustedBaseUrl = wsdlBaseUrl);

    http:Client|error wsdlClientResult = allowInsecureTLS
        ? new (wsdlBaseUrl, {secureSocket: {enable: false}})
        : new (wsdlBaseUrl);

    if wsdlClientResult is error {
        return error(string `Failed to create HTTP client for WSDL URL: ${wsdlClientResult.message()}`);
    }
    http:Client wsdlClient = wsdlClientResult;

    http:Response|error wsdlRespResult = wsdlClient->get(wsdlPath, {[HEADER_ACCEPT]: CONTENT_TYPE_XML});
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

