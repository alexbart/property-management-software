import { Globe, MapPin, Phone } from "lucide-react";

const FACEBOOK_URL =
  "https://www.facebook.com/p/Property-Insiders-Commercial-Agency-Ltd-100063897944108/";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
        <div className="space-y-2">
          <p className="text-base font-semibold text-text">
            Property Insiders Commercial Agency Ltd.
          </p>
          <p className="text-sm text-muted">
            Real estate agency in Eldama Ravine, Baringo County — land, plots,
            and commercial/residential properties for sale.
          </p>
        </div>

        <div className="space-y-2 text-sm text-muted">
          <p className="font-medium text-text">Contact</p>
          <a
            href="tel:+254723030033"
            className="flex items-center gap-2 hover:text-text"
          >
            <Phone className="h-4 w-4" aria-hidden="true" /> +254 723 030 033
          </a>
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Mt. Sinai Mall, 2nd Floor, Room 202B, Eldama Ravine
          </p>
        </div>

        <div className="space-y-2 text-sm text-muted">
          <p className="font-medium text-text">Follow us</p>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-text"
          >
            <Globe className="h-4 w-4" aria-hidden="true" /> Facebook
          </a>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Property Insiders Commercial Agency Ltd.
          All rights reserved.
        </div>
      </div>
    </footer>
  );
}