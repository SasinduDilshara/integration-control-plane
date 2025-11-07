#!/bin/bash
# ICP Server Launcher Script
# Usage: ./run.sh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
JAR_FILE="$SCRIPT_DIR/icp-server.jar"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PARENT_DIR/conf/deployment.toml"

if [ ! -f "$JAR_FILE" ]; then
    echo "Error: icp-server.jar not found in $SCRIPT_DIR"
    exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Warning: Configuration file not found at $CONFIG_FILE"
    echo "Starting ICP Server without custom configuration..."
    java -jar "$JAR_FILE" "$@"
else
    echo "Starting ICP Server with configuration: $CONFIG_FILE"
    export BAL_CONFIG_FILES="$CONFIG_FILE"
    java -jar "$JAR_FILE" "$@"
fi
