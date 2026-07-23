import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Incorrect username/email or password.",
  no_scheduling_access: "Your TMS account doesn't have scheduling access. Contact your Quest administrator.",
  account_deactivated: "This account has been deactivated in the Forward Planner. Contact a super admin.",
  rate_limited: "Too many login attempts. Please wait a few minutes and try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; code?: string }>;
}) {
  const { callbackUrl, error, code } = await searchParams;
  // Custom CredentialsSignin subclasses (see lib/auth/errors.ts) surface as
  // error=CredentialsSignin&code=<our code> — the code, when present, is the more
  // specific message; otherwise fall back to the generic error type.
  const errorKey = code || error;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: callbackUrl || "/",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        const params = new URLSearchParams({ error: err.type });
        if (err instanceof CredentialsSignin && err.code !== "credentials") {
          params.set("code", err.code);
        }
        redirect(`/login?${params.toString()}`);
      }
      throw err;
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[var(--quest-surface-alt)] p-6">
      <div className="mb-8 flex items-baseline gap-2.5">
        <span className="text-xl font-bold tracking-[0.14em] text-[var(--quest-navy)]">
          QUEST
        </span>
        <span className="h-[18px] w-px bg-[var(--quest-navy)]/35" />
        <span
          className="text-sm font-medium tracking-[0.02em]"
          style={{ color: "var(--quest-accent)" }}
        >
          Forward Planner
        </span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Sign in with your Quest username and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Username or email</Label>
              <Input id="email" name="email" type="text" required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {errorKey && (
              <p className="text-sm text-[var(--quest-accent)]">
                {ERROR_MESSAGES[errorKey] ?? "Something went wrong signing in."}
              </p>
            )}
            <Button type="submit" className="mt-2 w-full">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
