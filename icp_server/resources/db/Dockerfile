FROM mysql:latest

ENV MYSQL_ROOT_PASSWORD=icp_root_password
ENV MYSQL_DATABASE=icp_database

# Copy initialization scripts into the container
COPY ./init-scripts/ /docker-entrypoint-initdb.d/