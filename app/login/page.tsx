"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/supabase-client";
import { Mail, Eye, EyeOff, Phone } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  // Auto-login: check existing session on mount
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/");
        return;
      }
      setChecking(false);
    };
    check();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) return;
    setError("");
    setMessage("");
    setLoading("login");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else {
      // Redirect back to the page the user was on before login
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirect") || "/";
      window.location.href = redirectTo;
    }
    setLoading(null);
  };

  const handleRegister = async () => {
    if (!email || !password) return;
    setError("");
    setMessage("");
    setLoading("register");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setMessage("注册成功！请检查邮箱确认链接。");
    setLoading(null);
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(provider);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    setLoading(null);
  };

  // Loading while checking existing session
  if (checking) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#992828] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Kenshinpro
          </h1>
          <p className="text-sm text-gray-400">足球训练助手</p>
        </div>

        {/* Error / Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-[#992828]/10 border border-[#992828]/20 text-[#992828] px-4 py-3 rounded-xl text-sm text-center">
            {message}
          </div>
        )}

        {/* Login Buttons */}
        <div className="space-y-3">
          {/* Email */}
          {!showEmail ? (
            <button
              onClick={() => { setShowEmail(true); setError(""); setMessage(""); }}
              disabled={loading !== null}
              className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-900 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <Mail className="w-5 h-5" />
              使用邮箱登录
            </button>
          ) : (
            <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">邮箱登录</span>
                <button
                  onClick={() => setShowEmail(false)}
                  className="text-xs text-gray-400 hover:text-white transition"
                >
                  收起
                </button>
              </div>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱地址"
                className="w-full h-11 px-4 bg-[#1e1e1e] border border-[#222] rounded-lg text-white text-sm placeholder-gray-500 focus:border-[#992828] focus:outline-none transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码（至少 6 位）"
                  className="w-full h-11 px-4 pr-10 bg-[#1e1e1e] border border-[#222] rounded-lg text-white text-sm placeholder-gray-500 focus:border-[#992828] focus:outline-none transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleLogin}
                  disabled={loading !== null || !email || password.length < 6}
                  className="flex-1 h-10 bg-[#992828] text-white font-bold rounded-lg text-sm hover:bg-opacity-90 transition disabled:opacity-40"
                >
                  {loading === "login" ? "登录中..." : "登录"}
                </button>
                <button
                  onClick={handleRegister}
                  disabled={loading !== null || !email || password.length < 6}
                  className="flex-1 h-10 bg-[#1e1e1e] border border-[#222] text-gray-300 font-medium rounded-lg text-sm hover:bg-[#222] transition disabled:opacity-40"
                >
                  {loading === "register" ? "注册中..." : "注册"}
                </button>
              </div>
            </div>
          )}

          {/* Google */}
          <button
            onClick={() => handleOAuth("google")}
            disabled={loading !== null}
            className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-900 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            使用 Google 登录
          </button>

          {/* Apple */}
          <button
            onClick={() => handleOAuth("apple")}
            disabled={loading !== null}
            className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-900 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            使用 Apple 登录
          </button>

          {/* Phone */}
          <button
            disabled={loading !== null}
            className="w-full h-12 flex items-center justify-center gap-3 bg-[#1e1e1e] border border-[#222] rounded-xl font-medium text-sm text-white hover:bg-[#222] transition disabled:opacity-50"
          >
            <Phone className="w-5 h-5" />
            使用手机号登录
          </button>

          {/* WeChat — Primary CTA */}
          <button
            onClick={() => setMessage("微信登录即将支持，请使用邮箱登录")}
            disabled={loading !== null}
            title="微信登录即将支持"
            className="w-full h-12 flex items-center justify-center gap-3 bg-[#07C160] rounded-xl font-medium text-sm text-white hover:bg-[#06AD56] transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z"/>
            </svg>
            使用微信登录
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs">
          登录即表示您同意我们的
          <a href="#" className="text-gray-400 hover:text-gray-300 transition mx-0.5">服务条款</a>
          和
          <a href="#" className="text-gray-400 hover:text-gray-300 transition mx-0.5">隐私政策</a>
        </p>
      </div>
    </div>
  );
}
