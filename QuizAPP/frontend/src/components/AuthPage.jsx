import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode]       = useState("login"); // login | signup
  const [username, setUsername] = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let res, data;

      if (mode === "signup") {
        res  = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });
        data = await res.json();
      } else {
        const form = new FormData();
        form.append("username", username);
        form.append("password", password);
        res  = await fetch("/api/auth/login", { method: "POST", body: form });
        data = await res.json();
      }

      if (!res.ok) throw new Error(data.detail || "Something went wrong");

      // Fetch full user profile
      const meRes  = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const meData = await meRes.json();
      login(data.access_token, meData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">⚕</div>
        <h1 className="auth-title">MedQuiz<span className="accent">AI</span></h1>
        <p className="auth-subtitle">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label>Username {mode === "login" && <span className="muted">or email</span>}</label>
            <input
              type="text"
              placeholder={mode === "login" ? "username or email" : "username"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          {mode === "signup" && (
            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              placeholder={mode === "signup" ? "min 6 characters" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="btn-generate" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Loading…</> :
              mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? (
            <>No account? <button onClick={() => { setMode("signup"); setError(""); }}>Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode("login"); setError(""); }}>Sign in</button></>
          )}
        </p>

        {mode === "signup" && (
          <p className="auth-note">💡 The first user to register becomes admin.</p>
        )}
      </div>
    </div>
  );
}
