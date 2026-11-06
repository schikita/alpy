# Rule: Creative Landing Page Design & Layout (Vanilla HTML/CSS/JS)

## Tech Stack (strict)
- Write ONLY in **plain HTML, CSS and JavaScript (vanilla)**.
- NO frameworks or libraries: no React, Vue, Svelte, Angular, jQuery, Tailwind, Bootstrap,
  SCSS build chains, bundlers or npm dependencies.
- Project structure: `index.html`, `style.css` (or a `css/` folder), `script.js` (or a `js/` folder),
  plus an `assets/` folder. It must work by simply opening `index.html` in a browser.
- Use modern native web APIs instead of libraries:
  - CSS: custom properties, `clamp()`, grid, flexbox, `clip-path`, `mask`, `mix-blend-mode`,
    `backdrop-filter`, `@property`, `@keyframes`, scroll-driven animations
    (`animation-timeline: scroll() / view()`), `scroll-snap`, container queries, `:has()`.
  - JS: `IntersectionObserver`, `requestAnimationFrame`, Web Animations API (`element.animate()`),
    View Transitions API, Canvas 2D, raw WebGL / GLSL shaders, `pointer` events, `ResizeObserver`.
  - SVG: path morphing, stroke-dash drawing, filters (`feTurbulence`, `feDisplacementMap`).
- Custom helpers (smooth scroll with lerp, text splitting, magnetic buttons, cursor follower, etc.)
  must be written by hand as small, clean, reusable ES modules or functions.
- Fonts via Google Fonts / Fontshare `<link>` or local `@font-face` only.

## Main Principle
Every landing page must create a "wow" effect within the first seconds. Do not make
"yet another template landing page". Aim for Awwwards SOTD / FWA / CSSDA level: a unique idea,
refined typography, smooth animation, attention to detail. If the result can be mistaken for a
generic template, redo it.

## 1. Concept First, Code Second
Before coding, briefly (5-10 lines) state and show the user:
- **Big idea**: one metaphor or image the whole site is built on
  (e.g. "product as a spaceship", "brand as a musical instrument").
- **Mood**: 3-5 adjectives (bold, airy, cinematic, playful...).
- **Signature moment**: one memorable feature (unusual hero, scroll storytelling, interactive
  object, custom cursor, shader background).
- **Design system**: palette, 2 fonts, grid, motion rules (easing, durations).
If the user gave no references, choose a bold direction yourself, not the safest one.

## 2. References and Inspiration
Draw on the principles of the best sites (Awwwards, Godly, Siteinspire, Lapa Ninja, Dribbble,
Behance; studios like Active Theory, Locomotive, Resn, Immersive Garden, Makemepulse; product
pages of Apple, Stripe, Linear, Vercel, Arc, Teenage Engineering).
- Take **principles**: rhythm, composition, timing, techniques. Never copy code, assets, copy
  text or brand elements from other sites.
- Combine techniques from different sources to create something new, not a clone.

## 3. Composition and Layout
- Break the standard grid: asymmetry, layered overlaps, elements bleeding out of containers,
  diagonals, unexpected proportions.
- Use scale contrast: huge headings (`clamp(4rem, 12vw, 14rem)`) next to tiny text.
- Generous negative space and a clear visual hierarchy: one main focal point per screen.
- Non-standard sections: horizontal scroll, sticky storytelling, pinned scenes (via
  `position: sticky`), bento grids, stacked cards, clip-path cuts and masks, sections of
  different shapes, background color changes on scroll.
- The hero must be an event: not "heading + button + image on the right".
- Avoid "3 icons in a row", identical cards, and plain zigzag image/text blocks without a
  creative rethink.

## 4. Typography
- Choose expressive fonts (variable fonts preferred): a contrasting display + text pair.
  Do not use Inter/Roboto/Arial as the expressive font.
- Treat type as graphics: split text into letters/words/lines (own JS splitter) with reveal
  animations, outline text, marquees, variable font axes (`wght`, `wdth`), negative tracking on
  large headings, mixed fonts within a line.
