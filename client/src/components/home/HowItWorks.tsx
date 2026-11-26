import { MessageCircle, Search, ShieldCheck, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
}

const steps: Step[] = [
  {
    icon: Upload,
    title: "Agents publish a listing",
    body: "Local agents add photos, price, size, and a map pin, then submit the home for review.",
  },
  {
    icon: ShieldCheck,
    title: "Haven admins approve it",
    body: "Every submission is checked before it goes live, so photos, pricing, and details match the home.",
  },
  {
    icon: Search,
    title: "You search and save",
    body: "Search by city, price, type, and size on a list or a map, then save the favorites you want to compare.",
  },
  {
    icon: MessageCircle,
    title: "Contact the agent",
    body: "Send an inquiry or start a chat and keep every question, answer, and viewing in one thread.",
  },
];

export function HowItWorks() {
  return (
    <section className="section-pad bg-canvas" aria-labelledby="how-it-works-heading">
      <div className="shell-container">
        <div className="max-w-2xl">
          <h2
            id="how-it-works-heading"
            className="text-[28px] font-bold leading-tight sm:text-[32px]"
          >
            How Haven works
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-body">
            Four steps from listing to answer, with a review between agents and you.
          </p>
        </div>

        <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex h-full flex-col rounded-lg border border-line bg-surface p-6"
            >
              <span className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft font-display text-sm font-bold text-brand-strong tabular">
                  {index + 1}
                </span>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand-strong">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </span>

              <h3 className="mt-4 text-lg font-semibold text-heading">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{step.body}</p>

              {index === 1 ? (
                <div className="mt-auto pt-4">
                  <Badge variant="outline">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Reviewed by Haven admins
                  </Badge>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}