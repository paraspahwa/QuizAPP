import { useState } from "react";
import { useRazorpay } from "../hooks/useRazorpay";

/**
 * PricingSection Component
 * Drop this into your App.jsx to show pricing plans.
 *
 * Props:
 *   onPaymentSuccess - callback when payment/subscription succeeds
 */
export default function PricingSection({ onPaymentSuccess }) {
  const { payOnce, subscribe, loading, error } = useRazorpay();
  const [paymentStatus, setPaymentStatus] = useState(null);

  // ── Plan configurations ──────────────────────
  // Replace plan IDs with your actual Razorpay plan IDs
  const MONTHLY_PLAN_ID = import.meta.env.VITE_RAZORPAY_MONTHLY_PLAN_ID || "plan_xxxxx";
  const YEARLY_PLAN_ID = import.meta.env.VITE_RAZORPAY_YEARLY_PLAN_ID || "plan_yyyyy";

  const handleOneTimePurchase = () => {
    payOnce({
      amount: 49900, // ₹499 in paise
      description: "QuizAPP Pro - Lifetime Access",
      onSuccess: (result) => {
        setPaymentStatus("success");
        onPaymentSuccess?.(result);
      },
      onFailure: (err) => {
        setPaymentStatus("failed");
        console.error("Payment failed:", err);
      },
    });
  };

  const handleMonthlySubscription = () => {
    subscribe({
      planId: MONTHLY_PLAN_ID,
      description: "QuizAPP Pro - Monthly",
      onSuccess: (result) => {
        setPaymentStatus("success");
        onPaymentSuccess?.(result);
      },
      onFailure: (err) => {
        setPaymentStatus("failed");
        console.error("Subscription failed:", err);
      },
    });
  };

  const handleYearlySubscription = () => {
    subscribe({
      planId: YEARLY_PLAN_ID,
      description: "QuizAPP Pro - Yearly",
      onSuccess: (result) => {
        setPaymentStatus("success");
        onPaymentSuccess?.(result);
      },
      onFailure: (err) => {
        setPaymentStatus("failed");
        console.error("Subscription failed:", err);
      },
    });
  };

  // ── Success State ──────────────────────
  if (paymentStatus === "success") {
    return (
      <div style={styles.successContainer}>
        <div style={styles.successIcon}>✅</div>
        <h2 style={styles.successTitle}>Payment Successful!</h2>
        <p style={styles.successText}>
          Welcome to QuizAPP Pro. You now have unlimited access.
        </p>
      </div>
    );
  }

  // ── Pricing Cards ──────────────────────
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Upgrade to QuizAPP Pro</h2>
      <p style={styles.subheading}>
        Unlock unlimited AI-powered quiz generation
      </p>

      {error && <p style={styles.error}>⚠️ {error}</p>}

      <div style={styles.cardsContainer}>
        {/* Monthly Plan */}
        <div style={styles.card}>
          <div style={styles.cardBadge}>MONTHLY</div>
          <h3 style={styles.price}>
            ₹299<span style={styles.period}>/month</span>
          </h3>
          <ul style={styles.features}>
            <li>✓ Unlimited PDF uploads</li>
            <li>✓ Up to 50 questions per quiz</li>
            <li>✓ All difficulty levels</li>
            <li>✓ Detailed explanations</li>
            <li>✓ Cancel anytime</li>
          </ul>
          <button
            style={styles.button}
            onClick={handleMonthlySubscription}
            disabled={loading}
          >
            {loading ? "Processing..." : "Subscribe Monthly"}
          </button>
        </div>

        {/* Yearly Plan - Highlighted */}
        <div style={{ ...styles.card, ...styles.cardPopular }}>
          <div style={{ ...styles.cardBadge, ...styles.badgePopular }}>
            YEARLY · SAVE 30%
          </div>
          <h3 style={styles.price}>
            ₹2,499<span style={styles.period}>/year</span>
          </h3>
          <p style={styles.priceNote}>That's just ₹208/month</p>
          <ul style={styles.features}>
            <li>✓ Everything in Monthly</li>
            <li>✓ Priority AI processing</li>
            <li>✓ Export quizzes to PDF</li>
            <li>✓ Quiz history & analytics</li>
            <li>✓ Save 30% vs monthly</li>
          </ul>
          <button
            style={{ ...styles.button, ...styles.buttonPopular }}
            onClick={handleYearlySubscription}
            disabled={loading}
          >
            {loading ? "Processing..." : "Subscribe Yearly"}
          </button>
        </div>

        {/* One-Time Purchase */}
        <div style={styles.card}>
          <div style={styles.cardBadge}>LIFETIME</div>
          <h3 style={styles.price}>₹499</h3>
          <p style={styles.priceNote}>One-time payment</p>
          <ul style={styles.features}>
            <li>✓ Everything in Yearly</li>
            <li>✓ Lifetime access</li>
            <li>✓ All future updates</li>
            <li>✓ No recurring charges</li>
            <li>✓ Best value</li>
          </ul>
          <button
            style={styles.button}
            onClick={handleOneTimePurchase}
            disabled={loading}
          >
            {loading ? "Processing..." : "Buy Lifetime Access"}
          </button>
        </div>
      </div>

      <p style={styles.footer}>
        🔒 Payments secured by Razorpay · UPI, Cards, Net Banking accepted
      </p>
    </div>
  );
}

// ── Inline Styles ──────────────────────────
const styles = {
  container: {
    maxWidth: 960,
    margin: "40px auto",
    padding: "0 20px",
    textAlign: "center",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  heading: {
    fontSize: 28,
    fontWeight: 700,
    color: "#1e1e2e",
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 32,
  },
  error: {
    color: "#ef4444",
    backgroundColor: "#fef2f2",
    padding: "10px 16px",
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
  },
  cardsContainer: {
    display: "flex",
    gap: 20,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  card: {
    flex: "1 1 260px",
    maxWidth: 300,
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: "28px 24px",
    textAlign: "left",
    position: "relative",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  cardPopular: {
    border: "2px solid #6366f1",
    boxShadow: "0 8px 30px rgba(99, 102, 241, 0.15)",
    transform: "scale(1.03)",
  },
  cardBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    padding: "4px 10px",
    borderRadius: 20,
    marginBottom: 16,
  },
  badgePopular: {
    color: "#fff",
    backgroundColor: "#6366f1",
  },
  price: {
    fontSize: 32,
    fontWeight: 800,
    color: "#1e1e2e",
    marginBottom: 4,
  },
  period: {
    fontSize: 16,
    fontWeight: 400,
    color: "#9ca3af",
  },
  priceNote: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 0,
    marginBottom: 16,
  },
  features: {
    listStyle: "none",
    padding: 0,
    margin: "16px 0 24px",
    fontSize: 14,
    lineHeight: 2,
    color: "#374151",
  },
  button: {
    width: "100%",
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 600,
    color: "#6366f1",
    backgroundColor: "#eef2ff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  buttonPopular: {
    color: "#fff",
    backgroundColor: "#6366f1",
  },
  footer: {
    marginTop: 32,
    fontSize: 13,
    color: "#9ca3af",
  },
  successContainer: {
    maxWidth: 400,
    margin: "80px auto",
    textAlign: "center",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#1e1e2e",
  },
  successText: {
    fontSize: 16,
    color: "#6b7280",
  },
};
