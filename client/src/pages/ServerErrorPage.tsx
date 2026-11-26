import { RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

function makeRequestId() {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `ERR-${random}`;
}

export function ServerErrorPage({ onRetry }: { onRetry?: () => void }) {
  const requestId = useMemo(makeRequestId, []);

  return (
    <div className="section-pad" role="alert">
      <div className="shell-container">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-display text-[64px] font-bold leading-none text-brand sm:text-[80px]">500</p>
          <h1 className="mt-3 text-[28px] font-bold leading-tight text-heading sm:text-[32px]">
            Something went wrong
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-body">
            We hit an unexpected error loading this page. Try again, or contact support and share the
            reference below so we can trace it.
          </p>

          <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-body">
            Reference{" "}
            <span className="font-mono font-semibold text-heading">{requestId}</span>
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => {
                if (onRetry) onRetry();
                else window.location.reload();
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
            <Button asChild variant="outline">
              <a
                href={`mailto:support@haven.example?subject=${encodeURIComponent(`Error ${requestId}`)}`}
              >
                Contact support
              </a>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}