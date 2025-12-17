# PowerShell script to fix and rebuild services
$ErrorActionPreference = "Stop"

Write-Host "=== Fixing and rebuilding services ===" -ForegroundColor Green

# Change to Flamoral directory
Set-Location "C:\Users\citad\OneDrive\Documents\Dating\Flamoral"

# 1. Fix admin-service Redis TLS
Write-Host "`n1. Fixing admin-service Redis TLS..." -ForegroundColor Yellow
$redisFile = "backend\services\admin-service\src\infrastructure\redis.ts"
(Get-Content $redisFile -Raw) -replace `
    '(?s)(async connect\(\): Promise<void> \{\s+this\.client = createClient\(\{)(\s+socket: \{\s+host:.*?\s+port:.*?\s+\},)',
    '$1$2      tls: process.env.REDIS_TLS === ''true'',$2' | Set-Content $redisFile

# 2. Fix notification-service logger
Write-Host "2. Fixing notification-service logger..." -ForegroundColor Yellow
$loggerContent = @'
/**
 * Logger Utility
 */

import winston from 'winston';
import { config } from '../config';

const logLevel = config.nodeEnv === 'production' ? 'info' : 'debug';

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'notification-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

export default logger;
'@
Set-Content "backend\services\notification-service\src\utils\logger.ts" -Value $loggerContent

# 3. Fix messaging-service Cosmos DB
Write-Host "3. Fixing messaging-service Cosmos DB..." -ForegroundColor Yellow
$indexFile = "backend\services\messaging-service\src\index.ts"
(Get-Content $indexFile -Raw) -replace `
    '(?s)(\/\/ Initialize Cosmos DB connection\s+logger\.info\(''Initializing Cosmos DB connection\.\.\.''\);.*?await cosmosClient\.initialize\(\);.*?logger\.info\(''Cosmos DB connection established''\);)',
    "// Initialize Cosmos DB connection (optional)`n    if (process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY) {`n      logger.info('Initializing Cosmos DB connection...');`n      await cosmosClient.initialize();`n      logger.info('Cosmos DB connection established');`n    } else {`n      logger.warn('Cosmos DB not configured - some features may be limited');`n    }" | Set-Content $indexFile

# 4. Fix realtime-service Redis TLS (Go)
Write-Host "4. Fixing realtime-service Redis TLS..." -ForegroundColor Yellow
# Add to config
$configFile = "backend\services\realtime-service\internal\config\config.go"
$configContent = Get-Content $configFile -Raw
if ($configContent -notmatch "RedisTLS") {
    $configContent = $configContent -replace '(RedisPassword string)', '$1`n	RedisTLS      bool'
    $configContent = $configContent -replace '(RedisDB:\s+getEnvInt\("REDIS_DB", 0\),)', '$1`n		RedisTLS:      getEnvBool("REDIS_TLS", false),'
    if ($configContent -notmatch "func getEnvBool") {
        $configContent += @'

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}
'@
    }
    Set-Content $configFile -Value $configContent
}

# Add to redis client
$redisGoFile = "backend\services\realtime-service\internal\pubsub\redis.go"
$redisGoContent = Get-Content $redisGoFile -Raw
if ($redisGoContent -notmatch "crypto/tls") {
    $redisGoContent = $redisGoContent -replace '(import \([\s\S]+?)"github', '$1"crypto/tls"`n	"github'
}
if ($redisGoContent -notmatch "TLSConfig") {
    $redisGoContent = $redisGoContent -replace `
        '(?s)(client := redis\.NewClient\(&redis\.Options\{.*?WriteTimeout: \d+ \* time\.Second,\s+\}\))',
        'opts := &redis.Options{`n		Addr:         fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),`n		Password:     cfg.RedisPassword,`n		DB:           cfg.RedisDB,`n		PoolSize:     100,`n		MinIdleConns: 10,`n		DialTimeout:  10 * time.Second,`n		ReadTimeout:  5 * time.Second,`n		WriteTimeout: 5 * time.Second,`n	}`n`n	if cfg.RedisTLS {`n		opts.TLSConfig = &tls.Config{MinVersion: tls.VersionTLS12}`n		log.Info("Redis TLS enabled")`n	}`n`n	client := redis.NewClient(opts)'
}
Set-Content $redisGoFile -Value $redisGoContent

Write-Host "`n=== Building and pushing images to ACR ===" -ForegroundColor Green

# Build and push admin-service
Write-Host "`nBuilding admin-service..." -ForegroundColor Cyan
az acr build --registry flamoraldevacr --image admin-service:latest --file backend/services/admin-service/Dockerfile .

# Build and push notification-service
Write-Host "`nBuilding notification-service..." -ForegroundColor Cyan
az acr build --registry flamoraldevacr --image notification-service:latest --file backend/services/notification-service/Dockerfile .

# Build and push messaging-service
Write-Host "`nBuilding messaging-service..." -ForegroundColor Cyan
az acr build --registry flamoraldevacr --image messaging-service:latest --file backend/services/messaging-service/Dockerfile .

# Build and push realtime-service
Write-Host "`nBuilding realtime-service..." -ForegroundColor Cyan
az acr build --registry flamoraldevacr --image realtime-service:latest --file backend/services/realtime-service/Dockerfile .

Write-Host "`n=== Restarting deployments ===" -ForegroundColor Green
kubectl rollout restart deployment/admin-service -n flamoral
kubectl rollout restart deployment/notification-service -n flamoral
kubectl rollout restart deployment/messaging-service -n flamoral
kubectl rollout restart deployment/realtime-service -n flamoral

Write-Host "`n=== Done! Wait a few minutes and check pod status ===" -ForegroundColor Green
Write-Host "Run: kubectl get pods -n flamoral" -ForegroundColor Cyan
