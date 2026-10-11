type Tone = "auto" | "onDark" | "color";

type Props = {
  variant?: "lockup" | "mark";
  tone?: Tone;
  className?: string;
};

export default function BrandLogo({ variant = "lockup", tone = "auto", className = "h-8" }: Props) {
  const src = variant === "mark" ? "/brand/mark.png" : "/brand/logo.png";
  const imgClass = `w-auto max-w-full object-contain object-left ${className}`;

  if (tone === "onDark") {
    return <img src={src} alt="GeldFlus" className={`${imgClass} brightness-0 invert`} />;
  }
  if (tone === "color") {
    return <img src={src} alt="GeldFlus" className={imgClass} />;
  }

  return (
    <span className="inline-flex items-center">
      <img src={src} alt="GeldFlus" className={`${imgClass} dark:hidden`} />
      <img src={src} alt="" className={`${imgClass} hidden brightness-0 invert dark:block`} />
    </span>
  );
}
