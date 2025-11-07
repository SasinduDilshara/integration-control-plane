@echo off
REM ICP Server Launcher Script
REM Usage: run.bat

setlocal enabledelayedexpansion
set SCRIPT_DIR=%~dp0
set JAR_FILE=!SCRIPT_DIR!icp-server.jar
for %%A in ("!SCRIPT_DIR!..") do set PARENT_DIR=%%~fA
set CONFIG_FILE=!PARENT_DIR!\conf\deployment.toml

if not exist "!JAR_FILE!" (
    echo Error: icp-server.jar not found in !SCRIPT_DIR!
    exit /b 1
)

if not exist "!CONFIG_FILE!" (
    echo Warning: Configuration file not found at !CONFIG_FILE!
    echo Starting ICP Server without custom configuration...
    java -jar "!JAR_FILE!" %*
) else (
    echo Starting ICP Server with configuration: !CONFIG_FILE!
    set BAL_CONFIG_FILES=!CONFIG_FILE!
    java -jar "!JAR_FILE!" %*
)
