import {
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  BASE_FEE,
  nativeToScVal,
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
 * Builds a Soroban invokeHostFunction transaction that calls the SAC
 * `transfer(from, to, amount)` method — the format the x402 facilitator
 * expects for on-chain settlement.
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

    // Build a Soroban SAC transfer invocation.
    // The facilitator expects an invokeHostFunction tx calling the token
    // contract's `transfer(from, to, amount)` — NOT a classic payment op.
    let preparedTx;
    try {
      const account = await server.getAccount(signer.publicKey());
      const amount = requirements.maxAmountRequired;

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase,
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: requirements.asset,
            function: "transfer",
            args: [
              nativeToScVal(signer.publicKey(), { type: "address" }),
              nativeToScVal(requirements.payTo, { type: "address" }),
              nativeToScVal(BigInt(amount), { type: "i128" }),
            ],
          }),
        )
        .setTimeout(30)
        .build();

      // Simulate to populate Soroban auth entries + resource fees, then sign.
      preparedTx = await server.prepareTransaction(tx);
      preparedTx.sign(signer);
    } catch (err) {
      // Simulation failures (e.g. insufficient token balance) should not
      // crash the caller — return the original 402 so they can handle it.
      return res;
    }

    const nonce = Math.random().toString(36).slice(2);
    const payload: PaymentPayload = {
      x402Version: 1,
      scheme: "exact",
      network: requirements.network,
      payload: {
        signedTxXdr: preparedTx.toXDR(),
        sourceAccount: signer.publicKey(),
        amount: requirements.maxAmountRequired,
        destination: requirements.payTo,
        asset: requirements.asset,
        validUntilLedger: 0,
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
