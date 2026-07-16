"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

function getHomeUrl(role: string): string {
  if (role === "SUPER_ADMIN")       return "/super-admin/clients";
  if (role === "RESTAURANT_MANAGER") return "/restaurant";
  if (role === "CASHIER")           return "/pos";
  if (role === "WAITER")            return "/waiter";
  return "/business/select-business";
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // useAuth().login() calls signIn AND updates user state in the context
      const result = await login(email, password);

      if (!result.success) {
        setError(result.error || t('auth.loginError'));
        setLoading(false);
        return;
      }

      // Fetch session to get role for redirect (user state is now set in context)
      const res = await fetch("/api/auth/session");
      const session = await res.json();

      if (session?.user?.role) {
        router.push(getHomeUrl(session.user.role));
      }
    } catch {
      setError(t('auth.loginErrorGeneral'));
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold text-white">{t('auth.login')}</CardTitle>
        <CardDescription className="text-zinc-400">
          {t('auth.loginSubtitle')}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-emerald-500/20"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">{t('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-emerald-500/20"
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
            disabled={loading}
          >
            {loading ? t('auth.loginLoading') : t('auth.loginButton')}
          </Button>

          <p className="text-sm text-zinc-500 text-center">
            {t('auth.noAccount')}{" "}
            <a href="/register" className="text-emerald-400 hover:text-emerald-300">
              {t('auth.register')}
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
