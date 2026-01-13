# Documentation Index

Welcome to the amer.lol platform documentation. This directory contains comprehensive guides for developing and maintaining mini-apps on the platform.

## Available Documentation

### [Creating New Apps](./creating-new-apps.md)
**Complete guide for creating new mini-apps**

This is the main guide you should follow when creating a new app. It covers:
- Step-by-step app creation process
- Component structure and requirements
- Routing system integration
- Firestore database setup
- Best practices and patterns
- Complete examples
- Troubleshooting guide

**Start here if:** You're creating a new app for the platform.

---

### [Firestore Database Structure](./firestore-structure.md)
**Complete Firestore database documentation**

Comprehensive documentation of the Firestore database structure, including:
- Complete database schema
- Collection and subcollection patterns
- Security rules
- Data operations (read, write, update, delete)
- Best practices
- Migration guides
- Validation patterns

**Start here if:** You need to understand the database structure or add new settings.

---

## Quick Start

### Creating Your First App

1. **Read** [Creating New Apps Guide](./creating-new-apps.md)
2. **Follow** the step-by-step instructions
3. **Reference** [Firestore Structure](./firestore-structure.md) for database setup
4. **Test** your app thoroughly
5. **Deploy** and verify in production

### Common Tasks

#### Add a New App
→ See [Creating New Apps - Step-by-Step Guide](./creating-new-apps.md#step-by-step-guide)

#### Add Settings to an App
→ See [Creating New Apps - Step 3: Settings Component](./creating-new-apps.md#step-3-create-settings-component-optional-but-recommended)

#### Update Firestore Rules
→ See [Firestore Structure - Security Rules](./firestore-structure.md#security-rules)

#### Fix Routing Issues
→ See [Creating New Apps - Troubleshooting](./creating-new-apps.md#troubleshooting)

---

## Architecture Overview

### App Structure

```
app/
  (hub)/
    a/
      [appId]/
        page.tsx              # Static route generation
        app-page-client.tsx   # Client-side routing

components/
  apps/
    {appId}/
      {appId}-main.tsx       # Main app component
      {appId}-settings.tsx   # Settings component (optional)

lib/
  apps/
    registry.ts              # App metadata registry
    components.tsx           # Component routing registry
```

### Data Flow

```
User Request
  ↓
Static Route (/a/{appId}/)
  ↓
generateStaticParams() → APP_REGISTRY
  ↓
AppPageClient
  ↓
getAppById() → APP_REGISTRY
  ↓
getAppComponents() → APP_COMPONENTS
  ↓
React.lazy() → Load Component
  ↓
Render App
```

### Firestore Structure

```
users/
  {userId}/
    (user profile data)
    {appId}Settings/
      default/
        (app settings)
```

---

## Key Concepts

### App Registry
- Centralized metadata for all apps
- Defines appId, name, description, icon, etc.
- Used for static route generation
- Located in `lib/apps/registry.ts`

### Component Registry
- Maps appId to React components
- Uses lazy loading for code splitting
- Handles settings component mapping
- Located in `lib/apps/components.tsx`

### Routing System
- Automatic route generation from registry
- Dynamic component loading
- Supports apps with or without settings
- Handles missing apps gracefully

### Firestore Security
- User-scoped data (users can only access their own)
- Subcollection pattern for app settings
- Timestamp-based tracking
- localStorage fallback for first-time users

---

## Development Workflow

### 1. Planning
- Define app functionality
- Determine if settings are needed
- Plan Firestore structure
- Choose appropriate icon and colors

### 2. Implementation
- Create component files
- Add to app registry
- Register components
- Update Firestore rules
- Implement settings (if needed)

### 3. Testing
- Test in development mode
- Verify routing works
- Test Firestore operations
- Check authentication flows
- Test in light/dark modes

### 4. Deployment
- Rebuild application
- Deploy Firestore rules
- Verify in production
- Monitor for errors

---

## Code Examples

### Minimal App (No Settings)

```typescript
// 1. Create component
export function MyAppMain() {
  return <div>My App</div>
}

// 2. Add to registry
{
  appId: "my-app",
  name: "My App",
  // ... other fields
}

// 3. Register component
const MyAppMain = React.lazy(() => 
  import("@/components/apps/my-app/my-app-main").then(m => ({ default: m.MyAppMain }))
)

const APP_COMPONENTS = {
  "my-app": {
    Main: MyAppMain,
  },
}
```

### App with Settings

```typescript
// 1. Create both components
export function MyAppMain() { /* ... */ }
export function MyAppSettings() { /* ... */ }

// 2. Add to registry (same as above)

// 3. Register both components
const MyAppMain = React.lazy(/* ... */)
const MyAppSettings = React.lazy(/* ... */)

const APP_COMPONENTS = {
  "my-app": {
    Main: MyAppMain,
    Settings: MyAppSettings,
  },
}

// 4. Update Firestore rules
match /myAppSettings/{settingsId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## Best Practices Summary

### Code Organization
- ✅ Keep app code in `components/apps/{appId}/`
- ✅ Use consistent naming (kebab-case for files, PascalCase for components)
- ✅ Follow existing patterns from other apps
- ✅ Use TypeScript for type safety

### Performance
- ✅ Use `React.lazy()` for all app components
- ✅ Minimize bundle size
- ✅ Load data on-demand
- ✅ Optimize re-renders

### Security
- ✅ Always check authentication
- ✅ Use Firestore security rules
- ✅ Validate user input
- ✅ Never trust client-side data

### User Experience
- ✅ Show loading states
- ✅ Handle errors gracefully
- ✅ Provide helpful error messages
- ✅ Support both light and dark modes

---

## Getting Help

### Common Issues

1. **App not showing in hub**
   - Check app is in `APP_REGISTRY`
   - Verify `status` is "live"
   - Rebuild application

2. **Route 404 error**
   - Verify `generateStaticParams()` includes your app
   - Check `appId` matches exactly
   - Clear `.next` cache

3. **Component not loading**
   - Check import paths
   - Verify component exports
   - Check browser console

4. **Firestore permission denied**
   - Verify rules are updated
   - Check subcollection name
   - Ensure user is authenticated

### Reference Implementations

Look at existing apps for reference:
- **Encryption Platform**: `components/apps/encryption/`
- **Diff Checker**: `components/apps/diffchecker/`
- **Time Zone Converter**: `components/apps/timezone/`

---

## Contributing

When adding new apps:
1. Follow the documentation exactly
2. Test thoroughly before submitting
3. Ensure code follows existing patterns
4. Update documentation if needed
5. Verify Firestore rules are updated

---

## Version History

- **v1.0** (January 2025): Initial documentation
  - Complete app creation guide
  - Firestore structure documentation
  - Best practices and examples

---

**Last Updated**: January 2025
