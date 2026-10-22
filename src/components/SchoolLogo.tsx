import { useQuery } from "@tanstack/react-query";
import { api } from "../utils/api";

/**
 * Small circular school logo image, fetched from /settings/general.
 * Renders nothing when no logo has been uploaded or the image fails to load.
 * Wrap it in a flex container next to the text (e.g. a dashboard greeting).
 */
export default function SchoolLogo({
  className = "h-10 w-10",
}: {
  className?: string;
}) {
  const { data } = useQuery({
    queryKey: ["topbar-info"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await api.get("/settings/general");
      return res.ok ? await res.json() : {};
    },
  });
  const logoUrl = (data as { logoUrl?: string | null })?.logoUrl;
  if (!logoUrl) return null;
  return (
    <img
      src={logoUrl}
      alt="School logo"
      className={`${className} rounded-full object-cover flex-shrink-0 ring-1 ring-black/10 dark:ring-white/10`}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
