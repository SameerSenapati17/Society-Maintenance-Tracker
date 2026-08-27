import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../services/api.js";
import { Input } from "../components/ui/Input.jsx";
import { PasswordInput } from "../components/ui/PasswordInput.jsx";
import { Button } from "../components/ui/Button.jsx";
import { AuthShell } from "./AuthShell.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      await register(form);
      navigate("/resident/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Register as a resident on the Nivara platform"
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
          label="Full Name"
          type="text"
          icon={User}
          placeholder="e.g. Alex Morgan"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          autoComplete="name"
        />

        <Input
          label="Email Address"
          type="email"
          icon={Mail}
          placeholder="alex@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          autoComplete="email"
        />

        <PasswordInput
          label="Password"
          placeholder="At least 6 characters"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          autoComplete="new-password"
        />

        <PasswordInput
          label="Confirm Password"
          placeholder="Re-enter password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          required
          autoComplete="new-password"
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
            {loading ? "Creating Account..." : "Complete Registration"}
          </Button>
        </div>

        <p className="text-center text-xs text-slate-500 pt-3 border-t border-slate-100 mt-5">
          Already registered on the platform?{" "}
          <Link className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
