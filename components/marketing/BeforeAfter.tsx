import Image from "next/image";
import type { JobPhotoPair } from "@/lib/jobPhotos";

// Plain before/after image pairs, no JS slider. Side by side on desktop,
// stacked on mobile (marketing.css .mkt-before-after). Images are 1125x1500
// source; width/height below keep that 3:4 ratio so there's no layout shift.
export function BeforeAfter({ pairs }: { pairs: JobPhotoPair[] }) {
  return (
    <div className="mkt-before-after-grid">
      {pairs.map((pair) => (
        <div key={pair.id}>
          <div className="mkt-before-after">
            <figure>
              <Image src={pair.before.src} alt={pair.before.alt} width={375} height={500} />
              <figcaption>Before</figcaption>
            </figure>
            <figure>
              <Image src={pair.after.src} alt={pair.after.alt} width={375} height={500} />
              <figcaption>After</figcaption>
            </figure>
          </div>
          <p className="mkt-before-after-caption">{pair.caption}</p>
        </div>
      ))}
    </div>
  );
}
