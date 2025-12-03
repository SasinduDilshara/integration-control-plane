# WSO2 Integration Control Plane

Monitor, troubleshoot and control integration deployments


[![Build Status](https://wso2.org/jenkins/buildStatus/icon?job=products%2Fintegration-control-plane)](https://wso2.org/jenkins/job/products/job/integration-control-plane/)


## Building from the source

### Setting up the development environment

1. Install Node.js [14.X.X](https://nodejs.org/en/download/releases/).
2. Clone the [WSO2 Integration Control Plane repository](https://github.com/wso2/integration-control-plane).
5. Run the following Apache Maven command to build the product.
```mvn clean install```
6. wso2-integration-control-plane-<version>.zip can be found in
 `./distribution/target`.
 
### Running

- Extract the generated distribution archive to a preferred location.
  `cd` to the <ICP_HOME>/bin.
  Run dashboard.sh (Linux/macOS) or dashboard.bat (Windows).

- In a web browser, navigate to the displayed URL. i.e: https://localhost:9743/login.
