"use client";

import { AlertTriangle, RefreshCw, Eye } from "lucide-react";

interface Props {
  code: string;
  onRetry?: () => void;
  hasPartialContent?: boolean;
  onViewPartial?: () => void;
}

const ERROR_CONFIG: Record<string, { title: string; message: string }> = {
  "no-api-key": {
    title: "未配置 AI 接口",
    message: "请在 .env.local 或 Vercel 环境变量中设置 ANTHROPIC_API_KEY",
  },
  "auth-required": {
    title: "未登录",
    message: "请先登录后再使用训练生成功能",
  },
  "api-error": {
    title: "AI 服务异常",
    message: "AI 服务调用失败，请稍后重试。如持续出现请联系管理员。",
  },
  "stream-interrupted": {
    title: "生成中断",
    message: "网络连接断开，已保留已生成的内容。请检查网络后重试。",
  },
  "rate-limited": {
    title: "请求过于频繁",
    message: "为确保服务质量，每分钟限制生成 1 次训练方案。请稍后再试。",
  },
  "parse-error": {
    title: "内容解析异常",
    message: "AI 返回内容格式异常，部分内容可能无法正常显示。",
  },
  "empty-response": {
    title: "AI 返回内容为空",
    message: "AI 服务未返回有效的训练方案。请检查 API 配置或稍后重试。",
  },
  "timeout": {
    title: "生成超时",
    message: "AI 响应时间过长（超过 80 秒），已自动取消。请简化输入或稍后重试。",
  },
};

export function ErrorAlert({ code, onRetry, hasPartialContent, onViewPartial }: Props) {
  const config = ERROR_CONFIG[code] || {
    title: "未知错误",
    message: "发生了意外错误，请刷新页面后重试。",
  };

  return (
    <div className="glass-card border-[#992828]/30 bg-[#992828]/5 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-[#992828] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-[#992828] font-bold text-lg">{config.title}</h3>
          <p className="text-gray-400 text-sm mt-1">{config.message}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onRetry && (
          <button onClick={onRetry} className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
        )}
        {hasPartialContent && onViewPartial && (
          <button onClick={onViewPartial} className="flex items-center gap-2 text-sm py-2 px-4 text-gray-300 hover:text-white transition">
            <Eye className="w-4 h-4" />
            查看已生成内容
          </button>
        )}
      </div>
    </div>
  );
}
