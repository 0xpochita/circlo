import InviteFriendsClient from "./Client";

// Server-side route segment config. Forces dynamic rendering so
// Next.js does not attempt to statically prerender the client tree
// below — NextButton inside the client uses wagmi hooks (useConfig
// transitively) which throw WagmiProviderNotFoundError at build time
// when WagmiProvider is not in the SSR React tree.
export const dynamic = "force-dynamic";

export default function InviteFriendsPage() {
  return <InviteFriendsClient />;
}
