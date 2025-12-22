# Flamoral Platform - High-Level Architecture Diagrams

## 1. System Overview

```mermaid
flowchart TB
    subgraph Internet["Internet"]
        Users["Users"]
        MobileUsers["Mobile Users"]
    end

    subgraph Azure["Azure Cloud"]
        subgraph Edge["Edge Layer"]
            FD["Azure Front Door<br/>flamoral.com"]
            DNS["Azure DNS"]
            CDN["Azure CDN"]
        end

        subgraph AKS["Azure Kubernetes Service"]
            subgraph Ingress["Ingress Layer"]
                NGINX["NGINX Ingress<br/>Controller"]
            end

            subgraph Apps["Application Layer"]
                WebApp["Web App<br/>(React SPA)"]
                API["API Gateway<br/>:4000"]
            end

            subgraph Services["Microservices"]
                Auth["Auth Service<br/>:3001"]
                User["User Service<br/>:3002"]
                Match["Matching Service<br/>:3003"]
                Msg["Messaging Service<br/>:3004"]
                Media["Media Service<br/>:3006"]
                Pay["Payment Service"]
                Notif["Notification Service"]
                RT["Realtime Service<br/>(WebSocket)"]
            end

            subgraph AI["AI/ML Services"]
                Coach["Dating Coach"]
                Rec["Recommendation"]
                Photo["Photo Analysis"]
                NLP["NLP Service"]
                Fraud["Fraud Detection"]
            end
        end

        subgraph Data["Data Layer"]
            PG["PostgreSQL<br/>(Primary DB)"]
            Mongo["MongoDB<br/>(Documents)"]
            Redis["Redis<br/>(Cache)"]
            ES["Elasticsearch<br/>(Search)"]
            RMQ["RabbitMQ<br/>(Queue)"]
            Blob["Blob Storage<br/>(Media)"]
        end

        subgraph Security["Security"]
            KV["Key Vault"]
            MI["Managed Identity"]
        end

        subgraph Monitor["Monitoring"]
            AI_Insights["App Insights"]
            LA["Log Analytics"]
        end
    end

    Users -->|HTTPS| FD
    MobileUsers -->|HTTPS| FD
    FD -->|Route| NGINX
    NGINX --> WebApp
    NGINX --> API
    API --> Auth
    API --> User
    API --> Match
    API --> Msg
    API --> Media
    API --> Pay
    API --> Notif
    API --> RT
    Match --> AI
    Services --> Data
    AI --> Data
    Services --> KV
    Services --> AI_Insights
```

## 2. Request Flow Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant FD as Front Door
    participant IG as Ingress
    participant AG as API Gateway
    participant AS as Auth Service
    participant US as User Service
    participant MS as Matching Service
    participant DB as PostgreSQL
    participant RD as Redis

    U->>FD: HTTPS Request (flamoral.com)
    FD->>IG: Route to AKS
    IG->>AG: Forward to API Gateway

    alt Authentication
        AG->>AS: Validate JWT Token
        AS->>RD: Check Session
        RD-->>AS: Session Valid
        AS-->>AG: Token Valid
    end

    alt Get Matches
        AG->>MS: Get Matches Request
        MS->>DB: Query Potential Matches
        DB-->>MS: Match Results
        MS->>RD: Cache Results
        MS-->>AG: Match List
    end

    AG-->>FD: Response
    FD-->>U: Display Matches
```

## 3. Data Flow Architecture

```mermaid
flowchart LR
    subgraph Client["Client Apps"]
        Web["Web App"]
        Mobile["Mobile App"]
    end

    subgraph Gateway["API Layer"]
        API["API Gateway"]
    end

    subgraph Services["Services"]
        Auth["Auth"]
        User["User"]
        Match["Matching"]
        Chat["Messaging"]
        Media["Media"]
    end

    subgraph Primary["Primary Database"]
        PG[(PostgreSQL)]
    end

    subgraph Documents["Document Store"]
        Mongo[(MongoDB)]
    end

    subgraph Cache["Cache Layer"]
        Redis[(Redis)]
    end

    subgraph Storage["Object Storage"]
        Blob[(Blob Storage)]
    end

    subgraph Queue["Message Queue"]
        RMQ[(RabbitMQ)]
    end

    Web --> API
    Mobile --> API
    API --> Auth
    API --> User
    API --> Match
    API --> Chat
    API --> Media

    Auth --> PG
    Auth --> Redis
    User --> PG
    Match --> PG
    Match --> Redis
    Chat --> Mongo
    Chat --> Redis
    Media --> Blob

    Services --> RMQ
    RMQ --> Services
