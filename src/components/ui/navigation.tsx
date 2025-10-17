"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Gallery" },
  { href: "/bento", label: "Bentos" },
  { href: "/casestudies", label: "Case Studies" },
  { href: "/contacts", label: "Contact" },
  { href: "/ctas", label: "CTAs" },
  { href: "/faqs", label: "FAQs" },
  { href: "/feature", label: "Features" },
  { href: "/footers", label: "Footers" },
  { href: "/hero", label: "Hero" },
  { href: "/navbars", label: "Navbars" },
  { href: "/pricing", label: "Pricing" },
  { href: "/stats", label: "Stats" },
  { href: "/team", label: "Team" },
  { href: "/testimonial", label: "Testimonials" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="bg-gradient-to-r from-primary to-[oklch(0.64_0.2_300)] bg-clip-text text-xl font-semibold text-transparent transition-colors"
            >
              LAN Hub
            </Link>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
className={`group relative whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-[color,background,transform] duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 ${
                    isActive
                      ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                      : "text-foreground/70 hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <span className="relative z-10">{item.label}</span>
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute inset-x-1 bottom-0 h-[2px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-primary/0 via-primary/70 to-primary/0 opacity-75 transition-transform duration-300 ease-[var(--ease-smooth)] ${
                      isActive ? "scale-x-100" : "group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
