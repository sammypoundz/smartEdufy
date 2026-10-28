import iconUrl from "../assets/smart edufy icon.png";
import logoDarkUrl from "../assets/smart edufy.png"; // white text – for dark backgrounds
import logoLightUrl from "../assets/smart edufy II.png"; // black text – for light backgrounds

import { useTheme } from "../contexts/ThemeContext";

/**
 * SmartEdufy brand logo.
 *
 * - variant="icon"  → square badge logo (the standalone icon mark)
 * - variant="full"  → full logo with "Smart Edufy" text baked into the image.
 *   Automatically picks the white-text version on dark backgrounds and the
 *   black-text version on light backgrounds.
 */
export default function BrandLogo({
  variant = "full",
  className = "h-10",
  alt = "SmartEdufy logo",
}: {
  variant?: "icon" | "full";
  className?: string;
  alt?: string;
}) {
  const { theme } = useTheme();
  const src =
    variant === "icon"
      ? iconUrl
      : theme === "dark"
        ? logoDarkUrl
        : logoLightUrl;

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} ${variant === "icon" ? "rounded-xl object-contain" : "object-contain"}`}
      draggable={false}
    />
  );
}
