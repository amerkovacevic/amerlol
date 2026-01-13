# Creating New Apps - Complete Guide

This guide provides step-by-step instructions for creating new mini-apps in the amer.lol platform. Follow this documentation carefully to ensure your app integrates correctly with the routing system, Firestore database, and overall architecture.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Component Structure](#component-structure)
5. [Firestore Integration](#firestore-integration)
6. [Routing System](#routing-system)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Each mini-app in the platform consists of:
- **App Metadata**: Name, description, icon, category, etc. (in `lib/apps/registry.ts`)
- **Main Component**: The primary app interface (in `components/apps/{appId}/`)
- **Settings Component** (Optional): User-specific settings (in `components/apps/{appId}/`)
- **Routing Configuration**: Component mapping (in `lib/apps/components.tsx`)
- **Firestore Rules**: Database security rules (in `firestore.rules`)

---

## Prerequisites

Before creating a new app, ensure you have:
- Understanding of React and TypeScript
- Familiarity with Next.js App Router
- Knowledge of Firestore database structure
- Access to the codebase

---

## Step-by-Step Guide

### Step 1: Create App Directory Structure

Create the following directory structure for your app:

```
components/apps/{appId}/
├── {appId}-main.tsx          # Main app component
└── {appId}-settings.tsx       # Settings component (optional)
```

**Example for a "calculator" app:**
```
components/apps/calculator/
├── calculator-main.tsx
└── calculator-settings.tsx
```

**Important**: Use kebab-case for `appId` (e.g., `time-zone-converter`, not `timeZoneConverter`).

---

### Step 2: Create Main App Component

Create the main component file: `components/apps/{appId}/{appId}-main.tsx`

**Template:**

```tsx
"use client"

import * as React from "react"
import { motion } from "framer-motion"
// Import any UI components you need
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function {AppName}Main() {
  // Your component state and logic here

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold mb-2">Your App Name</h2>
        <p className="text-muted-foreground">
          Brief description of what your app does
        </p>
      </div>

      {/* Your app content here */}
    </motion.div>
  )
}
```

**Key Points:**
- Must be a client component (`"use client"`)
- Export the component with a descriptive name ending in `Main`
- Use `motion.div` for consistent animations
- Follow the existing design patterns from other apps

---

### Step 3: Create Settings Component (Optional but Recommended)

If your app needs user-specific settings, create: `components/apps/{appId}/{appId}-settings.tsx`

**Template:**

```tsx
"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Trash2, Download, Upload, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore"

// Storage key for localStorage fallback
const STORAGE_KEY = "{appId}-settings"

// Define your settings interface
interface {AppName}Settings {
  // Add your settings fields here
  // Example:
  // fontSize: number
  // theme: "light" | "dark" | "auto"
  // autoSave: boolean
}

// Default settings values
const DEFAULT_SETTINGS: {AppName}Settings = {
  // Set default values
  // Example:
  // fontSize: 14,
  // theme: "auto",
  // autoSave: true,
}

export function {AppName}Settings() {
  const { user } = useAuth()
  const [settings, setSettings] = React.useState<{AppName}Settings>(DEFAULT_SETTINGS)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  // Load settings from Firestore
  React.useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const loadSettings = async () => {
      try {
        // Firestore path: users/{userId}/{appId}Settings/default
        const settingsRef = doc(db, "users", user.uid, "{appId}Settings", "default")
        const settingsSnap = await getDoc(settingsRef)
        
        if (settingsSnap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...settingsSnap.data() })
        } else {
          // Load from localStorage as fallback on first login
          const localSaved = localStorage.getItem(STORAGE_KEY)
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved)
              setSettings({ ...DEFAULT_SETTINGS, ...parsed })
              // Migrate to Firestore
              await setDoc(settingsRef, {
                ...DEFAULT_SETTINGS,
                ...parsed,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              })
            } catch (error) {
              console.error("Failed to parse localStorage settings:", error)
            }
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error)
        toast.error("Failed to load settings")
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [user])

  // Update a setting
  const updateSetting = <K extends keyof {AppName}Settings>(
    key: K,
    value: {AppName}Settings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  // Save settings to Firestore
  const saveSettings = async () => {
    if (!user) {
      toast.error("You must be signed in to save settings")
      return
    }

    try {
      const settingsRef = doc(db, "users", user.uid, "{appId}Settings", "default")
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: serverTimestamp(),
      })
      setHasChanges(false)
      toast.success("Settings saved successfully")
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast.error("Failed to save settings")
    }
  }

  // Reset to defaults
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
    setHasChanges(true)
    toast.info("Settings reset to defaults")
  }

  // Clear all data from Firestore
  const clearAllData = async () => {
    if (!user) {
      toast.error("You must be signed in to clear data")
      return
    }

    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      try {
        const settingsRef = doc(db, "users", user.uid, "{appId}Settings", "default")
        await deleteDoc(settingsRef)
        setSettings(DEFAULT_SETTINGS)
        setHasChanges(false)
        toast.success("All data cleared")
      } catch (error) {
        console.error("Failed to clear data:", error)
        toast.error("Failed to clear data")
      }
    }
  }

  // Export settings as JSON
  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "{appId}-settings.json"
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Settings exported successfully")
  }

  // Import settings from JSON file
  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        setSettings({ ...DEFAULT_SETTINGS, ...imported })
        setHasChanges(true)
        toast.success("Settings imported successfully")
      } catch (error) {
        toast.error("Failed to import settings. Invalid file format.")
      }
    }
    reader.readAsText(file)
    // Reset input
    event.target.value = ""
  }

  // Show sign-in prompt if not authenticated
  if (!user) {
    return (
      <div className="p-12 text-center rounded-lg border border-dashed">
        <p className="text-muted-foreground mb-4">
          Please sign in to access settings
        </p>
        <Button asChild>
          <a href="/hub">Sign In</a>
        </Button>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="p-12 text-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Your settings UI here */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Configure your preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add your settings controls here */}
        </CardContent>
      </Card>

      {/* Data Management Card */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Export, import, or clear your settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={exportSettings}>
              <Download className="h-4 w-4 mr-2" />
              Export Settings
            </Button>
            <label>
              <Button variant="outline" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Settings
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                className="hidden"
              />
            </label>
            <Button variant="outline" onClick={resetSettings}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button variant="destructive" onClick={clearAllData}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Changes Button */}
      {hasChanges && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={resetSettings}>
            Cancel
          </Button>
          <Button onClick={saveSettings}>Save Changes</Button>
        </div>
      )}
    </motion.div>
  )
}
```

**Key Points:**
- Always check for user authentication
- Use `serverTimestamp()` for Firestore timestamps
- Implement localStorage fallback for first-time users
- Always merge imported settings with defaults
- Show loading states appropriately

---

### Step 4: Add App to Registry

Edit `lib/apps/registry.ts` and add your app to the `APP_REGISTRY` array:

```typescript
import { 
  Lock,
  GitCompare,
  Globe,
  YourIcon,  // Import your icon from lucide-react
  type LucideIcon
} from "lucide-react"

export const APP_REGISTRY: AppEntry[] = [
  // ... existing apps ...
  {
    appId: "your-app-id",           // Must be kebab-case, unique
    name: "Your App Name",           // Display name
    description: "Brief description", // Shown in cards and listings
    category: "Utilities",            // One of: "Utilities" | "Games" | "Experiments" | "Social" | "Visual"
    tags: ["tag1", "tag2"],          // Array of searchable tags
    status: "live",                   // "live" | "beta" | "comingSoon"
    icon: YourIcon,                   // Lucide React icon component
    accent: "from-color-500 to-color-500", // Tailwind gradient classes
    featured: true,                   // Optional: show on homepage
  },
]
```

**Icon Selection:**
- Use icons from `lucide-react`
- Choose icons that represent your app's function
- Examples: `Calculator`, `Clock`, `FileText`, `Image`, `Music`, etc.

**Accent Colors:**
- Use Tailwind gradient classes: `from-{color}-{shade} to-{color}-{shade}`
- Examples:
  - `"from-blue-500 to-cyan-500"` (blue to cyan)
  - `"from-purple-500 to-pink-500"` (purple to pink)
  - `"from-orange-500 to-red-500"` (orange to red)
  - `"from-green-500 to-emerald-500"` (green to emerald)

---

### Step 5: Register Components in Routing System

Edit `lib/apps/components.tsx` and add your app's components:

```typescript
// 1. Import your components using React.lazy() for code splitting
const YourAppMain = React.lazy(() => 
  import("@/components/apps/your-app-id/your-app-id-main").then(m => ({ default: m.YourAppMain }))
)
const YourAppSettings = React.lazy(() => 
  import("@/components/apps/your-app-id/your-app-id-settings").then(m => ({ default: m.YourAppSettings }))
)

// 2. Add to APP_COMPONENTS registry
const APP_COMPONENTS: Record<string, AppComponents> = {
  // ... existing apps ...
  "your-app-id": {
    Main: YourAppMain,
    Settings: YourAppSettings,  // Optional: omit if no settings
  },
}
```

**Important Notes:**
- The `appId` in the registry must match exactly (case-sensitive)
- Use `React.lazy()` for all imports to enable code splitting
- The import path must match your file structure exactly
- Component names must match your exports

**If your app doesn't have settings:**
```typescript
"your-app-id": {
  Main: YourAppMain,
  // Settings is optional - omit if not needed
},
```

---

### Step 6: Update Firestore Security Rules

Edit `firestore.rules` and add rules for your app's settings subcollection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // ... existing subcollections ...
      
      // Your app settings subcollection
      // Document structure: /users/{userId}/{appId}Settings/{settingsId}
      match /{appId}Settings/{settingsId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

**Important:**
- Replace `{appId}Settings` with your actual appId + "Settings" (e.g., `calculatorSettings`)
- Use PascalCase for the subcollection name: `{appId}Settings`
- The rule ensures users can only access their own settings
- Always use `request.auth.uid == userId` for security

**Example for "calculator" app:**
```javascript
match /calculatorSettings/{settingsId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## Component Structure

### Main Component Requirements

Your main component should:
- Be a client component (`"use client"`)
- Export a named export (not default)
- Use `motion.div` for animations
- Follow the existing design patterns
- Be responsive and work in both light/dark modes

### Settings Component Requirements

Your settings component should:
- Check for user authentication
- Load settings from Firestore on mount
- Provide localStorage fallback
- Use `serverTimestamp()` for timestamps
- Implement export/import functionality
- Show loading states
- Handle errors gracefully

---

## Firestore Integration

### Database Structure

Your app's settings are stored in Firestore with this structure:

```
users/
  {userId}/
    {appId}Settings/
      default/
        {
          // Your settings fields
          fontSize: 14,
          theme: "auto",
          // ...
          createdAt: Timestamp,
          updatedAt: Timestamp
        }
```

### Firestore Path Pattern

```typescript
// Settings document reference
const settingsRef = doc(
  db, 
  "users", 
  user.uid, 
  "{appId}Settings",  // Subcollection name
  "default"            // Document ID (always "default" for single settings doc)
)
```

### Timestamp Usage

Always use `serverTimestamp()` for Firestore timestamps:

```typescript
import { serverTimestamp } from "firebase/firestore"

await setDoc(settingsRef, {
  ...settings,
  updatedAt: serverTimestamp(),  // ✅ Correct
  // createdAt: new Date(),     // ❌ Wrong - don't use client-side Date
})
```

### Error Handling

Always wrap Firestore operations in try-catch:

```typescript
try {
  await setDoc(settingsRef, settings)
  toast.success("Settings saved")
} catch (error) {
  console.error("Failed to save:", error)
  if (error.code === "permission-denied") {
    toast.error("Permission denied")
  } else {
    toast.error("Failed to save settings")
  }
}
```

---

## Routing System

### How Routing Works

1. **Static Generation**: `generateStaticParams()` in `app/(hub)/a/[appId]/page.tsx` generates routes for all apps
2. **Component Lookup**: `AppPageClient` looks up the app in the registry
3. **Component Resolution**: `getAppComponents()` retrieves the component mapping
4. **Lazy Loading**: Components are loaded on-demand using React.lazy()
5. **Rendering**: `renderApp()` wraps components in Suspense and AppShellLayout

### Route Structure

- **URL Pattern**: `/a/{appId}/`
- **File**: `app/(hub)/a/[appId]/page.tsx`
- **Client Component**: `app/(hub)/a/[appId]/app-page-client.tsx`

### Adding New Routes

The routing is automatic once you:
1. Add app to `APP_REGISTRY`
2. Register components in `APP_COMPONENTS`
3. Rebuild the application

No manual route configuration needed!

---

## Best Practices

### 1. Naming Conventions

- **appId**: Use kebab-case (e.g., `time-zone-converter`)
- **Component Files**: Use kebab-case (e.g., `time-zone-converter-main.tsx`)
- **Component Names**: Use PascalCase (e.g., `TimeZoneConverterMain`)
- **Firestore Subcollection**: Use PascalCase + "Settings" (e.g., `timeZoneConverterSettings`)

### 2. Code Organization

- Keep app-specific code in `components/apps/{appId}/`
- Share common utilities in `lib/`
- Use UI components from `components/ui/`
- Follow existing patterns from other apps

### 3. State Management

- Use React hooks for local state
- Use Firestore for persistent user data
- Use localStorage as fallback only
- Always migrate localStorage to Firestore on first login

### 4. Error Handling

- Always wrap async operations in try-catch
- Show user-friendly error messages
- Log errors to console for debugging
- Handle Firestore permission errors specifically

### 5. Performance

- Use `React.lazy()` for code splitting
- Minimize bundle size
- Optimize re-renders with `useMemo` and `useCallback`
- Load data on-demand, not all at once

### 6. Accessibility

- Use semantic HTML
- Provide ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers

### 7. Testing

- Test in both light and dark modes
- Test with and without authentication
- Test Firestore operations
- Test error scenarios

---

## Complete Example: Creating a "Calculator" App

Let's walk through creating a complete calculator app:

### 1. Create Directory
```
components/apps/calculator/
```

### 2. Create Main Component
`components/apps/calculator/calculator-main.tsx`:
```tsx
"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function CalculatorMain() {
  const [display, setDisplay] = React.useState("0")
  // ... calculator logic ...

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold mb-2">Calculator</h2>
        <p className="text-muted-foreground">
          A simple calculator utility
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Calculator UI */}
        </CardContent>
      </Card>
    </motion.div>
  )
}
```

### 3. Create Settings Component
`components/apps/calculator/calculator-settings.tsx`:
```tsx
"use client"

import * as React from "react"
// ... (use the settings template from Step 3)
// Replace {AppName} with Calculator
// Replace {appId} with calculator
```

### 4. Add to Registry
`lib/apps/registry.ts`:
```typescript
import { Calculator } from "lucide-react"

export const APP_REGISTRY: AppEntry[] = [
  // ... existing apps ...
  {
    appId: "calculator",
    name: "Calculator",
    description: "A simple calculator utility",
    category: "Utilities",
    tags: ["calculator", "math", "utility"],
    status: "live",
    icon: Calculator,
    accent: "from-indigo-500 to-purple-500",
    featured: true,
  },
]
```

### 5. Register Components
`lib/apps/components.tsx`:
```typescript
const CalculatorMain = React.lazy(() => 
  import("@/components/apps/calculator/calculator-main").then(m => ({ default: m.CalculatorMain }))
)
const CalculatorSettings = React.lazy(() => 
  import("@/components/apps/calculator/calculator-settings").then(m => ({ default: m.CalculatorSettings }))
)

const APP_COMPONENTS: Record<string, AppComponents> = {
  // ... existing apps ...
  calculator: {
    Main: CalculatorMain,
    Settings: CalculatorSettings,
  },
}
```

### 6. Update Firestore Rules
`firestore.rules`:
```javascript
match /calculatorSettings/{settingsId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### 7. Rebuild
```bash
npm run build
```

---

## Troubleshooting

### Issue: App not showing in hub

**Solutions:**
- Verify app is in `APP_REGISTRY`
- Check `appId` is unique and kebab-case
- Ensure `status` is "live" (not "comingSoon")
- Rebuild the application

### Issue: Route 404 error

**Solutions:**
- Verify `generateStaticParams()` includes your app
- Check `appId` matches exactly in registry and components
- Clear `.next` cache and rebuild
- Ensure route is `/a/{appId}/` (with trailing slash if `trailingSlash: true`)

### Issue: Component not loading

**Solutions:**
- Verify component is exported correctly
- Check import path in `components.tsx` is correct
- Ensure component name matches export name
- Check browser console for lazy loading errors

### Issue: Firestore permission denied

**Solutions:**
- Verify Firestore rules are updated
- Check subcollection name matches exactly (case-sensitive)
- Ensure user is authenticated
- Verify `request.auth.uid == userId` in rules

### Issue: Settings not saving

**Solutions:**
- Check user is authenticated
- Verify Firestore path is correct
- Check for JavaScript errors in console
- Ensure `serverTimestamp()` is used, not `new Date()`

### Issue: Build fails with static params error

**Solutions:**
- Verify `generateStaticParams()` is async
- Check `APP_REGISTRY` is not empty
- Ensure all imports in registry are valid
- Clear `.next` and `out` directories
- Rebuild from scratch

---

## Checklist

Before considering your app complete, verify:

- [ ] App directory created with correct structure
- [ ] Main component created and exported
- [ ] Settings component created (if needed)
- [ ] App added to `APP_REGISTRY` with all required fields
- [ ] Components registered in `APP_COMPONENTS`
- [ ] Firestore rules updated for settings subcollection
- [ ] All imports use `React.lazy()` for code splitting
- [ ] Component names match exports exactly
- [ ] `appId` is consistent across all files
- [ ] Firestore paths use correct subcollection names
- [ ] Settings use `serverTimestamp()` for timestamps
- [ ] Error handling implemented
- [ ] Loading states shown
- [ ] Authentication checks in place
- [ ] Tested in light and dark modes
- [ ] Tested with and without authentication
- [ ] Application rebuilds successfully
- [ ] App appears in hub
- [ ] App route works correctly
- [ ] Settings save and load correctly

---

## Additional Resources

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
- [React Lazy Loading](https://react.dev/reference/react/lazy)
- [Lucide Icons](https://lucide.dev/icons/)
- [Tailwind CSS Gradients](https://tailwindcss.com/docs/gradient-color-stops)

---

## Support

If you encounter issues not covered in this guide:
1. Check existing apps for reference implementations
2. Review the troubleshooting section
3. Check browser console for errors
4. Verify all steps were followed correctly
5. Ensure code follows TypeScript best practices

---

**Last Updated**: January 2025
**Version**: 1.0
