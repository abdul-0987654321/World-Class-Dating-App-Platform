FROM postgres:16-alpine

# Copy initialization scripts
COPY init-database.sql /docker-entrypoint-initdb.d/01-init-database.sql

# PostgreSQL configuration for production
RUN echo "max_connections = 200" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "shared_buffers = 256MB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "work_mem = 4MB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "maintenance_work_mem = 64MB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "effective_cache_size = 512MB" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "log_statement = 'ddl'" >> /usr/local/share/postgresql/postgresql.conf.sample && \
    echo "log_min_duration_statement = 1000" >> /usr/local/share/postgresql/postgresql.conf.sample

EXPOSE 5432

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB || exit 1
