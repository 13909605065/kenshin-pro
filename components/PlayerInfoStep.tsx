"use client";

import { PlayerFormData } from "@/lib/types";
import { User, Users } from "lucide-react";
import { POSITION_OPTIONS, COACH_CERT_OPTIONS, COACH_ROLE_OPTIONS, LEAGUE_TAG_OPTIONS, CERT_LINKAGE } from "@/lib/constants";

interface Props {
  formData: PlayerFormData;
  errors: Partial<Record<keyof PlayerFormData, string>>;
  onChange: <K extends keyof PlayerFormData>(key: K, value: PlayerFormData[K]) => void;
  onSetRole?: (role: "athlete" | "coach") => void;
}

export function PlayerInfoStep({ formData, errors, onChange, onSetRole }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">{formData.role === "coach" ? "教练信息" : "球员基础信息"}</h2>

      {/* Role Selector */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">身份 *</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onSetRole ? onSetRole("athlete") : onChange("role", "athlete")}
            className={`p-4 rounded-xl border transition-all text-center ${
              formData.role === "athlete"
                ? "border-[#992828] bg-[#992828]/10 text-[#992828]"
                : "border-[#222] text-gray-400 hover:border-[#992828]"
            }`}
          >
            <User className="w-6 h-6 mx-auto mb-1" />
            <span className="text-sm font-medium">我是运动员</span>
          </button>
          <button
            onClick={() => onSetRole ? onSetRole("coach") : onChange("role", "coach")}
            className={`p-4 rounded-xl border transition-all text-center ${
              formData.role === "coach"
                ? "border-[#992828] bg-[#992828]/10 text-[#992828]"
                : "border-[#222] text-gray-400 hover:border-[#992828]"
            }`}
          >
            <Users className="w-6 h-6 mx-auto mb-1" />
            <span className="text-sm font-medium">我是教练</span>
          </button>
        </div>
      </div>

      {/* Coach-specific fields: 3-tier cascading selector */}
      {formData.role === "coach" && (
        <div className="space-y-4 bg-[#992828]/5 border border-[#992828]/20 rounded-xl p-4">
          {/* Tier 1: Certificate */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">教练证书等级 *</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {COACH_CERT_OPTIONS.map((cert) => (
                <button
                  key={cert.value}
                  onClick={() => {
                    onChange("coachCert", cert.value);
                    onChange("coachRole", null);
                    onChange("leagueTag", null);
                  }}
                  className={`p-2 rounded-lg text-xs font-medium border transition-all ${
                    formData.coachCert === cert.value
                      ? "border-[#992828] bg-[#992828]/10 text-[#992828]"
                      : "border-[#222] text-gray-400 hover:border-[#992828]"
                  }`}
                >
                  {cert.label}
                </button>
              ))}
            </div>
            {errors.coachCert && <p className="mt-1 text-[#992828] text-xs">{errors.coachCert}</p>}
          </div>

          {/* Tier 2: Coach Role (grayed based on cert) */}
          {formData.coachCert && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">执教身份 *</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {COACH_ROLE_OPTIONS.map((roleOpt) => {
                  const allowedRoles = CERT_LINKAGE[formData.coachCert!].allowedRoles;
                  const disabled = !allowedRoles.includes(roleOpt.value);
                  return (
                    <button
                      key={roleOpt.value}
                      disabled={disabled}
                      onClick={() => {
                        onChange("coachRole", roleOpt.value);
                        onChange("leagueTag", null);
                      }}
                      className={`p-2 rounded-lg text-xs font-medium border transition-all ${
                        disabled
                          ? "opacity-30 cursor-not-allowed border-[#222] text-gray-600"
                          : formData.coachRole === roleOpt.value
                          ? "border-[#992828] bg-[#992828]/10 text-[#992828]"
                          : "border-[#222] text-gray-400 hover:border-[#992828]"
                      }`}
                      title={disabled ? "当前证书不可选" : ""}
                    >
                      {roleOpt.label}
                    </button>
                  );
                })}
              </div>
              {errors.coachRole && <p className="mt-1 text-[#992828] text-xs">{errors.coachRole}</p>}
            </div>
          )}

          {/* Tier 3: League/Tag (grayed based on cert) */}
          {formData.coachRole && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">执教联赛/梯队 *</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {LEAGUE_TAG_OPTIONS.map((league) => {
                  const allowedLeagues = CERT_LINKAGE[formData.coachCert!].allowedLeagues;
                  const disabled = !allowedLeagues.includes(league.value);
                  return (
                    <button
                      key={league.value}
                      disabled={disabled}
                      onClick={() => onChange("leagueTag", league.value)}
                      className={`p-2 rounded-lg text-xs font-medium border transition-all ${
                        disabled
                          ? "opacity-30 cursor-not-allowed border-[#222] text-gray-600"
                          : formData.leagueTag === league.value
                          ? "border-[#992828] bg-[#992828]/10 text-[#992828]"
                          : "border-[#222] text-gray-400 hover:border-[#992828]"
                      }`}
                      title={disabled ? "当前证书不可选" : ""}
                    >
                      {league.label}
                    </button>
                  );
                })}
              </div>
              {errors.leagueTag && <p className="mt-1 text-[#992828] text-xs">{errors.leagueTag}</p>}
            </div>
          )}
        </div>
      )}

      {/* Athlete-only fields */}
      {formData.role === "athlete" && (
        <>
          {/* Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">姓名</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="例: 张三"
              maxLength={30}
              className="input-field"
            />
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">场上位置 *</label>
            <div className="grid grid-cols-5 gap-2">
              {POSITION_OPTIONS.map((pos) => (
                <button
                  key={pos.value}
                  onClick={() => onChange("position", pos.value)}
                  className={`p-3 rounded-xl text-sm font-medium border transition-all ${
                    formData.position === pos.value
                      ? "border-[#992828] bg-[#992828]/10 text-[#992828]"
                      : "border-[#222] text-gray-400 hover:border-[#992828]"
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
            {errors.position && (
              <p className="mt-1 text-[#992828] text-xs">{errors.position}</p>
            )}
          </div>

          {/* Age, Height, Weight, Years */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">年龄 (岁) *</label>
              <input
                type="number"
                value={formData.age ?? ""}
                onChange={(e) => onChange("age", e.target.value ? Number(e.target.value) : null)}
                placeholder="例: 25"
                min={12}
                max={60}
                className={errors.age ? "input-error" : "input-field"}
              />
              {errors.age && <p className="mt-1 text-[#992828] text-xs">{errors.age}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">身高 (cm) *</label>
              <input
                type="number"
                value={formData.height ?? ""}
                onChange={(e) => onChange("height", e.target.value ? Number(e.target.value) : null)}
                placeholder="例: 180"
                min={120}
                max={220}
                className={errors.height ? "input-error" : "input-field"}
              />
              {errors.height && <p className="mt-1 text-[#992828] text-xs">{errors.height}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">体重 (kg) *</label>
              <input
                type="number"
                value={formData.weight ?? ""}
                onChange={(e) => onChange("weight", e.target.value ? Number(e.target.value) : null)}
                placeholder="例: 75"
                min={30}
                max={150}
                className={errors.weight ? "input-error" : "input-field"}
              />
              {errors.weight && <p className="mt-1 text-[#992828] text-xs">{errors.weight}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">训练年限 (年) *</label>
              <input
                type="number"
                value={formData.years ?? ""}
                onChange={(e) => onChange("years", e.target.value ? Number(e.target.value) : null)}
                placeholder="例: 8"
                min={0}
                max={40}
                className={errors.years ? "input-error" : "input-field"}
              />
              {errors.years && <p className="mt-1 text-[#992828] text-xs">{errors.years}</p>}
            </div>
          </div>

          {/* Injury History */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">伤病史（选填）</label>
            <textarea
              value={formData.injuryHistory}
              onChange={(e) => onChange("injuryHistory", e.target.value)}
              placeholder="描述过往伤病情况，如：2023年左膝前十字韧带损伤..."
              maxLength={500}
              rows={3}
              className="input-field resize-none"
            />
            <p className="mt-1 text-gray-600 text-xs">
              {formData.injuryHistory.length}/500
            </p>
          </div>
        </>
      )}
    </div>
  );
}
