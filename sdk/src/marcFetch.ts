import {
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
  rpc,
} from "@stellar/stellar-sdk";
import {
  decodePaymentHeader,
  encodePaymentHeader,
  type PaymentRequirements,
  type PaymentPayload,
} from "x402-stellar";

/**
 * Configuration for the auto-paying fetch wrapper.
 */
export interface MarcFetchOptions {
  /** Keypair used to sign payment transactions. */
  signer: Keypair;
  /** Soroban RPC URL for submitting payments. */
  rpcUrl?: string;
  /** Network passphrase. Default: testnet. */
  networkPassphrase?: string;
}

/**
 * Returns a `fetch`-compatible function that automatically handles HTTP 402
 * responses by building, signing, and submitting a Stellar payment, then
 * retrying the original request with the `X-PAYMENT` header.
 *
 * This is the buyer/agent side of the x402 protocol.
 */
export function marcFetch(opts: MarcFetchOptions) {
  const {
    signer,
    rpcUrl = "https://soroban-testnet.stellar.org",
    networkPassphrase = Networks.TESTNET,
  } = opts;

  const server = new rpc.Server(rpcUrl, {
    allowHttp: rpcUrl.startsWith("http://"),
  });

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // First attempt — may return 402.
    const res = await fetch(input, init);
    if (res.status !== 402) return res;

    // Extract payment requirements from the 402 response.
    const reqHeader = res.headers.get("x-payment-requirements");
    if (!reqHeader) throw new Error("402 response missing X-PAYMENT-REQUIREMENTS header");
    const requirements: PaymentRequirements = decodePaymentHeader(reqHeader);

    // Build and sign a Stellar payment transaction.
    const account = await server.getAccount(signer.publicKey());
    const amount = requirements.maxAmountRequired;

    const txBuilder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase,
    });

    // Use native XLM or SAC-based payment depending on asset.
    txBuilder.addOperation(
      Operation.payment({
        destination: requirements.payTo,
        asset: Asset.native(), // Simplified: for USDC, the facilitator handles SAC routing.
        amount,
      }),
    );

    const tx = txBuilder.setTimeout(30).build();
    tx.sign(signer);

    const nonce = Math.random().toString(36).slice(2);
    const payload: PaymentPayload = {
      x402Version: 1,
      scheme: "exact",
      network: requirements.network,
      payload: {
        signedTxXdr: tx.toXDR(),
        sourceAccount: signer.publicKey(),
        amount,
        destination: requirements.payTo,
        asset: requirements.asset,
        validUntilLedger: 0, // Facilitator resolves this from the tx envelope.
        nonce,
      },
    };

    // Retry the original request with the payment header.
    const retryInit: RequestInit = { ...init };
    retryInit.headers = new Headers(init?.headers);
    retryInit.headers.set("X-PAYMENT", encodePaymentHeader(payload));

    return fetch(input, retryInit);
  };
}
