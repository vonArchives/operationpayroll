# JPMC Payroll Login Design System

## Visual Theme & Atmosphere
- Mood: professional_minimal
- Feel: Clean, confident, corporate, authoritative
- References: Enterprise admin dashboards, ISO certification body websites, premium SaaS login screens

## Color Palette & Roles
- Background: #0F172A (Sidebar deep blue)
- Surface: #FFFFFF (Login card, logo container)
- Text primary: #0F172A (Headings, labels)
- Text secondary: #64748B (Placeholders, descriptions)
- Accent: #3C82F6 (Primary blue - buttons, links, focus states)
- Accent hover: #2563EB (Darker blue for hover)
- Error: #CF2E2E (Validation errors)
- Sidebar text: #FFFFFF (White on blue sidebar)
- Sidebar muted: rgba(255,255,255,0.65) (Secondary text on sidebar)
- Divider: rgba(255,255,255,0.40) (Sidebar separator)

## Typography Rules
- Display: Jost, 700, 22px (Company name, page title)
- Body: Jost, 400, 15px/1.6 (Form inputs, descriptions)
- Label: Jost, 600, 11px, uppercase, tracking-[0.1em] (Field labels)
- Tagline: Jost, 600, 15px, uppercase, tracking-[0.08em] ("We Build Your Edge")
- Mono: JetBrains Mono, 400, 0.875rem (Error codes, optional)

## Component Stylings
- Buttons: rounded-md, accent bg (#3C72FC), white text, uppercase, tracking-wide, hover:-translate-y-px, hover:shadow-lg
- Cards: white bg, rounded-2xl, shadow-xl, border border-gray-100, backdrop-blur if over image
- Inputs: h-[50px], white bg, gray-200 border, 15px text, rounded-md, focus:border-accent, Mail/Lock icons left, Eye toggle right
- Logo container: white bg, rounded-2xl, shadow-lg, 80x80px
- Error text: text-[13px], font-medium, text-[#CF2E2E], mt-1.5

## Layout Principles
- Split layout: 340px sidebar (left) + flex-1 panel (right)
- Sidebar: Blue (#3C72FC) with grid pattern overlay, building skyline silhouette at bottom
- Right panel: Full-bleed background image (mainpanel.jpg) with white login card centered
- Card max-width: 440px, padding: p-8 md:p-10
- Mobile: Sidebar hidden, blue header with logo + company name

## Depth & Elevation
- Shadows: subtle to moderate (shadow-sm for logo, shadow-lg for card, hover:shadow-xl for button)
- Card: shadow-xl + border for clear separation from background
- Button hover: translateY(-1px) + shadow increase for tactile feedback
- No decorative shadows unless functional

## Do's and Don'ts
- DO use the declared blue (#3C72FC) exclusively for interactive elements
- DO maintain consistent 22px field spacing (mb-[22px])
- DO ensure all text meets WCAG AA contrast ratio
- DON'T invent colors outside the palette
- DON'T add decorative shadows unless for functional elevation
- DON'T use more than 2 typefaces (Jost for everything, JetBrains Mono optional)

## Responsive Behavior
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
- Mobile (<768px): Single column, blue header, stacked layout, pt-32 for header clearance
- Tablet (768px+): Two-column layout, sidebar visible
- Desktop: Full layout with max-width constraints
- Card: Full-width on mobile, max-w-[440px] on desktop

## Agent Prompt Guide
- Do NOT invent colors outside this palette
- Do NOT add box-shadows unless specified above
- Accent color (#3C72FC) appears maximum 3 times per viewport (sidebar bg, button, focus states)
- All interactive elements need :focus-visible outline
- Shake animation on validation failure (420ms)
- Loading state: Loader2 spinner + "Signing in…" text
- Do NOT use gradients
- Do NOT use stock photos other than mainpanel.jpg
