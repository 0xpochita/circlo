import "dotenv/config";

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: parseInt(optional("PORT", "3001"), 10),
  nodeEnv: optional("NODE_ENV", "development"),
  apiUrl: optional("API_URL", "http://localhost:3001"),
  frontendOrigin: optional("FRONTEND_ORIGIN", "http://localhost:3000"),

  databaseUrl: required("DATABASE_URL"),

  redisUrl: optional("REDIS_URL", "redis://localhost:6379"),

  celoRpcUrl: optional("CELO_RPC_URL", "https://forno.celo.org"),
  celoWsUrl: optional("CELO_WS_URL", "wss://forno.celo.org/ws"),
  celoChainId: parseInt(optional("CELO_CHAIN_ID", "42220"), 10),

  celoRpcUrlTestnet: optional(
    "CELO_RPC_URL_TESTNET",
    "https://forno.celo-sepolia.celo-testnet.org"
  ),
  celoWsUrlTestnet: optional(
    "CELO_WS_URL_TESTNET",
    "wss://forno.celo-sepolia.celo-testnet.org/ws"
  ),
  celoChainIdTestnet: parseInt(optional("CELO_CHAIN_ID_TESTNET", "11142220"), 10),

  contractCircleFactory: optional(
    "CONTRACT_CIRCLE_FACTORY",
    "0x0000000000000000000000000000000000000001"
  ),
  contractPredictionPool: optional(
    "CONTRACT_PREDICTION_POOL",
    "0x0000000000000000000000000000000000000002"
  ),
  contractResolutionModule: optional(
    "CONTRACT_RESOLUTION_MODULE",
    "0x0000000000000000000000000000000000000003"
  ),
  contractUsdt: optional(
    "CONTRACT_USDT",
    "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e"
  ),

  indexerStartBlock: BigInt(optional("INDEXER_START_BLOCK", "0")),

  jwtSecret: optional("JWT_SECRET", "changeme_secret_jwt"),
  refreshSecret: optional("SESSION_REFRESH_SECRET", "changeme_secret_refresh"),

  get isProduction() {
    return this.nodeEnv === "production";
  },
  get isDevelopment() {
    return this.nodeEnv === "development";
  },
} as const;
