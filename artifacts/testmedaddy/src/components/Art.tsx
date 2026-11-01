/** Generated marketing illustrations. Batch evidence remains in the photo components. */
type ArtProps = { className?: string };

function Illustration({ name, alt, className = "", hero = false, square = false }: ArtProps & { name: string; alt: string; hero?: boolean; square?: boolean }) {
  const width = hero ? 1536 : square ? 960 : 1280;
  return (
    <div className={`pointer-events-none overflow-hidden ${className}`}>
      <img
        src={`/img/generated/lab-v2/${name}.webp`}
        srcSet={`/img/generated/lab-v2/${name}-small.webp ${width / 2}w, /img/generated/lab-v2/${name}.webp ${width}w`}
        sizes={hero ? "(max-width: 1023px) calc(100vw - 32px), 620px" : square ? "(max-width: 639px) calc(100vw - 96px), 300px" : "(max-width: 767px) calc(100vw - 32px), (max-width: 1199px) 58vw, 660px"}
        width={width}
        height={square ? width : Math.round(width * 2 / 3)}
        alt={alt}
        loading={hero ? "eager" : "lazy"}
        fetchPriority={hero ? "high" : undefined}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export function HeroArt(props: ArtProps) {
  return <Illustration {...props} name="hero-lab" alt="Illustrative HPLC system with solvent reservoirs, an autosampler and sample vials on a laboratory bench" hero />;
}

export function PaymentsArt(props: ArtProps) {
  return <Illustration {...props} name="verified-payments" alt="Illustrative chromatography autosampler with a rack of capped sample vials" square />;
}

export function OrganiserArt(props: ArtProps) {
  return <Illustration {...props} name="organiser-samples" alt="Illustrative LC-MS system with a mass spectrometer and liquid chromatography instrument" />;
}

export function MembersArt(props: ArtProps) {
  return <Illustration {...props} name="member-contributions" alt="Illustrative endotoxin assay setup with a multichannel pipette, microplate and plate reader" />;
}

export function CommunityArt(props: ArtProps) {
  return <Illustration {...props} name="community-updates" alt="Illustrative laboratory technician preparing samples with a pipette beside analytical equipment" />;
}
