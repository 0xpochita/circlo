import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Circlo on Celo Mainnet.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 text-sm text-main-text">
      <Link href="/" className="text-emerald-500 hover:underline">
        ← Back to Circlo
      </Link>
      <h1 className="mt-6 text-2xl font-bold">Privacy Policy</h1>
      <p className="mt-1 text-xs text-muted">Last updated: 22 May 2026</p>

      <section className="mt-8 space-y-4 leading-relaxed">
        <h2 className="text-base font-bold">1. Scope</h2>
        <p>
          This policy explains what data Circlo collects when you use
          the application at{" "}
          <a href="https://circlo-celo.vercel.app" className="text-emerald-500 hover:underline">
            circlo-celo.vercel.app
          </a>
          , whether via the web, MiniPay, or any other wallet client.
        </p>

        <h2 className="text-base font-bold">2. On-chain data</h2>
        <p>
          Every action you take with Circlo — creating a circle,
          joining a circle, creating a goal, staking USDT, voting as
          a resolver, claiming, refunding — is a public transaction
          on Celo Mainnet (chainId 42220). This data is permanent,
          public, and visible to anyone via Celoscan or any Celo
          indexer. Circlo does not control this data; the Celo
          network does.
        </p>

        <h2 className="text-base font-bold">3. Off-chain data we collect</h2>
        <p>
          To deliver the social layer of the app (usernames, goal
          titles, notifications) we store the following in our
          backend:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Your wallet address (used as your account identifier).</li>
          <li>
            A username, display name, avatar emoji, and avatar colour
            you choose during onboarding.
          </li>
          <li>
            Off-chain metadata for circles and goals you create (title,
            description, category, emoji).
          </li>
          <li>
            A signed-in session token (JWT) stored in an httpOnly
            cookie scoped to the Circlo domain.
          </li>
          <li>
            Notification preferences and read/unread state.
          </li>
        </ul>

        <h2 className="text-base font-bold">4. What we don't collect</h2>
        <p>
          We do not collect: your email address, your phone number,
          your real name, your private keys, your seed phrase, your
          IP address beyond ephemeral request logs, payment card
          information, third-party analytics identifiers, or any
          biometric data.
        </p>

        <h2 className="text-base font-bold">5. Cookies and analytics</h2>
        <p>
          Circlo uses one session cookie (httpOnly, SameSite=Lax)
          required for SIWE auth on non-MiniPay browsers. We do not
          run third-party analytics or ad-tracking scripts.
        </p>

        <h2 className="text-base font-bold">6. Sharing</h2>
        <p>
          We do not sell, rent, or share your off-chain data with any
          third party. On-chain data is, by design, public on Celo
          Mainnet and any party can read it directly from the chain.
        </p>

        <h2 className="text-base font-bold">7. Data retention</h2>
        <p>
          Off-chain account data is retained as long as the account
          is active. To request deletion of your off-chain profile,
          contact us via the support channel linked from the Circlo
          MiniPay listing. On-chain data cannot be deleted — it
          lives on Celo Mainnet permanently.
        </p>

        <h2 className="text-base font-bold">8. Children</h2>
        <p>
          Circlo is not directed at children under 18. We do not
          knowingly collect any data from users under 18.
        </p>

        <h2 className="text-base font-bold">9. Changes</h2>
        <p>
          We may update this policy. Material changes will be
          reflected by updating the "Last updated" date above.
        </p>

        <h2 className="text-base font-bold">10. Contact</h2>
        <p>
          For privacy questions or data deletion requests, open an
          issue at{" "}
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
