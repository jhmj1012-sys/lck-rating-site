import { TopSiteNav } from "@/components/TopSiteNav";
import { SignInCard } from "./SignInCard";

export default async function SignInPage() {
  return (
    <div>
      <TopSiteNav active="match" />
      <main className="min-h-screen bg-[#1C1C1F] px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-center">
          <SignInCard />
        </div>
      </main>
    </div>
  );
}
