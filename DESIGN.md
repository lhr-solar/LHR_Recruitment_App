---
name: Longhorn Racing Recruitment
description: Longhorn Racing's Partners find engineers from the Solar, Electric and Combustion teams.
colors:
  accent: "#045F85"
  accent-hover: "#034C6B"
  accent-wash: "#E3EEF3"
  accent-ink: "#FFFFFF"
  paper: "#EDEFF3"
  paper-2: "#FFFFFF"
  paper-3: "#F5F6F8"
  ink: "#0E2A38"
  ink-2: "#2E4653"
  muted: "#4D6270"
  control: "#7A8D99"
  brand-gray: "#9CADB7"
  rule: "#D5DCE2"
  solar: "#FF9404"
  electric: "#FFB526"
  combustion: "#FFC871"
  error: "#B42318"
  error-wash: "#FDECEA"
  success: "#1F7A4D"
  success-wash: "#E4F4EA"
typography:
  display:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.074rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.728rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  subtitle:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  lede:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1
  field-label:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.55
rounded:
  chip: "6px"
  control: "8px"
  card: "16px"
spacing:
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "64px"
  3xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-disabled:
    backgroundColor: "{colors.paper-3}"
    textColor: "{colors.muted}"
  button-secondary:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.paper-3}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    height: "40px"
  button-quiet-hover:
    backgroundColor: "{colors.accent-wash}"
  button-danger:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.error}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-danger-hover:
    backgroundColor: "{colors.error-wash}"
  input:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  input-disabled:
    backgroundColor: "{colors.paper-3}"
    textColor: "{colors.muted}"
  panel:
    backgroundColor: "{colors.paper-2}"
    rounded: "{rounded.card}"
    padding: "24px"
  notice-error:
    backgroundColor: "{colors.error-wash}"
    textColor: "{colors.error}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  notice-success:
    backgroundColor: "{colors.success-wash}"
    textColor: "{colors.success}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  notice-info:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.accent-hover}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  nav-link-hover:
    backgroundColor: "{colors.paper-3}"
    textColor: "{colors.ink}"
  nav-link-active:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.accent}"
  door-switch:
    backgroundColor: "{colors.paper}"
    padding: "4px"
  door-option:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "40px"
  door-option-active:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.accent}"
  team-choice:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "16px"
  team-choice-selected:
    backgroundColor: "{colors.accent-wash}"
  photo-caption:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.chip}"
    padding: "4px 12px"
---

# Design System: Longhorn Racing Recruitment

## Overview

**Creative North Star: "The Team Garage Desk"**

A working tool that could only belong to Longhorn Racing. The system is the LHR Brand Book's "structured approachability" carried into product UI: white rectangles with soft rounded corners set on the brand's Light Gray, Ocean Blue as the one voice for action and selection, and Montserrat titles over Urbanist reading text. Expression does not come from ornament. It comes from three real things: the official logos, the team-colour stripes, and photographs of the cars from the team galleries.

Density is that of a quiet tool. Pages open on a noun title and a single line of context, then go straight to panels, forms and tables. Tables are built from hairline rules and alignment, never zebra bands. Every surface sits flat; depth is drawn with 1px rules and tonal steps between Light Gray, white and a near-white mist.

The one expressive surface is sign-in: a full-height team photograph (one of the three teams, rotating daily) beside a white panel holding the RECRUITMENT lockup, a "Sign in" headline, one sentence, a two-door switch (LHR member / Partner) and Google sign-in as the primary action.

**Key Characteristics:**
- Ocean Blue on Light Gray with white surfaces; ink-blue text, never pure black.
- Soft rounded rectangles: 8px for controls, 16px for panels, 6px for small chips.
- Flat surfaces separated by 1px rules; no card shadows.
- Montserrat 600 for titles, buttons and choice labels; Urbanist for everything read.
- Team ambers appear only as team coding: stripes, logos, photographs.
- Official logo artwork only, full colour on light, white on dark.

## Colors

A cool, blue-gray palette anchored by one saturated brand blue, with three warm team ambers held in reserve for team identity.

