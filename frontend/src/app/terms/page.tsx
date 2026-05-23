import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Circlo on Celo Mainnet.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 text-sm text-main-text">
      <Link href="/" className="text-emerald-500 hover:underline">
        ← Back to Circlo
      </Link>
      <h1 className="mt-6 text-2xl font-bold">Terms of Service</h1>
      <p className="mt-1 text-xs text-muted">Last updated: 22 May 2026</p>

      <section className="mt-8 space-y-4 leading-relaxed">
        <h2 className="text-base font-bold">1. Acceptance</h2>
        <p>
          By accessing or using Circlo (the "Service") at{" "}
          <a href="https://circlo-celo.vercel.app" className="text-emerald-500 hover:underline">
            circlo-celo.vercel.app
          </a>{" "}
          you agree to these Terms of Service. If you do not agree, do
          not use the Service. Circlo is provided as a non-custodial,
          on-chain social prediction game on Celo Mainnet.
        </p>

        <h2 className="text-base font-bold">2. Eligibility</h2>
        <p>
          You must be at least 18 years old, or the age of majority in
          your jurisdiction, whichever is higher. The Service is not
          offered in jurisdictions where on-chain prediction markets
          or stablecoin staking are prohibited by law.
        </p>

        <h2 className="text-base font-bold">3. Non-custodial wallet</h2>
        <p>
          Circlo does not custody your funds, your private keys, or
          your signing material. All on-chain actions are signed in
          your own wallet (MiniPay, MetaMask, or any EIP-1193 wallet)
          and broadcast directly to the Celo network. Loss of access
          to your wallet means loss of access to the funds it holds.
          Circlo cannot recover lost keys or reverse signed transactions.
        </p>

        <h2 className="text-base font-bold">4. Stakes and outcomes</h2>
        <p>
          Goals created on Circlo are binary prediction markets
          resolved by user-chosen resolvers from within the same
          circle. Outcomes are not adjudicated by Circlo. By staking
          USDT on a goal you accept that the resolvers' on-chain
          vote determines payout, and that ties trigger a refund per
          the PredictionPool contract logic.
        </p>

        <h2 className="text-base font-bold">5. Network risks</h2>
        <p>
          The Service runs on Celo Mainnet. You accept the standard
          risks of blockchain technology: transaction fees, chain
          re-orgs, RPC outages, contract bugs, mempool front-running,
          and validator misbehaviour. Circlo's smart contracts are
          UUPS-upgradeable; new implementations are protected by a
          48-hour TimelockController delay.
        </p>

        <h2 className="text-base font-bold">6. Prohibited use</h2>
        <p>
          You may not use the Service to wager on illegal events,
          launder funds, impersonate other users, or attempt to
          exploit the smart contracts. We reserve the right to refuse
          service for any reason.
        </p>

        <h2 className="text-base font-bold">7. No warranty</h2>
        <p>
          The Service is provided "as is" without warranty of any
          kind. To the maximum extent permitted by law, Circlo and
          its contributors disclaim all liability for any loss
          arising from your use of the Service or the underlying
          smart contracts on Celo Mainnet.
        </p>

        <h2 className="text-base font-bold">8. Changes</h2>
        <p>
          We may update these terms from time to time. Material
          changes will be reflected by updating the "Last updated"
          date above. Continued use after a change constitutes
          acceptance.
        </p>

        <h2 className="text-base font-bold">9. Contact</h2>
        <p>
          For questions, see the support channel linked from the
          Circlo MiniPay listing or open an issue at{" "}
          <a
            href="https://github.com/alventendrawan123/circlo/issues"
            className="text-emerald-500 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/alventendrawan123/circlo
          </a>
          .
        </p>
      </section>
    </main>
  );
}
