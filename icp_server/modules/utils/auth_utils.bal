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

import icp_server.types;

import ballerina/http;
import ballerina/jwt;
import ballerina/log;
import ballerina/time;
import ballerina/url;

// HTTP error response helpers

public isolated function createUnauthorizedError(string message) returns http:Unauthorized => {
    body: {
        message
    }
};

public isolated function createBadRequestError(string message) returns http:BadRequest => {
    body: {
        message
    }
};

public isolated function createInternalServerError(string message) returns http:InternalServerError => {
    body: {
        message
    }
};

// OIDC helper functions

// Build OIDC authorization URL with query parameters
public isolated function buildAuthorizationUrl(types:SSOConfig config) returns string|error {
    // Build query parameters
    map<string> params = {
        "response_type": "code",
        "client_id": config.clientId,
        "redirect_uri": config.redirectUri,
        "scope": string:'join(" ", ...config.scopes)
    };

    // URL encode each parameter
    string[] queryParts = [];
    foreach var [key, value] in params.entries() {
        string encodedKey = check url:encode(key, "UTF-8");
        string encodedValue = check url:encode(value, "UTF-8");
        queryParts.push(string `${encodedKey}=${encodedValue}`);
    }

    // Construct full authorization URL
    string queryString = string:'join("&", ...queryParts);
    string authorizationUrl = string `${config.authorizationEndpoint}?${queryString}`;

    return authorizationUrl;
}

public isolated function exchangeCodeForTokens(string code, types:SSOConfig config) 
    returns types:OIDCTokenResponse|http:Unauthorized|http:InternalServerError {
    
    log:printInfo("Exchanging authorization code with OIDC provider", tokenEndpoint = config.tokenEndpoint);

    // Create HTTP client on-demand for the token endpoint
    http:Client|error oidcClient = new (config.tokenEndpoint);
    if oidcClient is error {
        log:printError("Failed to create OIDC client", oidcClient);
        return createInternalServerError("Failed to connect to OIDC provider");
    }

    // Prepare token request body (application/x-www-form-urlencoded)
    string tokenRequestBody = string `grant_type=authorization_code&code=${code}&redirect_uri=${config.redirectUri}`;

    // Prepare Basic Auth header (clientId:clientSecret)
    string credentials = string `${config.clientId}:${config.clientSecret}`;
    string encodedCredentials = credentials.toBytes().toBase64();

    // Make token exchange request
    http:Response|error tokenHttpResponse = oidcClient->post("", tokenRequestBody, {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": string `Basic ${encodedCredentials}`
    });

    if tokenHttpResponse is error {
        log:printError("Error calling OIDC token endpoint", tokenHttpResponse);
        return createInternalServerError("Failed to communicate with OIDC provider");
    }

    // Check status code
    int statusCode = tokenHttpResponse.statusCode;
    
    if statusCode == http:STATUS_BAD_REQUEST || statusCode == http:STATUS_UNAUTHORIZED {
        // Get error details from response
        json|error errorPayload = tokenHttpResponse.getJsonPayload();
        string errorMessage = "Invalid authorization code or authentication failed";
        
        if errorPayload is json {
            json|error errorDesc = errorPayload.error_description;
            if errorDesc is string {
                errorMessage = errorDesc;
            }
        }
        
        log:printError("OIDC token exchange failed", statusCode = statusCode, message = errorMessage);
        return createUnauthorizedError(errorMessage);
    }

    if statusCode != http:STATUS_OK {
        log:printError("Unexpected status code from OIDC token endpoint", statusCode = statusCode);
        return createInternalServerError("OIDC provider returned an error");
    }

    // Parse token response
    json|error tokenPayload = tokenHttpResponse.getJsonPayload();
    if tokenPayload is error {
        log:printError("Failed to parse token response from OIDC provider", tokenPayload);
        return createInternalServerError("Invalid response from OIDC provider");
    }

    types:OIDCTokenResponse|error tokenData = tokenPayload.cloneWithType();
    if tokenData is error {
        log:printError("Token response does not match expected schema", tokenData);
        return createInternalServerError("Invalid token response from OIDC provider");
    }

    log:printInfo("Successfully received tokens from OIDC provider");
    return tokenData;
}