```

## 4. Kubernetes Deployment Architecture

```mermaid
flowchart TB
    subgraph AKS["Azure Kubernetes Service"]
        subgraph Namespaces["Namespaces"]
            subgraph System["flamoral-system"]
                Ingress["Ingress Controller"]
                CertManager["Cert Manager"]
            end

            subgraph App["flamoral-app"]
                WebDeploy["Web App<br/>Deployment"]
                APIDeploy["API Gateway<br/>Deployment"]
                AuthDeploy["Auth Service<br/>Deployment"]
                UserDeploy["User Service<br/>Deployment"]
                MatchDeploy["Matching Service<br/>Deployment"]
                MsgDeploy["Messaging Service<br/>Deployment"]
                MediaDeploy["Media Service<br/>Deployment"]
            end

            subgraph Data["flamoral-data"]
                RedisStateful["Redis<br/>StatefulSet"]
            end

            subgraph AINamespace["flamoral-ai"]
                AIDeploy["AI Services<br/>Deployments"]
            end

            subgraph Monitoring["monitoring"]
                Prometheus["Prometheus"]
                Grafana["Grafana"]
            end
        end

        subgraph NodePools["Node Pools"]
            SystemPool["System Pool<br/>(3 nodes)"]
            UserPool["User Pool<br/>(auto-scale 3-10)"]
        end
    end

    subgraph External["External Azure Services"]
        PGDB["Azure PostgreSQL"]
        CosmosDB["Azure Cosmos DB"]
        ACR["Container Registry"]
        KV["Key Vault"]
    end

    System --> SystemPool
    App --> UserPool
    Data --> UserPool
    AINamespace --> UserPool
    App --> ACR
    App --> KV
    App --> PGDB
    App --> CosmosDB
```

## 5. CI/CD Pipeline Architecture

```mermaid
flowchart LR
    subgraph Source["Source Control"]
        Repo["Azure Repos"]
    end

    subgraph CI["Continuous Integration"]
        Build["Build & Test"]
        Security["Security Scan<br/>(Checkov, TFLint)"]
        Docker["Build Docker<br/>Images"]
    end

    subgraph Registry["Container Registry"]
        ACR["Azure Container<br/>Registry"]
    end

    subgraph CD["Continuous Deployment"]
        subgraph Environments["Environments"]
            Dev["Dev<br/>(Auto Deploy)"]
            Test["Test<br/>(Auto Deploy)"]
            Prod["Production<br/>(Manual Approval)"]
        end
    end

    subgraph K8s["Kubernetes"]
        DevCluster["Dev AKS"]
        TestCluster["Test AKS"]
        ProdCluster["Prod AKS"]
    end

    Repo -->|PR/Push| Build
    Build --> Security
    Security --> Docker
    Docker --> ACR
    ACR --> Dev
    Dev --> Test
    Test -->|Approval| Prod
    Dev --> DevCluster
    Test --> TestCluster
    Prod --> ProdCluster
```

## 6. Network Architecture

```mermaid
flowchart TB
    subgraph Internet["Internet"]
        Users["Users"]
    end

    subgraph Azure["Azure Region: East US"]
        subgraph FrontDoor["Azure Front Door"]
            WAF["Web Application<br/>Firewall"]
            LB["Global Load<br/>Balancer"]
        end

        subgraph VNet["Virtual Network (10.2.0.0/16)"]
            subgraph AppSubnet["App Subnet<br/>10.2.1.0/24"]
                AKS["AKS Cluster"]
            end

            subgraph DBSubnet["Database Subnet<br/>10.2.2.0/24"]
                PG["PostgreSQL"]
            end

            subgraph CacheSubnet["Cache Subnet<br/>10.2.3.0/24"]
                Redis["Redis"]
            end

            subgraph PESubnet["Private Endpoints<br/>10.2.5.0/24"]
                PE1["Storage PE"]
                PE2["KeyVault PE"]
                PE3["CosmosDB PE"]
            end
        end

        subgraph NSG["Network Security Groups"]
            AppNSG["App NSG"]
            DBNSG["DB NSG"]
        end
    end

    Users -->|HTTPS 443| WAF
    WAF --> LB
    LB --> AKS
    AKS --> PG
    AKS --> Redis
    AKS --> PE1
    AKS --> PE2
    AKS --> PE3
    AppNSG --> AppSubnet
    DBNSG --> DBSubnet
