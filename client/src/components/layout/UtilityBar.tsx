import { Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export function UtilityBar() {
  return (
    <div className="hidden bg-ink text-white/80 md:block">
      <div className="shell-container flex h-10 items-center justify-between text-[13px]">
        <div className="flex items-center gap-6">
          <a
            href="tel:+18005550142"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            (800) 555-0142
          </a>
          <a
            href="mailto:hello@haven.example"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            hello@haven.example
          </a>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-white/60">Find a local expert</span>
          <Link to="/login" className="font-medium text-white hover:underline">
            Sign in
          </Link>
          <span aria-hidden="true" className="text-white/30">
            |
          </span>
          <Link to="/register" className="font-medium text-white hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}