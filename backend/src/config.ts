import "dotenv/config";

/**
 * Read an environment variable that the backend cannot start without
 * (typically secrets or infra URLs).
 *
 * Throws at module-load time when missing — fail loud rather than
 * crashing later with a cryptic "undefined.split is not a function".
 * Used for DATABASE_URL today; add others here with care, since each
 * required variable means every dev needs it in their `.env` to even
 * boot the server.
 */
function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

/**
 * Read an environment variable, falling back to a sane default when
 * unset. Used for everything that can run in a dev environment
 * without explicit config — RPC URLs, ports, contract address
 * placeholders.
 */
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
