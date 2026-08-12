import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import WalletClient from "./wallet-client";
import { requireAuth } from "@/lib/auth/server-auth";
import { getUserCreditsBalanceAction, getActiveCreditPackagesAction } from "@/app/actions/credits";

export const metadata = {
  title: "Wallet - Credits & Transactions",
};

export default async function WalletPage() {
  const auth = await requireAuth({ role: 'CLIENT' });
  if (!auth.success) return null;

  // Fetch initial data
  const [balanceResponse, packagesResponse] = await Promise.all([
    getUserCreditsBalanceAction(),
    getActiveCreditPackagesAction(),
  ]);

  const initialBalance = balanceResponse.success ? balanceResponse.balance : 0;
  const initialPackages = packagesResponse.success && packagesResponse.data ? packagesResponse.data : [];

  return (
    <Suspense fallback={<LoadingScreen />}>
      <WalletClient
        initialBalance={initialBalance}
        initialPackages={initialPackages}
      />
    </Suspense>
  );
}
