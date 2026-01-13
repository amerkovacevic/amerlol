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

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI primitives)
- **Animations**: Framer Motion, Motion One
- **Smooth Scroll**: Lenis
- **Animations**: Rive (placeholder), Lottie-react (placeholder)
- **Icons**: Lucide React
- **Theme**: next-themes
- **Toasts**: Sonner

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ 
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
├── app/                    # Next.js App Router pages
│   ├── (marketing)/       # Marketing routes (landing page)
│   ├── (hub)/            # Hub routes (hub, app pages)
│   ├── about/            # About page
│   ├── styleguide/       # Styleguide page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/           # React components
│   ├── layout/          # Layout components (header, footer, nav)
│   ├── hub/             # Hub-specific components
│   ├── landing/         # Landing page components
│   ├── apps/            # App shell components
│   ├── fx/              # Animation/effect components
│   └── ui/              # shadcn/ui components
├── lib/                 # Utility functions and configs
│   ├── apps/
│   │   └── registry.ts  # App registry (IMPORTANT)
│   └── utils.ts         # Utility functions
└── public/              # Static assets
    ├── rive/           # Rive animation files (placeholder)
    └── lottie/         # Lottie animation files (placeholder)
```

## 📝 Adding a New App

To add a new mini-app to the hub:

1. Open `lib/apps/registry.ts`

2. Add a new entry to the `APP_REGISTRY` array:

```typescript
{
  appId: "your-app-id",
  name: "Your App Name",
  description: "A brief description of your app",
  category: "Utilities" | "Games" | "Experiments" | "Social" | "Visual",
  tags: ["tag1", "tag2"],
  status: "live" | "beta" | "comingSoon",
  icon: YourIcon, // Import from lucide-react
  accent: "from-blue-500 to-cyan-500", // Tailwind gradient classes
  featured: true, // Optional: feature on landing page
}
```

3. The app will automatically appear in:
   - The Hub page (filterable, searchable)
   - The Featured Apps section on the landing page (if `featured: true`)
   - Accessible via `/a/your-app-id`

### Example

```typescript
import { Code2 } from "lucide-react"

{
  appId: "code-editor",
  name: "Code Editor",
  description: "A minimalist code editor in the browser",
  category: "Utilities",
  tags: ["code", "editor", "developer"],
  status: "live",
  icon: Code2,
  accent: "from-purple-500 to-pink-500",
  featured: true,
}
```

## 🎨 Design System

### Colors

- **Primary**: Electric sky-blue (`hsl(199, 89%, 48%)`)
- **Background**: Clean white base (light) / Deep dark (dark mode)
- All colors defined in `app/globals.css` using CSS variables

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
- **Background Effects**: Subtle animated gradients
- **Rive**: Placeholder component (add Rive files to `public/rive/`)
- **Lottie**: Placeholder component (add Lottie JSON to `public/lottie/`)

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

Configuration in `next.config.js`. No special configuration needed for basic usage.

## 📄 License

See LICENSE file for details.

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

---

Built with ❤️ using Next.js and modern web technologies.