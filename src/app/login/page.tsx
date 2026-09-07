import { AuthScreen } from "@/components/auth-screen";
import { safeReturnTo } from "@/shared/navigation";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthScreen returnTo={safeReturnTo(next)} />;
}
