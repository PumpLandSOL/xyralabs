# XYRA Labs

Marketing site for XYRA, a proof-of-work layer 1 where every transaction is shielded and every part is post-quantum: STARK spend proofs, ML-KEM-768 stealth addresses, Poseidon2 commitments and nullifiers, and CPU mining that uses nothing but hashes.

The site is plain HTML, CSS and JavaScript with no build step.

```
xyra-site/
  index.html   page structure and copy
  styles.css   design tokens and layout
  main.js      particle field, scroll choreography, carousel, rays
  favicon.svg, favicon.ico              the mark on an ink square; the .ico carries pixel-snapped 16 and 32
  apple-touch-icon.png, icon-*.png      home-screen and install icons, listed in site.webmanifest
  og.png       1200×630 share image for link previews
brand/
  xyra-mark.svg, xyra-mark-ink.svg   the mark alone, bone and ink
  xyra-avatar*.svg / *.png           400×400 profile pictures, dark and light
  xyra-icon-*.png                    app icons at 512 and 180
  x/                                 X profile assets: banners at 1500×500, profile pictures at 800×800,
                                     and a preview sheet showing them in the desktop and phone crops
```

The mark is an X built from two bowed rows of squares that swell toward the centre. The wordmark sets "XYRA" in Archivo Medium at 118% width beside it with "Labs" in Geist Mono.

On load the hero's dot field assembles into the mark, holds it, then disperses into the marble field as the headline wipes in. The threat section plays a three-beat scene: a payment is recorded as ciphertext, the years tick past, and it is read, while the XYRA copy beside it stays sealed. The payment card's ledger refreshes like a feed, the comparison leads with the Q-day verdict, and the roadmap is one rail with the live phase pulsing.

## Run it locally

Serve the `xyra-site` folder with any static server, for example:

```bash
npx serve xyra-site
```

Opening `index.html` straight from disk also works, but the Lenis smooth-scroll script loads from a CDN, so the page falls back to native scrolling when offline.

## Design

Bone monochrome on a near-black canvas: neutral headline words in grey, highlight words, particles and rays in white, text and outlined buttons in bone, with no color anywhere. Type is Archivo for display (wide) and body (normal width) and Geist Mono for labels, both from Google Fonts. Everything that moves goes still for visitors who have reduced motion turned on.

## Still to fill in

- The GitHub, X and "Read the design notes" buttons link to `#` until the real URLs exist.
- The real domain: `index.html` uses `https://xyralabs.example` in the canonical, Open Graph and Twitter tags until there is one. Link previews need absolute URLs, so swap it before deploying.
- The X handle, for a `twitter:site` tag.
