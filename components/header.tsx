import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";

interface HeaderProps {
  eventId?: string;
  projectId?: string;
}

export function Header({ eventId, projectId }: HeaderProps) {
  return (
    <nav className="w-full flex justify-between items-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-4xl flex justify-between items-center p-3 text-sm mx-auto">
        <Link href="/" className="text-lg font-bold">
          alloirl
        </Link>
        <div className="flex items-center gap-4">
          <HeaderAuth eventId={eventId} projectId={projectId} />
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  );
}
