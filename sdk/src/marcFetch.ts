import { Keypair } from "@stellar/stellar-sdk";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import {
  createEd25519Signer,
  STELLAR_TESTNET_CAIP2,
  STELLAR_PUBNET_CAIP2,
} from "@x402/stellar";

/**
 * Configuration for the auto-paying fetch wrapper.
 */
export interface MarcFetchOptions {
  /** Keypair used to sign payment transactions. */
  signer: Keypair;
  /** Soroban RPC URL for submitting payments. */
  rpcUrl?: string;
  /** Network: testnet or pubnet. Default: testnet. */
  network?: "testnet" | "pubnet";
}

/**
 * Returns a `fetch`-compatible function that automatically handles HTTP 402
 * responses by building, signing, and submitting a Stellar payment, then
 * retrying the original request with the payment headers.
 *
 * Uses the x402 v2 protocol with @x402/fetch and @x402/stellar.
 */
export function marcFetch(opts: MarcFetchOptions) {
  const {
    signer,
    rpcUrl,
    network = "testnet",
  } = opts;

  const caip2 =
    network === "pubnet" ? STELLAR_PUBNET_CAIP2 : STELLAR_TESTNET_CAIP2;

  const stellarSigner = createEd25519Signer(signer.secret(), caip2);

  const rpcConfig = rpcUrl ? { url: rpcUrl } : undefined;
  const stellarScheme = new ExactStellarScheme(stellarSigner, rpcConfig);

  const client = new x402Client();
  client.register(caip2, stellarScheme);

  return wrapFetchWithPayment(fetch, client);
}