### Primary
- **Ocean Blue** (accent): primary buttons, links, quiet buttons, the active door and nav item, the selected team tile border, the "Recruitment" product label in the top bar, and every focus ring.
- **Deep Ocean** (accent-hover): primary button hover, and text in info notices on the blue wash.
- **Ocean Wash** (accent-wash): background of the active nav link, the selected team tile, quiet-button hover and info notices.

### Tertiary (team coding only)
- **Solar Amber** (solar), **Electric Gold** (electric), **Combustion Sand** (combustion): the 3px stripe along the bottom edge of each team-choice tile, keyed to the team. They also appear inside the official team logos and the shortmark, but that is the logo artwork's own colour.

### Neutral
- **Light Gray** (paper): the page ground everywhere outside the sign-in panel; the track of the door switch.
- **White** (paper-2): panels, inputs, the top bar, the sign-in panel, secondary buttons, the active door.
- **Mist** (paper-3): disabled fills, secondary-button and nav hover, and the faint row rules inside tables.
- **Deep Ink** (ink): headings, body text, field labels, the photo caption chip and the photo placeholder.
- **Soft Ink** (ink-2): page intro lines, table messages, nav links at rest, hover borders on controls.
- **Slate** (muted): secondary text such as hints, table headers, account names, inactive doors and placeholders. This is the secondary text colour; it passes 4.5:1 on white and Light Gray.
- **Control Gray** (control): 1px borders on inputs, secondary buttons and team tiles (non-text, meets 3:1).
- **Mid Gray** (brand-gray): the brand book's Mid Gray. Decorative only: the divider between the logo and "Recruitment" in the top bar.
- **Rule** (rule): panel borders, table header and bar borders, the "or" divider lines, the outline of the active door.

### Status
- **Error Red** on **Error Wash** (error / error-wash): error notices, field errors, invalid input borders, and the danger button.
- **Pit Green** on **Green Wash** (success / success-wash): success notices.

### Named Rules
**The One Voice Rule.** Ocean Blue is the only colour that means "act here" or "you are here". Nothing else is filled blue.

**The Team Coding Rule.** Solar, Electric and Combustion ambers mark a team and nothing else: never a button, a warning, a highlight or a decorative accent.

**The Mid Gray Rule.** Mid Gray never carries text. It fails contrast; secondary text is Slate.

