import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BoltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { useEdufy } from "./EdufyContext";
import { api } from "../utils/api";
import {
  useTokenPackages,
  useTokenWallet,
  type TokenPackage,
} from "./useTokenWallet";

/**
 * "Tokens" screen inside Edufy AI — shows tokens left, tokens used and a
 * top-up (purchase) flow wired to POST /api/tokens/purchase (Module 7).
 */
export default function TokenWalletScreen() {
  const { token } = useAuth();
  const { back } = useEdufy();
  const { wallet, status, refresh } = useTokenWallet();
  const packages = useTokenPackages();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [customTokens, setCustomTokens] = useState("");
  const [method, setMethod] = useState<"TRANSFER" | "USSD" | "CARD">(
    "TRANSFER",
  );
  const [buying, setBuying] = useState(false);

  const purchase = async (tokens: number) => {
    if (!token || buying) return;
    setBuying(true);
    try {
      const res = await api.post("/tokens/purchase", { tokens, method }, token);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Purchase failed");
      toast.success(
        `${tokens.toLocaleString()} tokens added — ₦${(
          data.amountNgn ?? 0
        ).toLocaleString()} · ref ${data.reference}`,
        { duration: 6000 },
      );
      setTopUpOpen(false);
      setCustomTokens("");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Token purchase failed");
    } finally {
      setBuying(false);
    }
  };

  // ---- BIA CONNECT hosted-checkout flow (instant, verified purchase) ----
  const [biaPackages, setBiaPackages] = useState<
    { id: string; name: string; tokens: number; price: number }[]
  >([]);
  const [biaEnabled, setBiaEnabled] = useState(false);
  const [biaConfirm, setBiaConfirm] = useState<{
    id: string;
    name: string;
    tokens: number;
    price: number;
  } | null>(null);
  const [biaPaying, setBiaPaying] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!token) return;
    api
      .get("/payments/token-packages", token)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        setBiaEnabled(Boolean(data.biaEnabled));
        setBiaPackages(Array.isArray(data.packages) ? data.packages : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [token]);

  const startBiaCheckout = async (pkg: {
    id: string;
    name: string;
    tokens: number;
    price: number;
  }) => {
    if (!token || biaPaying) return;
    setBiaPaying(true);
    try {
      const res = await api.post(
        "/payments/bia/initialize",
        { packageId: pkg.id },
        token,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not start payment");
      if (!data?.authorizationUrl)
        throw new Error("Payment gateway did not return a checkout link");
      // Hand off to BIA's hosted checkout page.
      window.location.href = data.authorizationUrl;
    } catch (e: any) {
      toast.error(e.message || "Could not start payment");
      setBiaPaying(false);
    }
    // Keep the button disabled — we're navigating away on success.
  };

  const price = wallet?.tokenPrice ?? 0;
  const fmtNgn = (n: number) => `₦${n.toLocaleString()}`;

  const ledgerRows = useMemo(() => wallet?.ledger ?? [], [wallet]);

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700/70">
        <button
          onClick={back}
          aria-label="Back to Edufy AI menu"
          className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700/60 dark:hover:text-gray-200"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Edufy AI Tokens
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Token balance, usage and top-up
          </p>
        </div>
        <button
          onClick={() => refresh()}
          aria-label="Refresh wallet"
          className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700/60 dark:hover:text-gray-200"
        >
          <ArrowPathIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {status === "unknown" && (
          <div className="rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            <ExclamationTriangleIcon className="mr-1 inline h-4 w-4" />
            Your account can't view the school token wallet. Only school admins
            and principals can see balances and buy tokens — but every scan is
            still gated by the school's balance (a scan with 0 tokens fails).
          </div>
        )}

        {status === "loading" && (
          <p className="py-8 text-center text-xs text-gray-400">
            Loading wallet…
          </p>
        )}

        {status === "ready" && wallet && (
          <>
            {/* ---- balance cards ---- */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 text-white shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
                  Tokens left
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight">
                  {wallet.balance.toLocaleString()}
                </p>
                <p className="mt-1 text-[10px] text-blue-200">
                  {wallet.reserved > 0
                    ? `${wallet.reserved} reserved for in-flight scans`
                    : `Price: ${fmtNgn(price)} / token`}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Tokens used
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight text-gray-900 dark:text-gray-100">
                  {wallet.lifetimeConsumed.toLocaleString()}
                </p>
                <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                  {wallet.lifetimePurchased.toLocaleString()} purchased in total
                </p>
              </div>
            </div>

            {/* ---- scan gate hint ---- */}
            {wallet.balance <= 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[11px] leading-relaxed text-red-700 dark:bg-red-500/10 dark:text-red-300">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>No tokens left.</strong> AI scanning is disabled until
                  you top up — each result-sheet scan costs 1 token.
                </span>
              </div>
            )}

            {/* ---- top-up ---- */}
            {!topUpOpen ? (
              <button
                onClick={() => setTopUpOpen(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-md transition hover:from-blue-500 hover:to-indigo-500"
              >
                <ShoppingBagIcon className="h-4 w-4" /> Top up tokens
              </button>
            ) : (
              <TopUpFlow
                packages={packages}
                price={price}
                buying={buying}
                method={method}
                setMethod={setMethod}
                customTokens={customTokens}
                setCustomTokens={setCustomTokens}
                onCancel={() => setTopUpOpen(false)}
                onBuy={purchase}
                fmtNgn={fmtNgn}
                biaEnabled={biaEnabled}
                biaPackages={biaPackages}
                biaConfirm={biaConfirm}
                setBiaConfirm={setBiaConfirm}
                biaPaying={biaPaying}
                onBiaPay={startBiaCheckout}
              />
            )}

            {/* ---- ledger ---- */}
            <h4 className="mt-5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Recent activity
            </h4>
            <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-700/70 dark:border-gray-700">
              {ledgerRows.length === 0 && (
                <li className="px-3 py-4 text-center text-[11px] text-gray-400">
                  No token activity yet.
                </li>
              )}
              {ledgerRows.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 px-3 py-2.5 text-[11px]"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      e.amount > 0
                        ? "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300"
                        : "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
                    }`}
                  >
                    {e.amount > 0 ? (
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                    ) : (
                      <BoltIcon className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-gray-800 dark:text-gray-200">
                      {e.description || e.type}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">
                      {new Date(e.createdAt).toLocaleDateString()} · {e.type}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 font-bold ${
                      e.amount > 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {e.amount > 0 ? "+" : ""}
                    {e.amount === 0 ? "hold" : e.amount.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>

            {/* ---- BIA payment history ---- */}
            <BiaPaymentHistory fmtNgn={fmtNgn} />
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------ Top-up flow ------------------------------
function TopUpFlow(props: {
  packages: TokenPackage[];
  price: number;
  buying: boolean;
  method: "TRANSFER" | "USSD" | "CARD";
  setMethod: (m: "TRANSFER" | "USSD" | "CARD") => void;
  customTokens: string;
  setCustomTokens: (v: string) => void;
  onCancel: () => void;
  onBuy: (tokens: number) => void;
  fmtNgn: (n: number) => string;
  biaEnabled: boolean;
  biaPackages: { id: string; name: string; tokens: number; price: number }[];
  biaConfirm: { id: string; name: string; tokens: number; price: number } | null;
  setBiaConfirm: (
    v: { id: string; name: string; tokens: number; price: number } | null,
  ) => void;
  biaPaying: boolean;
  onBiaPay: (pkg: {
    id: string;
    name: string;
    tokens: number;
    price: number;
  }) => void;
}) {
  const {
    packages,
    price,
    buying,
    method,
    setMethod,
    customTokens,
    setCustomTokens,
    onCancel,
    onBuy,
    fmtNgn,
    biaEnabled,
    biaPackages,
    biaConfirm,
    setBiaConfirm,
    biaPaying,
    onBiaPay,
  } = props;
  const custom = Math.max(0, Math.min(100000, Number(customTokens) || 0));
  const showPackages = packages.length > 0;

  return (
    <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
      {/* ---- STEP 2: BIA payment confirmation ---- */}
      {biaConfirm ? (
        <div>
          <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
            Confirm payment
          </p>
          <div className="mt-2 space-y-1.5 rounded-xl border border-blue-200 bg-white p-3 text-[11px] dark:border-blue-500/40 dark:bg-gray-800">
            <BiaRow label="Package" value={biaConfirm.name} />
            <BiaRow
              label="Tokens"
              value={`${biaConfirm.tokens.toLocaleString()} Edufy AI tokens`}
            />
            <BiaRow label="Amount payable" value={fmtNgn(biaConfirm.price)} bold />
            <BiaRow label="Payment method" value="Bank Transfer via BIA CONNECT" />
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-blue-700/80 dark:text-blue-300/80">
            You'll be taken to BIA's secure checkout to complete the payment via
            a dynamic bank transfer. Tokens are credited automatically once the
            payment is verified.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              disabled={biaPaying}
              onClick={() => onBiaPay(biaConfirm)}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
            >
              {biaPaying
                ? "Starting checkout…"
                : `Pay Now · ${fmtNgn(biaConfirm.price)}`}
            </button>
            <button
              disabled={biaPaying}
              onClick={() => setBiaConfirm(null)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-500 transition hover:border-gray-300 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
            Buy tokens
          </p>

          {/* ---- STEP 1: BIA instant checkout packages ---- */}
          {biaEnabled && biaPackages.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500 dark:text-blue-300">
                Instant payment · verified automatically
              </p>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {biaPackages.map((p) => (
                  <button
                    key={p.id}
                    disabled={biaPaying || buying}
                    onClick={() => setBiaConfirm(p)}
                    className="rounded-xl border border-blue-300 bg-white px-2 py-2.5 text-center shadow-sm transition hover:border-blue-500 hover:shadow disabled:opacity-60 dark:border-blue-500/40 dark:bg-gray-800"
                  >
                    <span className="block text-[9px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {p.name}
                    </span>
                    <span className="mt-0.5 block text-sm font-black text-blue-700 dark:text-blue-300">
                      {p.tokens.toLocaleString()}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-gray-500 dark:text-gray-400">
                      {fmtNgn(p.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-2.5 text-[11px] text-blue-700 dark:text-blue-300">
            {fmtNgn(price)} per token · credited instantly, payment verified by
            the platform finance team.
          </p>
        </>
      )}

      {showPackages && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {packages.map((p) => (
            <button
              key={p.name}
              disabled={buying}
              onClick={() => onBuy(p.tokens)}
              className="rounded-xl border border-blue-200 bg-white px-2 py-2.5 text-center shadow-sm transition hover:border-blue-400 hover:shadow disabled:opacity-60 dark:border-blue-500/40 dark:bg-gray-800"
            >
              <span className="block text-[9px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {p.name}
              </span>
              <span className="mt-0.5 block text-sm font-black text-blue-700 dark:text-blue-300">
                {p.tokens.toLocaleString()}
              </span>
              <span className="mt-0.5 block text-[10px] text-gray-500 dark:text-gray-400">
                {fmtNgn(p.priceNgn)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* custom amount */}
      {!biaConfirm && (
      <div className="mt-3 flex gap-2">
        <input
          type="number"
          min={1}
          max={100000}
          value={customTokens}
          onChange={(e) => setCustomTokens(e.target.value)}
          placeholder="Custom amount"
          aria-label="Custom token amount"
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
        <button
          disabled={buying || custom <= 0}
          onClick={() => onBuy(custom)}
          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
        >
          {buying ? "Buying…" : `Buy · ${fmtNgn(custom * price)}`}
        </button>
      </div>
      )}

      {/* payment method */}
      <div className="mt-2 flex gap-1.5">
        {(["TRANSFER", "USSD", "CARD"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
              method === m
                ? "bg-blue-600 text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-500 hover:border-blue-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <button
        onClick={onCancel}
        disabled={biaPaying}
        className="mt-2 w-full rounded-lg py-1.5 text-[10px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        Cancel
      </button>
    </div>
  );
}

/** Small label/value row for the BIA payment confirmation card. */
function BiaRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-400 dark:text-gray-500">{label}</span>
      <span
        className={`truncate text-right text-gray-800 dark:text-gray-200 ${
          bold ? "font-black" : "font-semibold"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// --------------------------- BIA payment history ---------------------------
// Recent BIA CONNECT token purchases for this school (GET /payments/token-history).
// Backend scopes to the signed-in school — a school can never see another's rows.
interface BiaTxn {
  id: string;
  internalReference: string;
  biaReference?: string;
  amount: number;
  tokenQuantity: number;
  status: string;
  createdAt: string;
  paidAt?: string;
}

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  EXPIRED: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  REVERSED: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

function BiaPaymentHistory({ fmtNgn }: { fmtNgn: (n: number) => string }) {
  const { token } = useAuth();
  const [rows, setRows] = useState<BiaTxn[]>([]);

  useEffect(() => {
    let alive = true;
    if (!token) return;
    api
      .get("/payments/token-history", token)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (alive && Array.isArray(data)) setRows(data.slice(0, 15));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [token]);

  if (rows.length === 0) return null;

  return (
    <>
      <h4 className="mt-5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        Purchase history
      </h4>
      <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-700/70 dark:border-gray-700">
        {rows.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-3 py-2.5 text-[11px]">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-[10px] font-semibold text-gray-800 dark:text-gray-200">
                {t.internalReference}
              </span>
              <span className="text-gray-400 dark:text-gray-500">
                {new Date(t.createdAt).toLocaleDateString()} ·{" "}
                {t.tokenQuantity.toLocaleString()} tokens · {fmtNgn(t.amount)}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                STATUS_STYLES[t.status] || STATUS_STYLES.PENDING
              }`}
            >
              {t.status}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
