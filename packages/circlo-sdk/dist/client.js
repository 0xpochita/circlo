import { CIRCLO_CONTRACTS, CELO_MAINNET_CHAIN_ID } from "circlo-types";
import { createCircle, getCircleInfo, getCircleMembers, getCircleNextId, isCircleMember, joinCircle, joinPrivateCircle, leaveCircle, } from "./circles.js";
import { createGoal, getGoal, getGoalNextId, lockGoal, } from "./goals.js";
import { getPoolPerSide, getStakeOf, stake, } from "./stakes.js";
import { claim, refund } from "./claims.js";
import { finalize, submitVote, getTally } from "./resolution.js";
import { NotConfiguredError } from "./errors.js";
export function createCircloClient(config = {}) {
    const requireWallet = (op) => {
        if (!config.walletClient) {
            throw new NotConfiguredError(op, "walletClient");
        }
        return config.walletClient;
    };
    const requirePublic = (op) => {
        if (config.publicClient)
            return config.publicClient;
        throw new NotConfiguredError(op, "publicClient");
    };
    return {
        contracts: CIRCLO_CONTRACTS,
        chainId: CELO_MAINNET_CHAIN_ID,
        walletClient: config.walletClient,
        publicClient: config.publicClient,
        createCircle: async (params) => createCircle(requireWallet("createCircle"), params, config.publicClient),
        joinCircle: async (circleId) => joinCircle(requireWallet("joinCircle"), circleId),
        joinPrivateCircle: async (circleId, inviteProof) => joinPrivateCircle(requireWallet("joinPrivateCircle"), circleId, inviteProof),
        leaveCircle: async (circleId) => leaveCircle(requireWallet("leaveCircle"), circleId),
        isCircleMember: async (circleId, user) => isCircleMember(requirePublic("isCircleMember"), circleId, user),
        getCircleMembers: async (circleId, offset, limit) => getCircleMembers(requirePublic("getCircleMembers"), circleId, offset, limit),
        getCircleNextId: async () => getCircleNextId(requirePublic("getCircleNextId")),
        getCircleInfo: async (circleId) => getCircleInfo(requirePublic("getCircleInfo"), circleId),
        createGoal: async (params) => createGoal(requireWallet("createGoal"), params, config.publicClient),
        lockGoal: async (goalId) => lockGoal(requireWallet("lockGoal"), goalId),
        getGoal: async (goalId) => getGoal(requirePublic("getGoal"), goalId),
        getGoalNextId: async () => getGoalNextId(requirePublic("getGoalNextId")),
        stake: async (params) => stake(requireWallet("stake"), params, config.publicClient),
        getStakeOf: async (goalId, user, side) => getStakeOf(requirePublic("getStakeOf"), goalId, user, side),
        getPoolPerSide: async (goalId, side) => getPoolPerSide(requirePublic("getPoolPerSide"), goalId, side),
        claim: async (goalId) => claim(requireWallet("claim"), goalId),
        refund: async (goalId) => refund(requireWallet("refund"), goalId),
        submitVote: async (goalId, choice) => submitVote(requireWallet("submitVote"), goalId, choice),
        finalize: async (goalId) => finalize(requireWallet("finalize"), goalId),
        getTally: async (goalId) => getTally(requirePublic("getTally"), goalId),
    };
}
//# sourceMappingURL=client.js.map