```

## 7. Monitoring Architecture

```mermaid
flowchart TB
    subgraph Apps["Applications"]
        Services["Microservices"]
        Web["Web App"]
    end

    subgraph Collection["Data Collection"]
        Prometheus["Prometheus"]
        Filebeat["Filebeat"]
        AppInsights["App Insights SDK"]
    end

    subgraph Storage["Data Storage"]
        PromDB["Prometheus TSDB"]
        ES["Elasticsearch"]
        LA["Log Analytics"]
    end

    subgraph Visualization["Visualization"]
        Grafana["Grafana<br/>Dashboards"]
        Kibana["Kibana<br/>Logs"]
        AzurePortal["Azure Portal<br/>Insights"]
    end

    subgraph Alerting["Alerting"]
        AlertManager["AlertManager"]
        AzureAlerts["Azure Alerts"]
    end

    subgraph Notification["Notifications"]
        Slack["Slack"]
        PagerDuty["PagerDuty"]
        Email["Email"]
    end

    Services --> Prometheus
    Services --> Filebeat
    Services --> AppInsights
    Web --> AppInsights

    Prometheus --> PromDB
    Filebeat --> ES
    AppInsights --> LA

    PromDB --> Grafana
    ES --> Kibana
    LA --> AzurePortal

    Prometheus --> AlertManager
    LA --> AzureAlerts

    AlertManager --> Slack
    AlertManager --> PagerDuty
    AzureAlerts --> Email
```

## 8. Security Architecture

```mermaid
flowchart TB
    subgraph External["External"]
        User["User"]
        Attacker["Attacker"]
    end

    subgraph Edge["Edge Security"]
        FD["Front Door"]
        WAF["WAF Rules"]
        DDoS["DDoS Protection"]
    end

    subgraph Transport["Transport Security"]
        TLS["TLS 1.3"]
        Certs["Managed Certs"]
    end

    subgraph App["Application Security"]
        Auth["JWT Authentication"]
        RBAC["Role-Based Access"]
        RateLimit["Rate Limiting"]
        CORS["CORS Policy"]
    end

    subgraph Data["Data Security"]
        Encrypt["Encryption at Rest"]
        KV["Key Vault"]
        Secrets["Secret Management"]
    end

    subgraph Network["Network Security"]
        NSG["Network Security Groups"]
        PE["Private Endpoints"]
        VNetIso["VNet Isolation"]
    end

    User -->|HTTPS| FD
    Attacker -->|Blocked| WAF
    Attacker -->|Blocked| DDoS
    FD --> TLS
    TLS --> Auth
    Auth --> RBAC
    Auth --> RateLimit
    App --> KV
    KV --> Secrets
    Data --> Encrypt
    Network --> PE
    Network --> VNetIso
```

---

## Diagram Legend

| Symbol | Meaning |
|--------|---------|
| Rectangle | Service or Component |
| Cylinder | Database or Storage |
| Diamond | Decision Point |
| Arrow | Data/Request Flow |
| Subgraph | Logical Grouping |

## Related Documentation

- [ARCHITECTURE_OVERVIEW.md](../ARCHITECTURE_OVERVIEW.md) - Detailed architecture documentation
- [DEPLOYMENT_K8S_GUIDE.md](../DEPLOYMENT_K8S_GUIDE.md) - Kubernetes deployment guide
- [CI_CD_PIPELINES.md](../CI_CD_PIPELINES.md) - CI/CD pipeline documentation
- [DNS_AND_DOMAIN_SETUP.md](../DNS_AND_DOMAIN_SETUP.md) - Domain configuration guide
