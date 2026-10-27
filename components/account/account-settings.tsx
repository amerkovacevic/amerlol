"use client"

import * as React from "react"
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { saveProfile, useProfile } from "@/components/auth/profile-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, User as UserIcon, AtSign, Lock, Palette, Save } from "lucide-react"
import { useAccentColor } from "@/components/accent-color-provider"
import { THEME_COLORS, type ThemeColor } from "@/lib/theme-colors"
import { getUsernameError, USERNAME_MAX_LENGTH } from "@/lib/account/username"
import {
  getAuthErrorMessage,
  getDataErrorMessage,
  getErrorCode,
  logUnexpectedError,
} from "@/lib/firebase/user-facing-errors"

interface UserProfile {
  displayName: string
  username: string
  email: string
}

const EMPTY_PASSWORDS = { currentPassword: "", newPassword: "", confirmPassword: "" }

function passwordErrorMessage(error: unknown): string {
  switch (getErrorCode(error)) {
    // Current Firebase reports a wrong password as invalid-credential.
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Current password is incorrect"
    case "auth/weak-password":
      return "New password is too weak"
    default:
      return getAuthErrorMessage(error)
  }
}

export function AccountSettings() {
  const { account: user, loading: authLoading } = useAuth()
  const { color, saving: savingColor, setColor } = useAccentColor()
  const [saving, setSaving] = React.useState(false)
  const [changingPassword, setChangingPassword] = React.useState(false)
  const [passwordData, setPasswordData] = React.useState(EMPTY_PASSWORDS)
  const stored = useProfile()
  const [authOpen, setAuthOpen] = React.useState(false)
  // Edits are kept separately so a late profile load never overwrites typing.
  const [edits, setEdits] = React.useState<Partial<UserProfile>>({})
  const profile: UserProfile = {
    displayName: user?.displayName || "",
    username: stored.username ?? "",
    email: user?.email || "",
    ...edits,
  }
  const setProfile = (next: UserProfile) =>
    setEdits({ displayName: next.displayName, username: next.username })
  const loading = Boolean(user) && stored.status === "loading"

  React.useEffect(() => {
    if (stored.status === "error") toast.error(getDataErrorMessage(null, "load your profile"))
  }, [stored.status])

  const handleProfileUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return

    const usernameError = getUsernameError(profile.username)
    if (usernameError) {
      toast.error(usernameError)
      return
    }

    setSaving(true)
    try {
      if (profile.displayName !== user.displayName) {
        await updateProfile(user, { displayName: profile.displayName })
      }
      // Firestore mirrors Auth's name and email so other people can see them.
      await saveProfile(user.uid, {
        username: profile.username,
        displayName: profile.displayName,
        email: user.email || "",
      })
      setEdits({})
      toast.success("Profile updated successfully")
    } catch (error) {
      logUnexpectedError("account:profile", error)
      toast.error(getDataErrorMessage(error, "update your profile"))
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user?.email) return

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setChangingPassword(true)
    try {
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(user.email, passwordData.currentPassword)
      )
      await updatePassword(user, passwordData.newPassword)
      toast.success("Password changed successfully")
      setPasswordData(EMPTY_PASSWORDS)
    } catch (error) {
      logUnexpectedError("account:password", error)
      toast.error(passwordErrorMessage(error))
    } finally {
      setChangingPassword(false)
    }
  }

  const handleColorChange = async (next: ThemeColor) => {
    try {
      await setColor(next)
      toast.success("Site color updated")
    } catch {
      toast.error("Could not save your site color")
    }
  }

  if (authLoading || loading) {
    return (
      <div role="status" className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        Loading your account…
      </div>
    )
  }

  // Guests (including anonymous game players) have no account to manage.
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>You&apos;re not signed in</CardTitle>
          <CardDescription>
            Sign in to choose a username, sync your site color and keep app settings across devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setAuthOpen(true)}>Sign in or create account</Button>
          <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
        </CardContent>
      </Card>
    )
  }

  // Check if user signed in with Google (can't change password)
  const isGoogleUser = user.providerData.some((provider) => provider.providerId === "google.com")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Choose the color used across both light and dark mode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-2">
            <Label htmlFor="site-color">Site color</Label>
            <Select
              value={color}
              onValueChange={(value) => void handleColorChange(value as ThemeColor)}
              disabled={savingColor}
            >
              <SelectTrigger id="site-color" aria-label="Site color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEME_COLORS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: option.hex }}
                        aria-hidden="true"
                      />
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Applied instantly and synced to your account.</p>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your display name and username</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={profile.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                placeholder="Enter your display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <AtSign className="h-4 w-4" />
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                placeholder="Enter your username"
                pattern="[a-zA-Z0-9_]+"
                minLength={3}
                maxLength={USERNAME_MAX_LENGTH}
                title="Username can only contain letters, numbers, and underscores"
              />
              <p className="text-xs text-muted-foreground">
                Username can only contain letters, numbers, and underscores
              </p>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change */}
      {!isGoogleUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>

              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isGoogleUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Password
            </CardTitle>
            <CardDescription>
              You signed in with Google, so password changes are not available
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Future: Mini App Settings Section */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Mini App Settings</CardTitle>
          <CardDescription>
            Settings for individual mini-apps will appear here as they are added
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
