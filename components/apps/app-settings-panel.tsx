"use client"

import * as React from "react"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  defaultSettings,
  SETTING_LABELS,
  settingsDefinition,
  validateSettings,
  parseSettingsImport,
  type SettingsValues,
} from "@/lib/apps/settings"
import { useSettingsContext } from "./settings-provider"

export function AppSettingsPanel() {
  const { appId, values, loading, saving, error, cloud, save, retry } = useSettingsContext()
  const [draft, setDraft] = React.useState<SettingsValues | null>(null)
  const [baseline, setBaseline] = React.useState<SettingsValues>(values)
  const [formError, setFormError] = React.useState("")
  const shown = draft ?? values
  const edit = (key: string, value: unknown) => {
    if (!draft) setBaseline(values)
    setDraft({ ...shown, [key]: value })
    setFormError("")
  }
  const apply = async () => {
    try {
      await save(validateSettings(appId, shown), baseline)
      setDraft(null)
      setFormError("")
      toast.success(cloud ? "Settings saved to your account" : "Settings saved on this device")
    } catch (cause) {
      setFormError(
        cause instanceof z.ZodError
          ? cause.issues
              .map((issue) => `${SETTING_LABELS[String(issue.path[0])] ?? issue.path[0]}: ${issue.message}`)
              .join(". ")
          : cause instanceof Error
            ? cause.message
            : "Settings could not be saved"
      )
    }
  }
  const exportSettings = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ appId, version: 1, settings: shown }, null, 2)], {
        type: "application/json",
      })
    )
    const link = document.createElement("a")
    link.href = url
    link.download = `${appId}-settings.json`
    link.click()
    URL.revokeObjectURL(url)
  }
  const importSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      if (file.size > 64 * 1024) throw new Error("Settings files must be smaller than 64 KB")
      const parsed = parseSettingsImport(appId, JSON.parse(await file.text()))
      if (!draft) setBaseline(values)
      setDraft(parsed)
      setFormError("")
    } catch {
      setFormError("That settings file is invalid for this app. Nothing was saved.")
    }
  }
  if (loading) return <p role="status">Loading settings…</p>
  return (
    <Card>
      <CardHeader>
        <CardTitle>App settings</CardTitle>
        <CardDescription>
          {cloud
            ? "Saved to your account and synced across devices."
            : "Saved on this device. No sign-in is needed."}{" "}
          Changes apply after saving. Reset affects preferences only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div role="alert">
            <p>{error}</p>
            <Button variant="outline" onClick={retry}>
              Retry loading settings
            </Button>
          </div>
        )}
        <fieldset disabled={saving || Boolean(error)} className="space-y-5">
          {Object.entries(settingsDefinition(appId).schema.shape).map(([key, field]) => (
            <SettingField
              key={key}
              id={`${appId}-${key}`}
              name={key}
              value={shown[key]}
              schema={field as z.ZodType}
              onChange={(value) => edit(key, value)}
            />
          ))}
        </fieldset>
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button disabled={!draft || saving || Boolean(error)} onClick={apply}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
          <Button
            variant="outline"
            disabled={!draft || saving}
            onClick={() => {
              setDraft(null)
              setFormError("")
            }}
          >
            Cancel changes
          </Button>
          <Button
            variant="outline"
            disabled={saving || Boolean(error)}
            onClick={() => {
              if (!draft) setBaseline(values)
              setDraft(defaultSettings(appId))
              setFormError("")
            }}
          >
            Reset preferences
          </Button>
          <Button variant="outline" onClick={exportSettings}>
            Export settings
          </Button>
          <Label className="flex items-center gap-2">
            Import settings
            <Input
              type="file"
              accept=".json,application/json"
              disabled={saving || Boolean(error)}
              onChange={importSettings}
              className="max-w-64"
            />
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}

function SettingField({
  id,
  name,
  value,
  schema,
  onChange,
}: {
  id: string
  name: string
  value: unknown
  schema: z.ZodType
  onChange: (value: unknown) => void
}) {
  let field = schema
  while (field instanceof z.ZodDefault) field = field.unwrap() as z.ZodType
  const label = SETTING_LABELS[name] ?? name
  if (typeof value === "boolean")
    return (
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={id}>{label}</Label>
        <input
          id={id}
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
          className="h-5 w-5"
        />
      </div>
    )
  if (field instanceof z.ZodObject)
    return (
      <fieldset className="space-y-3 rounded-md border p-4">
        <legend>{label}</legend>
        {Object.entries(value as SettingsValues).map(([key, enabled]) => (
          <div key={key} className="flex justify-between">
            <Label htmlFor={`${id}-${key}`} className="capitalize">
              {key}
            </Label>
            <input
              id={`${id}-${key}`}
              type="checkbox"
              checked={Boolean(enabled)}
              onChange={(event) =>
                onChange({
                  ...(value as SettingsValues),
                  [key]: event.target.checked,
                })
              }
            />
          </div>
        ))}
      </fieldset>
    )
  if (field instanceof z.ZodEnum)
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <select
          id={id}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          {field.options.map(String).map((option) => (
            <option key={option} value={option}>
              {option === "12" ? "12-hour (AM/PM)" : option === "24" ? "24-hour" : option}
            </option>
          ))}
        </select>
      </div>
    )
  const numberField = field instanceof z.ZodNumber ? field : null
  const numeric = numberField !== null
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={numeric ? "number" : "text"}
        min={numberField?.minValue ?? undefined}
        max={numberField?.maxValue ?? undefined}
        step={numberField ? (numberField.isInt ? 1 : 0.1) : undefined}
        value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
        onChange={(event) =>
          onChange(
            numeric
              ? event.target.value === ""
                ? NaN
                : Number(event.target.value)
              : Array.isArray(value)
                ? event.target.value
                    .split(",")
                    .map((part) => (name === "defaultSeverityRange" ? Number(part.trim()) : part.trim()))
                : event.target.value
          )
        }
      />
    </div>
  )
}
