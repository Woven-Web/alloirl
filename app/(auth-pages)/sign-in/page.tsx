"use client";

import { signInAction } from "@/app/actions";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { AlloLogo } from "@/components/allo-logo";
import { useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

interface SignInResponse {
  refresh?: boolean;
  url?: string;
}

export interface LoginSearchParams {
  otpSent?: number;
  email?: string;
  message?: string;
  error?: string;
  type?: string;
}

export default function Login() {
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  let message = params.get("message") || "";
  let isOtpSent = params.get("otpSent") === "1";

  useEffect(() => {
    if (params.get("email") && !email) {
      setEmail(params.get("email") || "");
    }
  }, [email, params]);

  return (
    <div className="w-[390px] flex flex-col items-center p-4">
      <div className="mb-12">
        <AlloLogo width={218} height={175} />
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData();
          formData.append("email", email);
          if (code) {
            formData.append("code", code);
          }
          const result = await signInAction(formData) as SignInResponse;
          if (result?.refresh) {
            window.location.href = result.url || '/';
          }
        }}
        className="w-full space-y-5"
      >
        <Input
          type="email"
          name="email"
          placeholder="Email Address"
          required
          value={email}
          disabled={isOtpSent}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-[60px] bg-transparent border-2 border-brand-blue rounded-[10px] font-eyebrow text-lg text-brand-blue text-center placeholder:text-brand-blue"
        />
        {isOtpSent && (
          <Input
            type="number"
            name="code"
            placeholder="One Time Passcode"
            required
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-[60px] bg-transparent border-2 border-brand-blue rounded-[10px] font-eyebrow text-lg text-brand-blue text-center placeholder:text-brand-blue"
          />
        )}
        <SubmitButton
          pendingText={isOtpSent ? "Validating OTP..." : "Sending OTP..."}
          className="w-full h-[60px] bg-brand-blue hover:bg-brand-blue/90 border-2 border-brand-blue rounded-[10px] font-eyebrow text-lg text-brand-yellow"
        >
          Enter
        </SubmitButton>
        <div className="text-center font-eyebrow text-sm text-brand-blue">
          <FormMessage message={{ message }} />
        </div>
      </form>
    </div>
  );
}
