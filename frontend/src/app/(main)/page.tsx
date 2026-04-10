import { Header, SearchBar, ActivePredictionCard, FeatureCards, TrendingCategories } from "@/components/pages/(app)";
import { Banner, CreateCircleButton } from "@/components/pages/(app)";
import { BottomTabBar, PageTransition } from "@/components/pages/(app)";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-28">
      <PageTransition>
        <Header />
        <SearchBar />
        <ActivePredictionCard />
        <FeatureCards />
        <TrendingCategories />
        <Banner />
        <CreateCircleButton />
      </PageTransition>
      <BottomTabBar />
    </div>
  );
}
