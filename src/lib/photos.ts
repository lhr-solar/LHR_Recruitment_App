// Team photographs from the Solar, Electric and Combustion gallery pages on longhornracing.org.
// The sign-in page cycles through these, alternating the cars with the people who build them.
// Solar has the most photos in its gallery, so it leads the set.
export type SignInPhoto = { src: string; position: string };

export const SIGN_IN_PHOTOS: readonly SignInPhoto[] = [
  { src: "/photos/solar-sunset-run.jpg", position: "50% 60%" },
  { src: "/photos/electric-frame-build.jpg", position: "50% 40%" },
  { src: "/photos/solar-car-sky.jpg", position: "35% 60%" },
  { src: "/photos/solar-driver.jpg", position: "55% 45%" },
  { src: "/photos/combustion-garage.jpg", position: "40% 50%" },
  { src: "/photos/solar-team-flags.jpg", position: "50% 60%" },
  { src: "/photos/solar-car-front.jpg", position: "22% 60%" },
  { src: "/photos/solar-welding.jpg", position: "55% 55%" },
  { src: "/photos/electric-car-track.jpg", position: "50% 55%" },
  { src: "/photos/solar-array-bench.jpg", position: "45% 40%" },
];

// Each day starts the cycle on a different photo.
export function firstPhotoIndex(now = new Date()) {
  const day = Math.floor(now.getTime() / 86_400_000);
  return day % SIGN_IN_PHOTOS.length;
}