// Decode and validate ID token, return claims
public isolated function decodeAndValidateIdToken(string idToken, types:SSOConfig config) 
    returns types:OIDCIdTokenClaims|http:Unauthorized|http:InternalServerError {
    
    log:printInfo("Decoding ID token");
    
    // Decode JWT without signature validation (validation deferred to security hardening)
    [jwt:Header, jwt:Payload]|jwt:Error decodeResult = jwt:decode(idToken);
    if decodeResult is jwt:Error {
        log:printError("Failed to decode ID token", decodeResult);
        return createUnauthorizedError("Invalid ID token");
    }
    
    // Extract payload from decode result
    jwt:Payload payload = decodeResult[1];
    
    // Convert payload to OIDCIdTokenClaims
    types:OIDCIdTokenClaims|error claims = payload.cloneWithType();
    if claims is error {
        log:printError("ID token payload does not match expected claims structure", claims);
        return createUnauthorizedError("Invalid ID token structure");
    }
    
    log:printInfo("Successfully decoded ID token");
    
    // Validate claims (p2-8)
    error? validationError = validateIdTokenClaims(claims, config);
    if validationError is error {
        log:printError("ID token validation failed", validationError);
        return createUnauthorizedError(validationError.message());
    }
    
    log:printInfo("ID token validation successful", sub = claims.sub);
    return claims;
}

// Validate ID token claims
isolated function validateIdTokenClaims(types:OIDCIdTokenClaims claims, types:SSOConfig config) returns error? {
    // Validate issuer
    if claims.iss != config.issuer {
        return error(string `Invalid issuer: expected '${config.issuer}', got '${claims.iss}'`);
    }
    
    // Validate audience (can be string or string[])
    boolean validAudience = false;
    if claims.aud is string {
        validAudience = claims.aud == config.clientId;
    } else {
        // aud is string[]
        string[] audiences = <string[]>claims.aud;
        foreach string aud in audiences {
            if aud == config.clientId {
                validAudience = true;
                break;
            }
        }
    }
    
    if !validAudience {
        return error(string `Invalid audience: token not intended for this client`);
    }
    
    // Validate expiry
    time:Utc currentTime = time:utcNow();
    int currentTimestamp = <int>currentTime[0]; // Get seconds from Utc tuple
    
    if claims.exp <= currentTimestamp {
        return error("ID token has expired");
    }
    
    return;
}

// Extract user information from ID token claims
public isolated function extractUserInfo(types:OIDCIdTokenClaims claims, types:SSOConfig config) 
    returns types:ExtractedUserInfo|http:InternalServerError {
    
    log:printInfo("Extracting user information from ID token claims");
    
    // Extract userId (sub claim is required)
    string userId = claims.sub;
    
    // Extract username from configured claim
    string? username = ();
    if config.usernameClaim == "email" {
        username = claims?.email;
    } else if config.usernameClaim == "preferred_username" {
        username = claims?.preferred_username;
    }
    
    if username is () {
        log:printError(string `Required claim '${config.usernameClaim}' not found in ID token`);
        return createInternalServerError(string `ID token missing required claim: ${config.usernameClaim}`);
    }
    
    // Extract displayName with fallback logic (p2-10)
    string displayName = buildDisplayName(claims, username);
    
    log:printInfo("Successfully extracted user info", userId = userId, username = username, displayName = displayName);
    
    return {
        userId: userId,
        username: username,
        displayName: displayName
    };
}

// Build display name with fallback logic: name -> email -> username (strip domain if email)
isolated function buildDisplayName(types:OIDCIdTokenClaims claims, string username) returns string {
    // Priority 1: Use 'name' claim if available
    string? name = claims?.name;
    if name is string && name.trim() != "" {
        return name;
    }
    
    // Priority 2: Use 'email' claim if available
    string? email = claims?.email;
    if email is string && email.trim() != "" {
        return stripEmailDomain(email);
    }
    
    // Priority 3: Use username and strip domain if it's an email
    return stripEmailDomain(username);
}

// Strip domain from email address (part before @)
isolated function stripEmailDomain(string email) returns string {
    if email.includes("@") {
        string[] parts = re `@`.split(email);
        return parts[0];
    }
    return email;
}

