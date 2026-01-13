"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import { 
  updateProfile, 
  updatePassword, 
  reauthenticateWithCredential,
  EmailAuthProvider
} from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, User as UserIcon, AtSign, Lock, Save } from "lucide-react"

interface UserProfile {
  displayName: string
  username: string
  email: string
}

export function AccountSettings() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [changingPassword, setChangingPassword] = React.useState(false)
  
  const [profile, setProfile] = React.useState<UserProfile>({
    displayName: "",
    username: "",
    email: "",
  })
  
  const [passwordData, setPasswordData] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  // Load user profile data
  React.useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        // Get display name and email from Firebase Auth
        const displayName = user.displayName || ""
        const email = user.email || ""

        // Get username from Firestore - using user.uid matches Firestore rules
        let username = ""
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)
        
        if (userDoc.exists()) {
          const data = userDoc.data()
          username = data.username || ""
        }

        setProfile({
          displayName,
          username,
          email,
        })
      } catch (error: any) {
        console.error("Failed to load profile:", error)
        if (error.code === "permission-denied") {
          toast.error("Permission denied. Please check your authentication.")
        } else {
          toast.error("Failed to load profile data")
        }
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (profile.username && !usernameRegex.test(profile.username)) {
      toast.error("Username can only contain letters, numbers, and underscores")
      return
    }

    setSaving(true)
    try {
      // Update display name in Firebase Auth
      if (profile.displayName !== user.displayName) {
        await updateProfile(user, {
          displayName: profile.displayName,
        })
      }

      // Update username in Firestore
      // Using user.uid ensures it matches Firestore rules: request.auth.uid == userId
      // This validates against: match /users/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        // Update existing document - preserve createdAt and other existing fields
        await updateDoc(userDocRef, {
          username: profile.username || "",
          displayName: profile.displayName || "", // Keep Firestore in sync with Auth
          email: user.email || "", // Keep email in sync
          updatedAt: serverTimestamp(),
        })
      } else {
        // Create new document with initial data
        await setDoc(userDocRef, {
          username: profile.username || "",
          email: user.email || "",
          displayName: profile.displayName || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }

      toast.success("Profile updated successfully")
    } catch (error: any) {
      console.error("Failed to update profile:", error)
      if (error.code === "permission-denied") {
        toast.error("Permission denied. You can only update your own profile.")
      } else if (error.code === "unavailable") {
        toast.error("Service temporarily unavailable. Please try again later.")
      } else {
        toast.error(error.message || "Failed to update profile")
      }
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !user.email) return

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
      // Reauthenticate user
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      )
      await reauthenticateWithCredential(user, credential)

      // Update password
      await updatePassword(user, passwordData.newPassword)

      toast.success("Password changed successfully")
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error: any) {
      console.error("Failed to change password:", error)
      if (error.code === "auth/wrong-password") {
        toast.error("Current password is incorrect")
      } else if (error.code === "auth/weak-password") {
        toast.error("New password is too weak")
      } else {
        toast.error(error.message || "Failed to change password")
      }
    } finally {
      setChangingPassword(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Check if user signed in with Google (can't change password)
  const isGoogleUser = user.providerData.some(
    (provider) => provider.providerId === "google.com"
  )

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your display name and username
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                value={profile.displayName}
                onChange={(e) =>
                  setProfile({ ...profile, displayName: e.target.value })
                }
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
                onChange={(e) =>
                  setProfile({ ...profile, username: e.target.value })
                }
                placeholder="Enter your username"
                pattern="[a-zA-Z0-9_]+"
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
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
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
                  minLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters
                </p>
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
