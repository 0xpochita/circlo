/**
 * Minimal ABIs for Circlo contracts — only the methods + events most consumers need.
 * Use these with viem's `parseAbi` or directly with `readContract`/`writeContract`.
 *
 * For the FULL ABIs (including admin/upgrade methods), import from
 * the JSON files at github.com/alventendrawan123/circlo/tree/main/frontend/src/lib/abis
 */

export const CIRCLE_FACTORY_ABI = [
  {
    type: "function",
    name: "createCircle",
    stateMutability: "nonpayable",
    inputs: [
      { name: "isPrivate", type: "bool" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [{ name: "circleId", type: "uint256" }],
  },
  {
    type: "function",
    name: "joinCircle",
    stateMutability: "nonpayable",
    inputs: [{ name: "circleId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "joinCirclePrivate",
    stateMutability: "nonpayable",
    inputs: [
      { name: "circleId", type: "uint256" },
      { name: "inviteProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "leaveCircle",
    stateMutability: "nonpayable",
    inputs: [{ name: "circleId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isCircleMember",
    stateMutability: "view",
    inputs: [
      { name: "circleId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "getMembers",
    stateMutability: "view",
    inputs: [
      { name: "circleId", type: "uint256" },
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{ name: "members", type: "address[]" }],
  },
  {
    type: "function",
    name: "nextCircleId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "CircleCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "isPrivate", type: "bool", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CircleJoined",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "CircleLeft",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
    ],
  },
  {
    type: "function",
    name: "getCircle",
    stateMutability: "view",
    inputs: [{ name: "circleId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "isPrivate", type: "bool" },
          { name: "createdAt", type: "uint64" },
          { name: "metadataURI", type: "string" },
        ],
      },
    ],
  },
] as const;

export const PREDICTION_POOL_ABI = [
  {
    type: "function",
    name: "createGoal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "circleId", type: "uint256" },
      { name: "outcomeType", type: "uint8" },
      { name: "deadline", type: "uint64" },
      { name: "minStake", type: "uint128" },
      { name: "resolverList", type: "address[]" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [{ name: "goalId", type: "uint256" }],
  },
  {
    type: "function",
    name: "stake",
    stateMutability: "nonpayable",
    inputs: [
      { name: "goalId", type: "uint256" },
      { name: "side", type: "uint8" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "lockGoal",
    stateMutability: "nonpayable",
    inputs: [{ name: "goalId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "goalId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "goalId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "goals",
    stateMutability: "view",
    inputs: [{ name: "goalId", type: "uint256" }],
    outputs: [
      { name: "circleId", type: "uint256" },
      { name: "creator", type: "address" },
      { name: "outcomeType", type: "uint8" },
      { name: "status", type: "uint8" },
      { name: "deadline", type: "uint64" },
      { name: "minStake", type: "uint128" },
      { name: "totalPool", type: "uint128" },
      { name: "winningSide", type: "uint8" },
      { name: "metadataURI", type: "string" },
    ],
  },
  {
    type: "function",
    name: "stakeOf",
    stateMutability: "view",
    inputs: [
      { name: "goalId", type: "uint256" },
      { name: "user", type: "address" },
      { name: "side", type: "uint8" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "poolPerSide",
    stateMutability: "view",
    inputs: [
      { name: "goalId", type: "uint256" },
      { name: "side", type: "uint8" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "isResolver",
    stateMutability: "view",
    inputs: [
      { name: "goalId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "getResolverCount",
    stateMutability: "view",
    inputs: [{ name: "goalId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "nextGoalId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "GoalCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "circleId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "outcomeType", type: "uint8", indexed: false },
      { name: "deadline", type: "uint64", indexed: false },
      { name: "minStake", type: "uint128", indexed: false },
      { name: "resolverList", type: "address[]", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Staked",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "side", type: "uint8", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GoalLocked",
    inputs: [{ name: "goalId", type: "uint256", indexed: true }],
  },
  {
    type: "event",
    name: "GoalResolved",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "winningSide", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GoalRefunded",
    inputs: [{ name: "goalId", type: "uint256", indexed: true }],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const RESOLUTION_MODULE_ABI = [
  {
    type: "function",
    name: "submitVote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "goalId", type: "uint256" },
      { name: "choice", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "finalize",
    stateMutability: "nonpayable",
    inputs: [{ name: "goalId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getTally",
    stateMutability: "view",
    inputs: [{ name: "goalId", type: "uint256" }],
    outputs: [
      { name: "counts", type: "uint256[]" },
      { name: "total", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "isResolver",
    stateMutability: "view",
    inputs: [
      { name: "goalId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "event",
    name: "VoteSubmitted",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "resolver", type: "address", indexed: true },
      { name: "choice", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GoalFinalized",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "winner", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GoalDisputed",
    inputs: [{ name: "goalId", type: "uint256", indexed: true }],
  },
] as const;

export const ERC20_MINIMAL_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;
