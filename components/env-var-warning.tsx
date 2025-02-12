import Link from "next/link";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export function EnvVarWarning() {
  return (
    <div className="flex gap-4 items-center">
      <Badge variant={"outline"} className="font-normal">
        Supabase environment variables required
      </Badge>
      <div className="flex gap-2">
        <Button
          asChild
          size="sm"
          variant={"default"}
          disabled
          className="opacity-75 cursor-none pointer-events-none"
        >
          <Link href="/sign-in">Sign in with Email</Link>
        </Button>
      </div>
    </div>
  );
}
