"use client";

import { FormEvent, useState } from "react";

export function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source: "businessfuture.today" })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Subscription is not available yet.");
      }

      setState("success");
      setMessage("You're on the list.");
      setEmail("");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <form className={compact ? "subscribe subscribe--compact" : "subscribe"} onSubmit={submit}>
      <label className="sr-only" htmlFor={compact ? "email-compact" : "email-main"}>Email address</label>
      <input
        id={compact ? "email-compact" : "email-main"}
        type="email"
        required
        autoComplete="email"
        placeholder="you@company.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <button type="submit" disabled={state === "loading"}>
        {state === "loading" ? "Joining…" : "Stay ahead"}
      </button>
      {message ? <span className={`form-message form-message--${state}`}>{message}</span> : null}
    </form>
  );
}
