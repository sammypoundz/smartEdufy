import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../utils/api";

/**
 * /payment/callback — Paystack hosted-checkout return page.
 *
 * Paystack redirects the customer back here after checkout with the
 * ?reference= or ?trxref= query parameter.
 *
 * This page NEVER marks a payment successful itself. It asks the backend
 * (GET /api/payments/:reference/status), which verifies server-side with
 * Paystack. Only a backend-verified SUCCESS shows the success state.
 */

type PaymentStatus = {
  reference: string;
  biaReference?: string;
  status: string; // PENDING | SUCCESS | FAILED | EXPIRED | REVERSED
  amount: number;
  currency: string;
  tokenQuantity: number;
  fulfilled: boolean;
  paidAt?: string;
  createdAt: string;
  message?: string;
};

type Phase =
  | "resolving"
  | "checking"
  | "success"
  | "pending"
  | "failed"
  | "error"
  | "unauthenticated";

function readReference(
  search: URLSearchParams,
  pathname: string,
): string | null {
  const keys = [
    "reference",
    "trxref",
    "tx_ref",
    "transactionReference",
    "ref",
    "merchantReference",
  ];
  for (const k of keys) {
    const v = search.get(k);
    if (v) return v;
  }
  // fallback: last path segment looks like a reference (SE-BIAPAY-... or BIA_CHK_...)
  const seg = pathname.split("/").filter(Boolean).pop();
  if (seg && /[-_]/.test(seg) && seg.length >= 8)
    return decodeURIComponent(seg);
  return null;
}

export default function PaymentCallback() {
  const { token } = useAuth();
  const [params] = useSearchParams();
  const reference = readReference(params, window.location.pathname);

  const [phase, setPhase] = useState<Phase>("resolving");
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(
    async (silent = false) => {
      if (!reference || !token) return;
      if (!silent) setRechecking(true);
      try {
        const res = await api.get(
          `/payments/${encodeURIComponent(reference)}/status`,
          token,
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) setPhase("unauthenticated");
          else {
            setError(data?.error || "Could not check payment status");
            setPhase("error");
          }
          return;
        }
        setStatus(data);
        if (data.status === "SUCCESS" && data.fulfilled) setPhase("success");
        else if (["FAILED", "EXPIRED", "REVERSED"].includes(data.status))
          setPhase("failed");
        else {
          setPhase("pending");
          // keep polling gently while pending
          if (!pollRef.current) {
            pollRef.current = setInterval(() => check(true), 15_000);
          }
        }
      } catch (e: any) {
        setError(e?.message || "Network error while checking payment");
        setPhase("error");
      } finally {
        setRechecking(false);
      }
    },
    [reference, token],
  );

  useEffect(() => {
    if (!reference) {
      setError(
        "No payment reference was found in this link. Open Edufy AI → Tokens to check your latest purchase.",
      );
      setPhase("error");
      return;
    }
    if (!token) {
      setPhase("unauthenticated");
      return;
    }
    setPhase("checking");
    check();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, token]);

  const fmtNgn = (n: number) => `₦${(n || 0).toLocaleString()}`;

  const shell = (children: React.ReactNode) => (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800">
        {children}
      </div>
    </div>
  );

  if (phase === "resolving" || phase === "checking") {
    return shell(
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
        <h2 className="mt-4 text-sm font-bold text-gray-900 dark:text-gray-100">
          Confirming your payment…
        </h2>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          We're verifying with Paystack — this usually takes a few seconds.
          Don't close this page.
        </p>
        {reference && (
          <p className="mt-2 font-mono text-[10px] text-gray-400">
            {reference}
          </p>
        )}
      </div>,
    );
  }

  if (phase === "unauthenticated") {
    return shell(
      <div className="text-center">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          Sign in to view your payment
        </h2>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          {reference ? (
            <>
              Reference <span className="font-mono">{reference}</span> — sign in
              with your school account to confirm it.
            </>
          ) : (
            "Sign in with your school account, then check Edufy AI → Tokens."
          )}
        </p>
        <Link
          to="/login"
          className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
        >
          Go to sign in
        </Link>
      </div>,
    );
  }

  if (phase === "success" && status) {
    return shell(
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
          <svg
            className="h-6 w-6 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="mt-3 text-sm font-bold text-gray-900 dark:text-gray-100">
          Payment successful — tokens credited 🎉
        </h2>
        <div className="mt-4 space-y-1.5 rounded-xl bg-gray-50 p-3 text-left text-[11px] dark:bg-gray-900/60">
          <Row
            label="Tokens added"
            value={status.tokenQuantity.toLocaleString()}
          />
          <Row label="Amount paid" value={fmtNgn(status.amount)} />
          <Row label="Reference" value={status.reference} mono />
          <Row
            label="Date"
            value={new Date(status.paidAt || status.createdAt).toLocaleString()}
          />
        </div>
        <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
          Your Edufy AI token balance has been updated.
        </p>
        <Link
          to="/admin"
          className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
        >
          Back to dashboard
        </Link>
      </div>,
    );
  }

  if (phase === "pending") {
    return shell(
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-100 border-t-amber-500" />
        <h2 className="mt-4 text-sm font-bold text-gray-900 dark:text-gray-100">
          Payment received — confirming
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
          {status?.message ||
            "Your payment is still being confirmed by Paystack. Tokens are credited automatically the moment it is verified — you can safely leave this page."}
        </p>
        {status && (
          <div className="mt-4 space-y-1.5 rounded-xl bg-gray-50 p-3 text-left text-[11px] dark:bg-gray-900/60">
            <Row label="Reference" value={status.reference} mono />
            <Row label="Amount" value={fmtNgn(status.amount)} />
            <Row label="Status" value={status.status} />
          </div>
        )}
        <button
          onClick={() => check()}
          disabled={rechecking}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {rechecking ? "Checking…" : "Check again"}
        </button>
      </div>,
    );
  }

  if (phase === "failed" && status) {
    return shell(
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
          <svg
            className="h-6 w-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="mt-3 text-sm font-bold text-gray-900 dark:text-gray-100">
          Payment {status.status.toLowerCase()}
        </h2>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          {status.status === "EXPIRED"
            ? "The checkout session expired before payment completed. Start a new purchase to try again."
            : "No tokens were credited. If you were debited, contact support with the reference below."}
        </p>
        <div className="mt-4 space-y-1.5 rounded-xl bg-gray-50 p-3 text-left text-[11px] dark:bg-gray-900/60">
          <Row label="Reference" value={status.reference} mono />
          <Row label="Amount" value={fmtNgn(status.amount)} />
        </div>
        <Link
          to="/admin"
          className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
        >
          Back to dashboard
        </Link>
      </div>,
    );
  }

  // error
  return shell(
    <div className="text-center">
      <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
        Something went wrong
      </h2>
      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
        {error}
      </p>
      <button
        onClick={() => {
          setPhase("checking");
          setError(null);
          check();
        }}
        disabled={!reference || !token || rechecking}
        className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {rechecking ? "Checking…" : "Try again"}
      </button>
      <Link
        to="/admin"
        className="mt-2 block text-[11px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        Back to dashboard
      </Link>
    </div>,
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-400 dark:text-gray-500">{label}</span>
      <span
        className={`truncate font-semibold text-gray-800 dark:text-gray-200 ${
          mono ? "font-mono text-[10px]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
