import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlloLogo } from "@/components/allo-logo";
import Link from "next/link";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  return (
    <div className="w-[390px] flex flex-col items-center">
      <div className="mb-12">
        <AlloLogo width={218} height={175} />
      </div>
      <form className="w-full space-y-5">
        <Input
          type="email"
          name="email"
          placeholder="Email Address"
          required
          className="w-full h-[60px] bg-transparent border-2 border-brand-blue rounded-[10px] font-eyebrow text-lg text-brand-blue text-center placeholder:text-brand-blue"
        />
        <SubmitButton 
          pendingText="Sending link..."
          formAction={signInAction}
          className="w-full h-[60px] bg-brand-blue hover:bg-brand-blue/90 border-2 border-brand-blue rounded-[10px] font-eyebrow text-lg text-brand-yellow"
        >
          Enter
        </SubmitButton>
        <FormMessage message={searchParams} className="text-center font-eyebrow text-sm text-brand-blue" />
      </form>
    </div>
  );
}
