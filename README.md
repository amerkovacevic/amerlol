# amer.lol

A premium, playful hub website for hosting multiple mini-apps. Built with Next.js 14+, TypeScript, Tailwind CSS, and modern web technologies.

## 🚀 Features

- **Modern Stack**: Next.js 14+ with App Router, TypeScript, Tailwind CSS
- **Design System**: shadcn/ui components with custom design tokens
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Smooth Scrolling**: Lenis for buttery smooth scroll experience
- **Dark Mode**: System-aware dark/light mode with next-themes
- **App Registry**: Centralized system for managing mini-apps
- **Responsive**: Mobile-first design that works on all devices
- **Accessible**: Built with accessibility in mind

## 📦 Tech Stack

- **Framework**: Next.js 16 (App Router, static export)
- **Language**: TypeScript
- **Backend**: Firebase Auth and Firestore
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI primitives)
- **Animations**: Framer Motion
- **Smooth Scroll**: Lenis
- **Maps**: MapLibre GL
- **Icons**: Lucide React
- **Theme**: next-themes
- **Toasts**: Sonner
- **Validation**: Zod (app settings)
- **Testing**: Vitest, Testing Library, Firestore emulator

## 🛠️ Getting Started

### Prerequisites

- Node.js 22+
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd amerlol
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
amerlol/
├── app/                        # Next.js App Router
│   ├── (marketing)/            # Landing page (smooth scroll)
│   ├── (site)/                 # Pages sharing the background and header
│   │   ├── a/[appId]/page.tsx  # Every hub app, statically generated
│   │   ├── hub/                # App gallery
│   │   ├── about/  account/  styleguide/
│   ├── not-found.tsx           # The Lost & Found 404 page
│   ├── layout.tsx              # Providers (theme, auth, accent colour)
│   └── globals.css
├── components/
│   ├── apps/                   # One folder per app, plus the shared shell and settings panel
│   ├── auth/  account/  hub/  landing/  layout/  not-found/
│   └── ui/                     # shadcn/ui primitives
├── lib/
│   ├── apps/
│   │   ├── registry.ts         # App metadata (name, category, tags…)
│   │   ├── components.tsx      # appId → lazily loaded components
│   │   ├── settings.ts         # Zod schemas for every app's preferences
│   │   └── *.ts                # Pure, tested app logic (codecs, gauntlet, team picker…)
│   ├── hooks/                  # useAsync, useNow, useHydrated, useResettableState
│   ├── browser.ts  storage.ts  # Clipboard/download and safe localStorage helpers
│   └── firebase/               # Firebase setup and user-facing error messages
├── tests/                      # Vitest and node:test suites
└── public/data/                # Static datasets (Deepcuts, countries, teams)
```

## 📝 Adding a New App

1. Add metadata to `APP_REGISTRY` in `lib/apps/registry.ts`:

```typescript
{
  appId: "code-editor",
  name: "Code Editor",
  description: "A minimalist code editor in the browser",
  category: "Utilities", // "Utilities" | "Games" | "Experiments" | "Social" | "Visual"
  tags: ["code", "editor", "developer"],
  status: "live", // "live" | "beta" | "comingSoon"
  accent: "from-purple-500 to-pink-500", // Tailwind gradient classes
  featured: true, // Optional: feature on the landing page
}
```

2. Describe its preferences in `SETTINGS` in `lib/apps/settings.ts` (the Settings tab is generated from the
   schema), then run `npm run generate:settings-rules` to update the Firestore rules.
3. Build the app in `components/apps/<app-id>/` and register its main component in `lib/apps/components.tsx`.
   Each app is its own lazily loaded chunk, so heavy libraries only load on that app's page.

Type checking fails until every registry entry has components and settings. See
[docs/creating-new-apps.md](docs/creating-new-apps.md) for the full guide.

## ✅ Checks

```bash
npm run check:foundation  # settings rules, formatting, lint, types, tests, dataset validation, build
npm run test:rules        # Firestore rules against the emulator (Java 21+)
npm run format            # apply Prettier
```

## 🎨 Design System

### Colors

- **Accent**: five selectable palettes (teal by default), chosen in Account Settings and synced to the account
- All colors are CSS variables in `app/globals.css`, derived from the accent hue

### Typography

- **Display Font**: Space Grotesk (headings)
- **Body Font**: Inter (paragraphs)
- Configured via `next/font` in `app/layout.tsx`

### Components

All UI components follow shadcn/ui patterns and are located in `components/ui/`. Custom components extend these base components.

## 🎭 Animations

- **Page Transitions**: Framer Motion layout animations
- **Micro-interactions**: Hover effects, button animations
- **Smooth Scrolling**: Lenis (landing page only)
- **Background Effects**: Subtle gradients and grid
- **Reduced motion**: respected globally through `MotionConfig` and CSS media queries

## 🌙 Dark Mode

Dark mode is enabled by default and follows system preferences. Users can toggle it via the theme toggle in the header.

## 📱 Routes

- `/` - Landing page with hero, featured apps, and sections
- `/hub` - App gallery with filtering and search
- `/a/[appId]` - Dynamic app shell pages
- `/about` - About page with build log
- `/styleguide` - Design system showcase

## 🔧 Configuration

### Tailwind CSS

Configuration in `tailwind.config.ts`. Uses CSS variables for theming.

### Next.js

Configuration in `next.config.js`: static export (`out/`) with trailing slashes, deployed to Firebase Hosting.

## 📄 License

See LICENSE file for details.

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

---

Built with ❤️ using Next.js and modern web technologies.