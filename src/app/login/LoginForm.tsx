"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res =
      mode === "in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({
            email,
            password,
            name: name.trim() || email.split("@")[0],
          });
    if (res.error) {
      setError(res.error.message ?? "something went wrong");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <form className="gate-panel" onSubmit={submit}>
      <p className="eyebrow">{mode === "in" ? "sign in" : "new account"}</p>
      <h1>
        {mode === "in"
          ? "Your graph is waiting."
          : "Start charting what you know."}
      </h1>

      {mode === "up" && (
        <label className="field">
          <span>name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            spellCheck={false}
          />
        </label>
      )}
      <label className="field">
        <span>email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          spellCheck={false}
        />
      </label>
      <label className="field">
        <span>password</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "in" ? "current-password" : "new-password"}
        />
      </label>

      {error && <p className="field-error">{error}</p>}

      <button className="gate-submit" type="submit" disabled={busy}>
        {busy ? "…" : mode === "in" ? "sign in" : "create account"}
      </button>

      <p className="gate-switch">
        {mode === "in" ? "no account yet" : "already have an account"}
        <button
          type="button"
          className="chip"
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setError(null);
          }}
        >
          {mode === "in" ? "create one" : "sign in"}
        </button>
      </p>
    </form>
  );
}
