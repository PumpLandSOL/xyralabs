// Writes brand/kit/X-KIT.md; every tweet must be ≤245 characters.  node _studio/tweets.cjs
'use strict';
const fs = require('fs'), path = require('path');
const len = (t) => [...t].reduce((a, c) => a + (c.codePointAt(0) > 0x10ff ? 2 : 1), 0);
const BIO = 'A post-quantum privacy layer 1. Every transaction shielded. STARK proofs, ML-KEM-768 addresses, CPU proof of work. Privacy that outlives the quantum computer.';
const T = [
  ['Pinned', 'xyra-hype-16s.mp4', `Privacy that outlives the quantum computer.

XYRA is a proof-of-work layer 1 where every transaction is shielded and every part is post-quantum: STARK spend proofs, ML-KEM-768 addresses, Poseidon2 commitments.

No curves. From the first block.`],
  ['Threat (video)', 'xyra-threat-16s.mp4', `Record. Wait. Decrypt.

Anyone can copy a blockchain today and wait for a quantum computer. On that day, the elliptic curves behind today's privacy coins open every payment ever recorded.

XYRA's copy stays sealed.`],
  ['Payment (video)', 'xyra-payment-16s.mp4', `On chain, a payment is a gap.

A nullifier, a note commitment, a 1,088-byte KEM ciphertext and one folded STARK proof.

Never on chain: sender, recipient, amount, which note was spent, or the memo.`],
  ['Threat', 'xyra-g01-threat.png', `A fork can fix theft and inflation. It can't fix privacy.

Once a ledger is copied, the old data is already out there. If it was sealed with elliptic curves, Q-day reads it.

That's why XYRA is post-quantum from the first block.`],
  ['Primitives', 'xyra-g02-primitives.png', `Every curve, replaced:

zk-STARK replaces Groth16 and Halo 2
ML-KEM-768 replaces ECDH stealth addresses
ChaCha20-Poly1305 for notes
Poseidon2 replaces Pedersen
CPU proof of work, no block signatures

Hashes and lattices only.`],
  ['A gap', 'xyra-g03-gap.png', `What a XYRA payment leaves on chain: a nullifier, a commitment, a ciphertext, a proof and a public fee.

What it doesn't: who sent it, who received it, how much moved, or which note was spent.

Every transaction. Not optional.`],
  ['Sizes', 'xyra-g04-sizes.png', `Lasting privacy has a size.

50–200 KB STARK per transaction, before folding
1 proof per block, every tx folded in
~1,900-character addresses, so QR codes
0 trusted setups

Post-quantum costs bytes. We design around it.`],
  ['Vs other chains', 'xyra-g05-vs.png', `How XYRA stacks up against other blockchains.

Zcash: shielding optional, curves underneath
Monero: private by default, curves underneath
Bitcoin, Ethereum, QRL: transparent

XYRA: every box, including after Q-day.`],
];
let md = `# XYRA X kit\n\n## Handle\n\`\`\`\n@XyraLabsL1\n\`\`\`\n\n## Display name\n\`\`\`\nXYRA Labs\n\`\`\`\n\n## Bio (${len(BIO)}/160)\n\`\`\`\n${BIO}\n\`\`\`\n\n## Profile images (brand/x/)\n- Avatar: \`xyra-x-pfp-field.png\` (or \`-bone\` / \`-ink\`)\n- Header: \`xyra-x-banner-rays.png\` (or \`-field\` / \`-split\`)\n\n## Tweets (all ≤245)\n`;
let bad = 0; T.forEach(([title, media, text], i) => { const n = len(text); if (n > 245) { bad++; console.log('TOO LONG', title, n); } md += `\n### ${i + 1}. ${title} · ${n} chars · media: \`${media}\`\n\`\`\`\n${text}\n\`\`\`\n`; console.log(String(n).padStart(4), title); });
if (len(BIO) > 160) { bad++; console.log('BIO TOO LONG', len(BIO)); } else console.log(' bio', len(BIO));
fs.writeFileSync(path.join(__dirname, '..', 'brand', 'kit', 'X-KIT.md'), md); process.exit(bad ? 1 : 0);
