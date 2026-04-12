import {
  useFacilitator,
  decodePaymentHeader,
  encodePaymentHeader,
  type PaymentRequirements,
  type PaymentPayload,
  type FacilitatorConfig,
} from "x402-stellar";
import type { Request, Response, NextFunction } from "express";

/**
 * Options for the MARC paywall Express middleware.
 */
export interface MarcPaywallOptions {
  /** Stellar address to receive payment (G... or C...). */
  payTo: string;
  /** Amount in stroops (1 USDC = 10_000_000 stroops). */
  amount: string;
  /** SAC token contract address (C...) for payment. */
  asset: string;
  /** Network identifier matching x402-stellar convention. */
  network?: "stellar-testnet" | "stellar";
  /** Human-readable description of what's being purchased. */
  description?: string;
  /** Facilitator service config. Uses x402-stellar default if omitted. */
  facilitatorUrl?: string;
  /** API key for the facilitator (Bearer auth). */
  facilitatorApiKey?: string;
  /** Max seconds the payment is valid for. Default 300 (5 min). */
  maxTimeoutSeconds?: number;
}

/**
 * Express middleware implementing the x402 payment protocol.
 *
 * Flow:
 * 1. If the request has no `X-PAYMENT` header → respond 402 with
 *    `X-PAYMENT-REQUIREMENTS` containing the JSON payment requirements.
 * 2. If the header is present → decode it, verify + settle via the
 *    x402-stellar facilitator, then call `next()` on success.
 */
export function marcPaywall(opts: MarcPaywallOptions) {
  const {
    payTo,
    amount,
    asset,
    network = "stellar-testnet",
    description = "",
    facilitatorUrl,
    facilitatorApiKey,
    maxTimeoutSeconds = 300,
  } = opts;

  const facilitatorCfg: FacilitatorConfig | undefined = facilitatorUrl
    ? {
        url: facilitatorUrl,
        ...(facilitatorApiKey && {
          createAuthHeaders: async () => {
            const headers = { Authorization: `Bearer ${facilitatorApiKey}` };
            return { verify: headers, settle: headers, supported: headers };
          },
        }),
      }
    : undefined;

  const { verify, settle } = useFacilitator(facilitatorCfg);

  const requirements: PaymentRequirements = {
    scheme: "exact",
    network,
    maxAmountRequired: amount,
    resource: "",
    description,
    mimeType: "application/json",
    payTo,
    maxTimeoutSeconds,
    asset,
    outputSchema: null,
    extra: null,
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    // Stamp the resource path so the facilitator can match it.
    const reqs: PaymentRequirements = { ...requirements, resource: req.originalUrl };

    const paymentHeader = req.headers["x-payment"] as string | undefined;
    if (!paymentHeader) {
      res
        .status(402)
        .set("X-PAYMENT-REQUIREMENTS", encodePaymentHeader(reqs))
        .json({ error: "Payment Required", requirements: reqs });
      return;
    }

    try {
      const payload: PaymentPayload = decodePaymentHeader(paymentHeader);
      const verifyResult = await verify(payload, reqs);
      if (!verifyResult.isValid) {
        res.status(402).json({ error: "Payment verification failed" });
        return;
      }
      await settle(payload, reqs);
      next();
    } catch (err) {
      res.status(402).json({
        error: "Payment processing failed",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  };
}
