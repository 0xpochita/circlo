import { OnboardingGuard } from "@/components/pages/(app)";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <OnboardingGuard>{children}</OnboardingGuard>;
}
