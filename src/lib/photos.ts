// Team photographs from the Solar, Electric and Combustion gallery pages on longhornracing.org.
export const SIGN_IN_PHOTOS = [
  { src: "/photos/solar-sunset-run.jpg", caption: "The Solar team's car at speed", position: "50% 60%" },
  { src: "/photos/electric-car-track.jpg", caption: "The Electric team's car on track", position: "50% 55%" },
  { src: "/photos/combustion-livery.jpg", caption: "The Combustion team's car, number 88", position: "40% 50%" },
] as const;

// A different team leads the sign-in page each day.
export function photoOfTheDay(now = new Date()) {
  const day = Math.floor(now.getTime() / 86_400_000);
  return SIGN_IN_PHOTOS[day % SIGN_IN_PHOTOS.length];
}
