import { CredentialsSignin } from "next-auth";

// Distinct error codes so the login page can show something more useful than a generic
// "incorrect email or password" for the cases where that's not actually what happened.
export class NoSchedulingAccessError extends CredentialsSignin {
  code = "no_scheduling_access";
}

export class AccountDeactivatedError extends CredentialsSignin {
  code = "account_deactivated";
}

export class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}
