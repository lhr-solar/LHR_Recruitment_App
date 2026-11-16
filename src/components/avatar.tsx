// A student's photo, or their initials when there isn't one.
export function Avatar({ name, url, size, className }: { name: string; url: string | null; size: number; className: string }) {
  if (url) {
    // An uploaded photo (a signed URL) or the Google one; plain img so no image proxy is needed.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={url} alt="" width={size} height={size} referrerPolicy="no-referrer" loading="lazy" />;
  }
  const initials = name.includes("@")
    ? name[0].toUpperCase()
    : name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
  return (
    <span className={`${className} avatar-initials`} aria-hidden="true">
      {initials}
    </span>
  );
}
