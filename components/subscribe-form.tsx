"use client";

import { FormEvent, useState } from "react";
import { trackEvent } from "@/lib/analytics";

const SUBSCRIBE_URL = "https://dogu.one/api/publications/business-future-today/subscribe";

export function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");

    try {
      const response = await fetch(SUBSCRIBE_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          source: "businessfuture.today",
          form: compact ? "bft-web-compact" : "bft-web-main",
          frequency: "daily",
          consentVersion: "2026-09-02"
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Subscription is not available yet.");
      }

      trackEvent("sign_up", {
        method: "newsletter",
        form_variant: compact ? "compact" : "main",
        source_path: window.location.pathname,
        subscription_status: data.status || "subscribed"
      });
      setState("success");
      setMessage(data.status === "already_subscribed" ? "You’re already subscribed." : "You’re subscribed.");
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
      {!compact ? <small className="subscribe__legal">By subscribing, you agree to receive the Business Future Today briefing. Unsubscribe anytime. <a href="/privacy">Privacy</a>.</small> : null}
    </form>
  );
}
