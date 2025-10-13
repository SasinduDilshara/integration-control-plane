# [WSO2 Integrator:ICP](https://wso2.com/integrator/)

This is WSO2 Integrator:ICP frontend up app powered by [Backstage](https://backstage.io). 

## Running the Backend Server

To start the backend server with the database using Docker Compose:

```sh
cd ../icp_server
docker-compose -f docker-compose.local.yml up --build
```

This will start:
- MySQL database on port 3307
- ICP backend server on ports 9445 (HTTP) and 9446

## Running the Frontend

To start the frontend app, run:

```sh
yarn install
yarn start
```

## Default Login Credentials

For local development and testing, use the default admin credentials:

- **Email**: `admin`
- **Password**: `admin123`

> **Note**: These credentials are for local development only. The default admin user is provisioned in the database initialization scripts.
