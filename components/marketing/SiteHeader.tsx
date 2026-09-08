"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAP, NAV_ITEMS } from "@/lib/site";

// Persistent header for the marketing pages. Transparent over the home page's
// full-bleed hero, solid once scrolled past it; solid everywhere else. Below
// 48rem the text links collapse into a menu that also carries the call and
// book actions — the always-visible Book + call on a phone live in the bottom
// bar (components/marketing/MobileCtaBar).
export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  // Only the home page has a full-bleed hero to sit over; it starts transparent
  // and the scroll effect below flips it. Every other page is solid.
  const [solid, setSolid] = useState(!isHome);
  const headerRef = useRef<HTMLElement>(null);

  // On navigation: close the menu, and reset `solid` for the new page
  // (render-phase reset — no effect).
  const [navPath, setNavPath] = useState(pathname);
  if (pathname !== navPath) {
    setNavPath(pathname);
    setMenuOpen(false);
    setSolid(!isHome);
  }

  // Home only: flip to solid once the hero has scrolled past.
  useEffect(() => {
    if (!isHome) return;
    const hero = document.querySelector<HTMLElement>(".mkt-hero");
    if (!hero) return;
    const update = () => {
      const headerH = headerRef.current?.offsetHeight ?? 60;
      setSolid(window.scrollY > Math.max(hero.offsetHeight - headerH, 0));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isHome]);

  // Close the menu on Escape or a click outside the header.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href;
  const close = () => setMenuOpen(false);
  // the open menu forces the solid look so its panel reads
  const overHero = !solid && !menuOpen;

  return (
    <header
      ref={headerRef}
      className={`mkt-header${overHero ? " mkt-header--over" : ""}`}
    >
      <div className="mkt-header__bar">
        <Link
          href="/"
          className="mkt-header__logo"
          aria-label="Uinta Ice Co. — home"
        >
          <Image src="/images/logo2.png" alt="" width={26} height={26} />
          <span>Uinta Ice Co.</span>
        </Link>

        <nav className="mkt-header__links" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mkt-header__actions">
          <a
            href={NAP.phoneHref}
            className="mkt-header__call"
            aria-label={`Call or text ${NAP.phoneDisplay}`}
          >
            <PhoneIcon />
            <span className="mkt-header__call-text">{NAP.phoneDisplay}</span>
          </a>

          <Link href="/book" className="mkt-btn mkt-btn--primary">
            Book a cleaning
          </Link>

          <button
            type="button"
            className="mkt-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="mkt-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      <nav id="mkt-menu" className="mkt-menu" aria-label="Pages" hidden={!menuOpen}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            onClick={close}
          >
            {item.label}
          </Link>
        ))}
        <a href={NAP.phoneHref} className="mkt-menu__call" onClick={close}>
          Call or text {NAP.phoneDisplay}
        </a>
        <Link
          href="/book"
          className="mkt-btn mkt-btn--primary mkt-menu__book"
          onClick={close}
        >
          Book a cleaning
        </Link>
      </nav>
    </header>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.99.36 1.95.7 2.87a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.2-1.27a2 2 0 0 1 2.11-.45c.92.34 1.88.57 2.87.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
