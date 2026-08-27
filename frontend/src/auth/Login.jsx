import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../services/api.js";
import { Input } from "../components/ui/Input.jsx";
import { PasswordInput } from "../components/ui/PasswordInput.jsx";
import { Button } from "../components/ui/Button.jsx";
import { AuthShell } from "./AuthShell.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === "admin" ? "/admin/dashboard" : "/resident/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Nivara workspace"
    >
      <form className="space-y-4" onSubmit={submit}>
        {error && (
          <div
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 animate-fade-in"
            role="alert"
          >
            {error}
          </div>
        )}

        <Input
          label="Work or Resident Email"
          type="email"
          icon={Mail}
          placeholder="name@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          autoComplete="email"
        />

        <PasswordInput
          label="Password"
          placeholder="Enter your password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          autoComplete="current-password"
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full shadow-glow"
            loading={loading}
            icon={ArrowRight}
            iconPosition="right"
          >
            {loading ? "Authenticating..." : "Continue to Workspace"}
          </Button>
        </div>

        <p className="text-center text-xs text-slate-500 pt-3 border-t border-slate-100 mt-5">
          New resident to the building?{" "}
          <Link className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline" to="/register">
            Create account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export { AuthShell };
