Binding Docker containers strictly to your Dell server's Tailscale IP (`100.x.y.z`) prevents PostgreSQL and PowerSync from ever listening on `0.0.0.0` (your public or local LAN interfaces).

  

To avoid a race condition on reboot—where Docker tries to start before `tailscaled` finishes bringing up the `tailscale0` network interface—pair the configuration below with a lightweight `systemd` drop-in dependency.

  

### 1. Directory & Environment Setup

Create a dedicated directory on your Dell Inspiron 3000 (`mkdir -p ~/store-sync && cd ~/store-sync`) and generate your `.env` file. Replace `100.x.y.z` with your Dell server's actual Tailscale IPv4 address (`tailscale ip -4`).

  

**`.env`**

  

Code snippet

```
TAILSCALE_IP=100.x.y.z
POSTGRES_USER=powersync_admin
POSTGRES_PASSWORD=ReplaceWithStrongRandomPassword123!
POSTGRES_DB=store_db
PS_JWT_SECRET=ReplaceWithYourSupabaseOrCustomJWTSecret
```

### 2. `docker-compose.yaml` (Tailscale-Bound)

This stack runs **PostgreSQL 16** (tuned for logical replication and low-overhead Dell Inspiron hardware), **MongoDB** (for PowerSync's internal sync bucket storage), and the **PowerSync Service** bound exclusively to `${TAILSCALE_IP}:8080`.

  

YAML

```
services:
  postgres:
    image: postgres:16-alpine
    container_name: store-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    command:
      - "postgres"
      - "-c"
      - "wal_level=logical"
      - "-c"
      - "max_wal_senders=4"
      - "-c"
      - "max_replication_slots=4"
      - "-c"
      - "shared_buffers=512MB"
      - "-c"
      - "work_mem=8MB"
    # Bound ONLY to Tailscale IP so you can administer via pgAdmin/psql over Tailscale
    # Remove the ports block completely if you only want internal Docker access
    ports:
      - "${TAILSCALE_IP}:5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - sync_net

  mongo:
    image: mongo:7.0
    container_name: store-ps-mongo
    restart: unless-stopped
    command: ["--replSet", "rs0", "--bind_ip_all", "--wiredTigerCacheSizeGB", "0.5"]
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: |
        mongosh --eval "try { rs.status().ok } catch (e) { rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'mongo:27017'}]}).ok }"
      interval: 10s
      timeout: 10s
      retries: 5
    networks:
      - sync_net

  powersync:
    image: journeyapps/powersync-service:latest
    container_name: store-powersync
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      mongo:
        condition: service_healthy
    environment:
      PS_PORT: 8080
      PS_POSTGRES_URI: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      PS_MONGO_URI: mongodb://mongo:27017/powersync?replicaSet=rs0
      PS_JWT_SECRET: ${PS_JWT_SECRET}
    # Strictly binds port 8080 to the Dell laptop's Tailscale interface
    ports:
      - "${TAILSCALE_IP}:8080:8080"
    volumes:
      - ./powersync.yaml:/config/powersync.yaml:ro
    command: ["start", "-r", "unified", "-c", "/config/powersync.yaml"]
    networks:
      - sync_net

volumes:
  pg_data:
  mongo_data:

networks:
  sync_net:
    driver: bridge
```

### 3. Supporting Config Files (`init-db.sql` & `powersync.yaml`)

Create both files in the same `~/store-sync` folder before launching:

  

**`init-db.sql`** _(Creates the logical replication publication PowerSync requires)_

  

SQL

```
-- Create the publication for tables you want synced to Store & Authorized devices
CREATE PUBLICATION powersync FOR ALL TABLES;
```

**`powersync.yaml`** _(Configures PowerSync to use the mounted environment variables and sync rules)_

  

YAML

```
replication:
  connections:
    - type: postgresql
      uri: !env PS_POSTGRES_URI
      sslmode: disable

storage:
  type: mongodb
  uri: !env PS_MONGO_URI

port: !env PS_PORT

client_auth:
  jwt_secret: !env PS_JWT_SECRET

sync_rules:
  path: /config/sync-rules.yaml
```

_(Note: Also create a `sync-rules.yaml` file in `~/store-sync` and mount it via `- ./sync-rules.yaml:/config/sync-rules.yaml:ro` under the `powersync` volumes section)._

  

### 4. Prevent Boot Race Conditions (`systemd` Override)

Because Docker explicitly binds to `${TAILSCALE_IP}`, Docker **must wait** until `tailscaled` assigns that IP after a power outage reboot; otherwise, the containers will fail to bind.

1. Run `sudo systemctl edit docker.service`.
    
2. Add these lines at the top of the override file and save:
    
    Ini, TOML
    
    ```
    [Unit]
    After=tailscaled.service
    Wants=tailscaled.service
    ```
    
3. Reload systemd and launch the stack:
    
    Bash
    
    ```
    sudo systemctl daemon-reload
    docker compose up -d
    ```
    

### 5. Verification Checklist

- **Confirm interface binding:** Run `sudo ss -tulpn | grep -E '8080|5432'`. The local address column must show `100.x.y.z:8080` and `100.x.y.z:5432`—never `0.0.0.0` or `*`.
    
- **Test from your Store/Authorized device over Tailscale:** Run `curl http://store-hub:8080/probes/liveness` (replacing `store-hub` with your Dell's Tailscale MagicDNS name). It should return `{"ok":true}` or HTTP `200`.
    
- **Test LAN isolation:** From a device on the same Wi-Fi _without_ Tailscale active, attempt `curl http://<dell-local-lan-ip>:8080`—it should immediately refuse the connection.