**The No Burnt Orange Rule.** UT Burnt Orange (#BF5700) and colours near it are trademarked and never appear. The team ambers sit well to the yellow side of it; keep it that way.

## Typography

**Display Font:** Montserrat (with ui-sans-serif, system-ui fallback), loaded at 400 to 700, used at 500 and 600
**Body Font:** Urbanist (with ui-sans-serif, system-ui fallback), loaded at 400 to 600

**Character:** Montserrat's geometric caps-friendly forms carry the brand book's title voice; Urbanist is rounder and lighter for reading, so labels and paragraphs feel approachable next to firm titles.

### Hierarchy
- **Display** (Montserrat 600, 2.074rem, 1.15): the sign-in "Sign in" headline only. Drops to the Headline size below 60rem.
- **Headline** (Montserrat 600, 1.728rem, about 28px, 1.15): the noun title at the top of every app and standalone page ("Admin", "Jobs", "My profile"). Capped at 20ch.
- **Title** (Montserrat 600, 1.2rem, 1.25): section heads inside panels and table heads.
- **Subtitle** (Montserrat 600, 1rem, 1.3): h3 level.
- **Lede** (Urbanist 400, 1.2rem, 1.45): the single sentence under the sign-in headline.
- **Body** (Urbanist 400, 1rem, 1.55): paragraphs and input text, capped at 65ch; page intro lines at 60ch.
- **Small body** (Urbanist 400, 0.875rem): hints, notices, table cells, door notes, captions.
- **Label** (Montserrat 600, 0.875rem, line-height 1): buttons, door options, team names, and the "Recruitment" product label (at 500).
- **Field label** (Urbanist 600, 0.875rem): form labels, legends, table header cells, primary cell text; nav links use this weight and size in ink-2.

Headings use -0.01em tracking and balanced wrapping. Tabular numerals in numeric cells.

### Named Rules
**The Title Case Voice Rule.** Montserrat is set at 600 in sentence case. Uppercase Montserrat is reserved for the RECRUITMENT descriptor inside the lockup artwork, which is never re-typeset in live text.

**The Eurostile Rule.** Eurostile Extended exists only inside the logo files. It is never loaded as a web font.

## Layout

Two layouts, both centred and single-column at their core.

- **App shell:** a sticky white top bar (60px tall, 1px Rule bottom border) holding the primary logo, a Mid Gray divider and "Recruitment", then the nav links, then the account name and a quiet "Sign out" pushed right. There is no sidebar. Content sits in a 76rem column with 24px side padding, 40px above and 96px below. Below 48rem the nav and account collapse into a "Menu" disclosure sheet and padding tightens to 16px.
- **Standalone pages** (Partner access request): the RECRUITMENT lockup at the top of a 40rem column, with no top bar.
- **Sign-in:** a two-column grid at 1.15fr : 1fr, so the photograph takes roughly 54% of the width at full height. The panel column centres its content at a 26rem max width with 40px between lockup, body and footer. Below 60rem the photo becomes a band 32vh tall (max 260px) above the panel.
- **Page head:** noun title, then one line of Soft Ink context, 8px apart, 40px above the first panel.
- **Narrow tasks:** single-task forms cap at 40rem. Two-field rows sit side by side and stack below 40rem; the three team tiles go to one column at the same width.

Spacing runs on a 4px base: 4, 8, 12, 16, 24, 40, 64, 96. Inside panels and forms 16 to 24px is the working rhythm; 40px separates major blocks.

## Elevation & Depth

Flat by default. Panels, tiles, the top bar and the sign-in panel carry no shadow. Depth is tonal and linear: Light Gray ground, white surfaces, 1px Rule borders, and Mist for hover and disabled fills.

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 8px 24px color-mix(in oklab, #0E2A38 14%, transparent)`): only on the mobile menu sheet, the one surface that floats over content.

### Named Rules
**The Flat Surface Rule.** Resting surfaces never cast shadows. A shadow means "this floats above the page" and is reserved for overlays.

## Shapes

Structured approachability: every container and control is a rectangle with a soft corner, never a pill and never a sharp box. Controls, notices and tiles use 8px; panels use 16px; the photo caption chip and focus targets around logos use 6px. Nested shapes add their padding to the inner radius (the door switch track is 12px around 8px options). Borders are 1px; the only thicker mark is the 3px team stripe, which has 2px rounded top corners and is inset 16px from each side of its tile. Photographs fill their area edge to edge with no frame or rounding.

## Components

### Buttons
Firm and compact, set in Montserrat.
- **Shape:** soft rectangle (8px), 40px minimum height, 16px side padding, Label type.
- **Primary:** Ocean Blue fill, white text. One per view; on sign-in it is "Continue with Google" with the Google mark.
- **Hover / Focus / Active:** primary deepens to Deep Ocean; focus is a 2px Ocean Blue outline offset 2px; press nudges 1px down. Transitions are 120ms on the expo-out ease.
- **Secondary:** white fill, Deep Ink text, Control Gray border; hover darkens the border to Soft Ink on Mist.
- **Quiet:** transparent, Ocean Blue text, 8px padding; hover fills Ocean Wash. Used for "Sign out".
- **Danger:** white fill, Error Red text, Control Gray border; hover turns to Error Wash with a red border.
- **Loading:** the pressed submit button swaps to its pending label with a 14px spinning ring and `aria-busy`. Row-action buttons in tables shrink to 34px.

### Inputs / Fields
- **Style:** white fill, 1px Control Gray border, 8px radius, 40px height, 12px side padding, body-size text. Textareas start at 96px and resize vertically.
- **Focus:** 2px Ocean Blue outline flush to the border, border turns Ocean Blue.
- **Error / Disabled:** invalid fields take an Error Red border with a small red message below; disabled and read-only fields go to Mist with Slate text.
- **Labels:** Field-label type above the control, Slate hint line between label and input, "(optional)" in Slate at regular weight.

### Cards / Containers (Panels)
- **Corner Style:** 16px.
- **Background:** white on Light Gray.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px Rule.
- **Internal Padding:** 24px; table panels drop their padding and let the table run edge to edge.

### Notices
Inline, 8px radius, 12px by 16px padding, small body text on a tinted wash: error (red on red wash), success (green on green wash), info (Deep Ocean on Ocean Wash). No icons.

### Tables
Rules and alignment, no bands. Header cells in Field-label weight and Slate over a Rule line; body rows separated by Mist lines; 12px by 24px cell padding; primary cell text in Deep Ink 600 with a Slate second line; numbers right-aligned in tabular figures; actions right-aligned. Below 48rem each row becomes a stacked block and the header hides.

### Navigation
Nav links are 36px tall with 12px side padding and 8px radius, in Soft Ink at 600. Hover fills Mist; the current page fills Ocean Wash with Ocean Blue text. On mobile they move into the Menu sheet.

### The Two-Door Sign-in (signature)
A two-option segmented switch on a Light Gray track (4px padding, 12px radius). Options are 40px Montserrat labels in Slate; the current door becomes a white tile with Ocean Blue text and a 1px Rule outline. Below it, the door's own copy, its primary Google button, and for Partners an "or use your work email" divider (Rule lines either side) above the email magic-link form. The photograph beside it carries a small Deep Ink caption chip, bottom-left, naming the team's car.

### Team Choice Tiles (signature)
Radio tiles in a three-up grid: white, 1px Control Gray border, 8px radius, 16px padding, the official team logo above the team name in Montserrat 600, and the team-colour stripe along the bottom edge. Selected tiles take an Ocean Blue border doubled by a 1px inset ring on Ocean Wash; focus shows the standard 2px outline around the tile.

### Brand Lockup
The RECRUITMENT lockup (LHR logo over the descriptor) heads sign-in at 52px and standalone pages at 44px. The app bar uses the primary logo alone at 22px followed by "Recruitment" in Montserrat 500 Ocean Blue after a Mid Gray divider.

## Do's and Don'ts

### Do:
- **Do** use only the official LHR logo files in `public/brand/`: full colour on light grounds, the white version on dark. Follow the brand book's order: logoblock, then primary or team logo, then the three-stripe shortmark (favicon), then the wordmark.
- **Do** pair any descriptor such as "RECRUITMENT" with the logo, set in Montserrat caps per the brand book's logo-descriptor rule.
- **Do** open every app page with a noun title at Headline size (about 28px) and one line of context.
- **Do** mark teams with their own amber (Solar #FF9404, Electric #FFB526, Combustion #FFC871) and their official team logo, and nowhere else.
- **Do** use real team photographs from the longhornracing.org Solar, Electric and Combustion galleries for imagery.
- **Do** keep every control at least 40px tall with the 2px Ocean Blue focus outline.
- **Do** build tables from 1px rules and alignment.

### Don't:
- **Don't** recolour, crop, fade, outline or re-typeset any logo, and never use a black logo.
- **Don't** use UT Burnt Orange #BF5700 or any colour near it.
- **Don't** write "sponsor" anywhere: copy, URLs, alt text or code. Companies are "Partners".
- **Don't** use "IC" or "EV" in public copy, or "UT Austin's LHR". Teams are Solar, Electric and Combustion (LHRs, LHRe, LHRc); the name is "Longhorn Racing" or "LHR".
- **Don't** set text in Mid Gray #9CADB7; it fails contrast.
- **Don't** put shadows on resting panels, tiles or bars.
- **Don't** use team ambers for buttons, warnings, badges or decoration.
- **Don't** add a sidebar to the app shell.
- **Don't** load Eurostile Extended as a web font.
- **Don't** put eyebrow or kicker labels above titles.