- Fluid typography with `clamp()`; tune line-height separately for headings.

## 5. Color, Light, Materials
- Define a cohesive palette: 1 dominant, 1-2 supporting, 1 accent color, all as CSS variables.
- Techniques: mesh gradients (layered `radial-gradient`), grain/noise (SVG `feTurbulence` or
  canvas), restrained glassmorphism, glow, colored soft shadows, highlights,
  `mix-blend-mode`, color inversion under the cursor.
- Design dark and light themes deliberately, not by simple inversion.
- Text contrast: WCAG AA minimum.

## 6. Animation and Motion Design
Animation must tell a story and guide the eye, not just decorate.
- **Mandatory elements**:
  - Preloader or an impressive intro, when justified.
  - Staggered reveals with carefully chosen delays.
  - Multi-layer parallax with different speeds.
  - Scroll animations: sticky scenes, scroll-linked progress, scene changes, progress indicators.
  - Micro-interactions: magnetic buttons, hover reveal/morph, custom cursor, image hover
    effects (distortion, zoom, mask).
  - Smooth transitions between sections (and pages via View Transitions where suitable).
- **Timing**: expressive easing (custom `cubic-bezier`, `linear()` easing for spring/bounce),
  never plain `linear` or default `ease`. Durations: micro 0.2-0.4s, sections 0.8-1.4s.
- Animate only `transform` and `opacity` (and carefully `clip-path`, `filter`). Never animate
  width/height/top/left. Use `will-change` sparingly.
- Keep one consistent "directorial rhythm": a single set of easings and durations in CSS variables.
- Run scroll/mouse effects inside `requestAnimationFrame`; use passive listeners; throttle
  where needed.

## 7. Visual Content
- Avoid bland stock photos. Prefer: vector illustrations, shaders, generative patterns on
  canvas/SVG, SVG morphing, gradient shapes, optimized video backgrounds, CSS 3D transforms.
- Placeholders must look good too (gradients, abstract shapes), not gray rectangles.
- Icons/SVG: consistent style and stroke width.

## 8. Performance and Accessibility (non-negotiable)
Beauty must not break the site:
- Respect `prefers-reduced-motion`: disable or simplify heavy animations.
- Lighthouse Performance >= 85 on mobile, LCP < 2.5s, CLS < 0.1.
- Lazy-load heavy assets, use WebP/AVIF and compressed video, `font-display: swap`.
- WebGL/canvas: fallback for weak devices or no WebGL support, cap `devicePixelRatio` at 2,
  pause rendering when off-screen or tab hidden.
- Semantic HTML, visible focus states, alt texts, full keyboard navigation. A custom cursor
  must not harm accessibility (keep the native cursor on touch and for reduced motion).
- Key content must remain visible even if JS fails or animations do not run.

## 9. Responsiveness
- Mobile-first, but with a purpose-designed mobile composition, not a shrunken desktop.
- Test breakpoints: 360, 768, 1024, 1440, 1920+.
- Touch devices: replace hover effects with tap/scroll reactions (`@media (hover: hover)`).

## 10. Anti-patterns (avoid)
- Cliche "purple-blue" gradients and generic SaaS landing look.
- Identical cards with default icons, rounded corners and drop shadows.
- Animation for animation's sake that hurts readability and conversion.
- Effect overload: one hero effect per screen, the rest only supports it.
- Copying other people's code or assets.
- Weak CTA: the call to action must be prominent and repeated at key scroll points.

## 11. Workflow
1. Propose the concept (section 1) and wait for approval, or proceed immediately if the user
   says "your call".
2. Set up design tokens (colors, fonts, spacing, easing) as CSS variables in one place.
3. Build the HTML structure and hero first, then the remaining sections.
4. Add animations in stages: basic first, then signature effects.
5. Check performance, accessibility and the mobile version.
6. Finish by briefly listing the techniques used and suggesting ways to push it further.

## Final Criterion
Ask yourself: "Would a designer want to submit this site to Awwwards or show it to friends?"
If not, strengthen the concept, typography or motion and repeat.