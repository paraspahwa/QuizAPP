import { useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Custom React Hook for Razorpay Payments
 * Handles both one-time payments and subscriptions.
 *
 * Usage:
 *   const { payOnce, subscribe, loading, error } = useRazorpay();
 *   await payOnce({ amount: 49900, name: "Quiz Pro" });
 *   await subscribe({ planId: "plan_xxxxx" });
 */
export function useRazorpay() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Load Razorpay Script ──────────────────────
  const loadRazorpayScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (document.getElementById("razorpay-script")) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
      document.body.appendChild(script);
    });
  }, []);

  // ── One-Time Payment ──────────────────────────
  const payOnce = useCallback(
    async ({
      amount,
      currency = "INR",
      name = "QuizAPP",
      description = "Quiz Pro Access",
      prefill = {},
      onSuccess,
      onFailure,
    }) => {
      setLoading(true);
      setError(null);

      try {
        await loadRazorpayScript();

        // Step 1: Create order on backend
        const res = await fetch(`${API_BASE}/payment/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, currency }),
        });
        const order = await res.json();

        if (!res.ok) throw new Error(order.detail || "Failed to create order");

        // Step 2: Open Razorpay Checkout
        const options = {
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name,
          description,
          order_id: order.order_id,
          prefill: {
            name: prefill.name || "",
            email: prefill.email || "",
            contact: prefill.contact || "",
          },
          theme: { color: "#6366f1" }, // Indigo - matches a quiz app vibe
          handler: async (response) => {
            // Step 3: Verify payment on backend
            try {
              const verifyRes = await fetch(
                `${API_BASE}/payment/verify-payment`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  }),
                }
              );
              const result = await verifyRes.json();

              if (verifyRes.ok && result.status === "success") {
                onSuccess?.(result);
              } else {
                onFailure?.(result);
              }
            } catch (err) {
              onFailure?.({ error: err.message });
            }
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response) => {
          setError(response.error.description);
          onFailure?.(response.error);
        });
        rzp.open();
      } catch (err) {
        setError(err.message);
        onFailure?.({ error: err.message });
      } finally {
        setLoading(false);
      }
    },
    [loadRazorpayScript]
  );

  // ── Subscription Payment ──────────────────────
  const subscribe = useCallback(
    async ({
      planId,
      name = "QuizAPP",
      description = "Pro Subscription",
      prefill = {},
      onSuccess,
      onFailure,
    }) => {
      setLoading(true);
      setError(null);

      try {
        await loadRazorpayScript();

        // Step 1: Create subscription on backend
        const res = await fetch(`${API_BASE}/payment/create-subscription`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan_id: planId }),
        });
        const sub = await res.json();

        if (!res.ok)
          throw new Error(sub.detail || "Failed to create subscription");

        // Step 2: Open Razorpay Checkout for subscription
        const options = {
          key: sub.key_id,
          subscription_id: sub.subscription_id,
          name,
          description,
          prefill: {
            name: prefill.name || "",
            email: prefill.email || "",
            contact: prefill.contact || "",
          },
          theme: { color: "#6366f1" },
          handler: async (response) => {
            // Step 3: Verify subscription on backend
            try {
              const verifyRes = await fetch(
                `${API_BASE}/payment/verify-subscription`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    razorpay_subscription_id:
                      response.razorpay_subscription_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  }),
                }
              );
              const result = await verifyRes.json();

              if (verifyRes.ok && result.status === "success") {
                onSuccess?.(result);
              } else {
                onFailure?.(result);
              }
            } catch (err) {
              onFailure?.({ error: err.message });
            }
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response) => {
          setError(response.error.description);
          onFailure?.(response.error);
        });
        rzp.open();
      } catch (err) {
        setError(err.message);
        onFailure?.({ error: err.message });
      } finally {
        setLoading(false);
      }
    },
    [loadRazorpayScript]
  );

  return { payOnce, subscribe, loading, error };
}
