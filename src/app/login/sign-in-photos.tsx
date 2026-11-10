"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { SignInPhoto } from "@/lib/photos";

const ROTATE_MS = 7000;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// Crossfades through the team photos. Anything that moves on its own needs a pause
// control, and visitors who ask for reduced motion start on a still photo.
export function SignInPhotos({ photos, start }: { photos: readonly SignInPhoto[]; start: number }) {
  const [index, setIndex] = useState(start);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
  // null until the visitor presses pause or play.
  const [choice, setChoice] = useState<boolean | null>(null);
  const playing = choice ?? !reducedMotion;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % photos.length), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [playing, photos.length]);

  return (
    <div className="signin-photo">
      {photos.map((photo, i) => {
        // Only the photo on screen, the one fading out and the next one are mounted, so the page
        // loads one photo at a time instead of the whole set up front.
        const offset = (i - index + photos.length) % photos.length;
        if (offset > 1 && offset < photos.length - 1) return null;
        return (
          <Image
            key={photo.src}
            src={photo.src}
            alt=""
            fill
            priority={i === start}
            sizes="(max-width: 60rem) 100vw, 55vw"
            className="signin-photo-img"
            data-current={i === index ? "" : undefined}
            style={{ objectFit: "cover", objectPosition: photo.position }}
          />
        );
      })}
      <button
        type="button"
        className="signin-photo-toggle"
        aria-label={playing ? "Pause photos" : "Play photos"}
        onClick={() => setChoice(!playing)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
          {playing ? <path d="M4 2.5h2.75v11H4zM9.25 2.5H12v11H9.25z" /> : <path d="M4.5 2.25v11.5L13.5 8z" />}
        </svg>
      </button>
    </div>
  );
}
