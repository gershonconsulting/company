export const runtime = "edge";

import LoginClient from "./login-client";

export const metadata = {
  title: "Sign in · Company by Gershon.AI",
};

export default function LoginPage() {
  return <LoginClient />;
}
