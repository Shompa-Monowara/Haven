import { Star } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";

interface Testimonial {
  quote: string;
  name: string;
  city: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "The listings were exactly as described, and messaging the agent from the home page meant I had a viewing booked the same afternoon.",
    name: "Amelia Rivera",
    city: "Brooklyn, NY",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    quote:
      "I saved two searches and got an alert when a place I could actually afford was approved. No wasted weekend viewings.",
    name: "Daniel Park",
    city: "Austin, TX",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    quote:
      "Knowing every home is reviewed before it goes live made the whole process calmer. The agent answered every question in chat.",
    name: "Sofia Bennett",
    city: "Seattle, WA",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    quote:
      "Renting was painless. I asked about parking and pets in chat, had answers the same day, and signed the lease a week later.",
    name: "Marcus Hale",
    city: "Denver, CO",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
  },
];

export function Testimonials() {
  return (
    <section className="section-pad bg-surface" aria-labelledby="testimonials-heading">
      <div className="shell-container">
        <div className="max-w-2xl">
          <h2
            id="testimonials-heading"
            className="text-[28px] font-bold leading-tight sm:text-[32px]"
          >
            What house hunters say
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-body">
            What buyers love about verified listings, saved searches, and talking to agents directly.
          </p>
        </div>

        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((testimonial) => (
            <li
              key={testimonial.name}
              className="flex h-full flex-col rounded-lg border border-line bg-canvas p-6"
            >
              <div
                className="flex items-center gap-1 text-warning"
                role="img"
                aria-label="5 out of 5 stars"
              >
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className="h-4 w-4 fill-current"
                    aria-hidden="true"
                  />
                ))}
              </div>

              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-body">
                “{testimonial.quote}”
              </blockquote>

              <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                <Avatar src={testimonial.avatar} name={testimonial.name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-heading">{testimonial.name}</p>
                  <p className="truncate text-xs text-muted">{testimonial.city}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}