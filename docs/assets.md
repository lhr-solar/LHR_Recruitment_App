# Brand assets and photographs

## Logos (`public/brand/`)

From the LHR Brand Book's downloadable assets, unmodified except as noted.

| File | Source |
|---|---|
| `lhr-logo.svg`, `lhrs-logo.svg`, `lhre-logo.svg`, `lhrc-logo.svg`, `lhr-shortmark.svg` | Brand Book, section C (Logo Hierarchy) |
| `lhr-logoblock.svg` | Brand Book `LHR_Logoblock.svg`, viewBox trimmed to the artwork |
| `lhr-logo-white.svg`, `lhr-logoblock-white.svg` | All-white variants (Brand Book: white logo on dark backgrounds) |
| `lhr-careers-lockup.svg` (+ `-white`) | Built to the Brand Book's Logo-Descriptor Lockup slide: primary logo over "CAREERS" in Montserrat 400, converted to outlines and tracked to the logo's width |
| `google-g.svg` | Google's sign-in mark (required on Google sign-in buttons) |
| `src/app/icon.svg` | The shortmark, used as the favicon |

## Photographs (`public/photos/`)

From Longhorn Racing's own gallery pages on longhornracing.org, resized to 2000px.

| File | Gallery |
|---|---|
| `solar-sunset-run.jpg`, `solar-sunset-cones.jpg`, `solar-track-blur.jpg`, `solar-array-bench.jpg`, `solar-welding.jpg`, `solar-car-sky.jpg`, `solar-car-front.jpg`, `solar-team-flags.jpg`, `solar-driver.jpg` | /solar-gallery |
| `electric-car-track.jpg`, `electric-car-profile.jpg`, `electric-upright.jpg`, `electric-frame-build.jpg` | /electric-gallery |
| `combustion-livery.jpg`, `combustion-garage.jpg`, `combustion-push.jpg` | /combustion-gallery |

Replace any of these with newer shots at the same file name. The sign-in page crossfades through the ten listed in `src/lib/photos.ts` (six of them Solar), starting on a different one each day; edit that list to change the set.
