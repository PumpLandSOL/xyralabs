# XYRA Labs

Marketing site for XYRA, a proof-of-work layer 1 where every transaction is shielded and every part is post-quantum: STARK spend proofs, ML-KEM-768 stealth addresses, Poseidon2 commitments and nullifiers, and CPU mining that uses nothing but hashes.

The site is plain HTML, CSS and JavaScript with no build step.

```
xyra-site/
  index.html   page structure and copy
  styles.css   design tokens and layout
  main.js      particle field, scroll choreography, carousel, rays
  favicon.svg  the mark on an ink square
brand/
  xyra-mark.svg, xyra-mark-ink.svg   the mark alone, bone and ink
  xyra-avatar*.svg / *.png           400×400 profile pictures, dark and light
  xyra-icon-*.png                    app icons at 512 and 180
```

The mark is an X built from two bowed rows of squares that swell toward the centre. The wordmark sets "XYRA" in Geist Medium beside it with "Labs" in Geist Mono.

## Run it locally

Serve the `xyra-site` folder with any static server, for example:

```bash
npx serve xyra-site
```

Opening `index.html` straight from disk also works, but the Lenis smooth-scroll script loads from a CDN, so the page falls back to native scrolling when offline.

## Design

Bone monochrome on a near-black canvas: neutral headline words in grey, highlight words, particles and rays in white, text and outlined buttons in bone, with no color anywhere. Type is Geist for display and body and Geist Mono for labels, both from Google Fonts. Everything that moves goes still for visitors who have reduced motion turned on.

## Still to fill in

- The GitHub, X and "Read the design notes" buttons link to `#` until the real URLs exist.
- A social share image and a real domain.
