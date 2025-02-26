"use client";

import { signInAction } from "@/app/actions";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { AlloLogo } from "@/components/allo-logo";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
  returnTo?: string;
}

export default function Login() {
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  let message = params.get("message") || "";
  let isOtpSent = params.get("otpSent") === "1";
  let showOtpField = isOtpSent || message.toLowerCase().includes("token has expired or is invalid");

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
          setIsSubmitting(true);
          
          try {
            const formData = new FormData();
            formData.append("email", email.trim().toLowerCase());
            if (code) {
              formData.append("code", code);
            }
            
            const returnTo = params.get("returnTo");
            if (returnTo) {
              formData.append("returnTo", returnTo);
            }
            
            const result = await signInAction(formData) as SignInResponse;
            if (result?.refresh) {
              window.location.href = result.url || '/';
            }
          } catch (error) {
            console.error("Sign-in error:", error);
          } finally {
            setIsSubmitting(false);
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
          disabled={isOtpSent || isSubmitting}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-[60px] bg-transparent border-2 border-brand-blue rounded-[10px] font-eyebrow text-lg text-brand-blue text-center placeholder:text-brand-blue"
        />
        {showOtpField && (
          <Input
            type="number"
            name="code"
            placeholder="One Time Passcode"
            required
            value={code}
            disabled={isSubmitting}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-[60px] bg-transparent border-2 border-brand-blue rounded-[10px] font-eyebrow text-lg text-brand-blue text-center placeholder:text-brand-blue"
          />
        )}
        <SubmitButton
          pendingText={showOtpField ? "Validating OTP..." : "Sending OTP..."}
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
