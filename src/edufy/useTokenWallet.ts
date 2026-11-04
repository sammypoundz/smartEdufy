import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../utils/api";

/**
 * Frontend view of the school's Edufy AI token wallet (Module 7).
 * Data comes from GET /api/tokens/wallet (ADMIN / PRINCIPAL only).
 *
 * If the signed-in user cannot read the wallet (e.g. a teacher), the hook
 * returns `status: "unknown"` — scanning is then left to the backend 402
 * gate. When the wallet IS readable and the balance is 0, the scanner is
 * blocked with a top-up prompt.
 */

export interface TokenLedgerEntry {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reference: string;
  description?: string;
  createdAt: string;
}

export interface TokenWalletData {
  balance: number;
  reserved: number;
  lifetimePurchased: number;
  lifetimeConsumed: number;
  tokenPrice: number;
  ledger: TokenLedgerEntry[];
}

export type TokenWalletStatus = "loading" | "ready" | "unknown" | "error";

export function useTokenWallet(autoRefresh?: boolean) {
  const { token } = useAuth();
  const [wallet, setWallet] = useState<TokenWalletData | null>(null);
  const [status, setStatus] = useState<TokenWalletStatus>("loading");

  const refresh = useCallback(async () => {
    if (!token) {
      setStatus("unknown");
      return;
    }
    setStatus((s) => (s === "ready" ? "ready" : "loading"));
    try {
      const res = await api.get("/tokens/wallet", token);
      if (!res.ok) {
        // Non-managers can't read the wallet — backend still gates the scan.
        setStatus("unknown");
        return;
      }
      const data = await res.json();
      setWallet({
        balance: data.wallet?.balance ?? 0,
        reserved: data.wallet?.reserved ?? 0,
        lifetimePurchased: data.wallet?.lifetimePurchased ?? 0,
        lifetimeConsumed: data.wallet?.lifetimeConsumed ?? 0,
        tokenPrice: data.tokenPrice ?? 0,
        ledger: Array.isArray(data.ledger) ? data.ledger : [],
      });
      setStatus("ready");
    } catch {
      setStatus("unknown");
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh, autoRefresh]);

  return { wallet, status, refresh };
}

/** Token packages mirrored from backend /tokens/packages (STARTER/STANDARD/BULK). */
export interface TokenPackage {
  name: string;
  tokens: number;
  priceNgn: number;
}

export function useTokenPackages() {
  const { token } = useAuth();
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  useEffect(() => {
    let alive = true;
    if (!token) return;
    api
      .get("/tokens/packages", token)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (alive) setPackages(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [token]);
  return packages;
}
