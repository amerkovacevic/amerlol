import fs from "node:fs"
import { z } from "zod"
import { SETTINGS } from "../lib/apps/settings.ts"

function condition(schema, path) {
  while (schema instanceof z.ZodDefault || schema instanceof z.ZodEffects)
    schema = schema instanceof z.ZodDefault ? schema.removeDefault() : schema.innerType()
  if (schema instanceof z.ZodBoolean) return `${path} is bool`
  if (schema instanceof z.ZodNumber)
    return [
      `${path} is ${schema.isInt ? "int" : "number"}`,
      schema.minValue !== null && `${path} >= ${schema.minValue}`,
      schema.maxValue !== null && `${path} <= ${schema.maxValue}`,
    ]
      .filter(Boolean)
      .join(" && ")
  if (schema instanceof z.ZodEnum) return `${path} is string && ${path} in ${JSON.stringify(schema.options)}`
  if (schema instanceof z.ZodString)
    return `${path} is string${schema.maxLength !== null ? ` && ${path}.size() <= ${schema.maxLength}` : ""}`
  if (schema instanceof z.ZodObject)
    return (
      `${path} is map && ` +
      Object.entries(schema.shape)
        .map(([key, value]) => `(${JSON.stringify(key)} in ${path} && ${condition(value, `${path}.${key}`)})`)
        .join(" && ")
    )
  if (schema instanceof z.ZodTuple)
    return (
      `${path} is list && ${path}.size() == 2 && ` +
      schema.items.map((item, index) => `(${condition(item, `${path}[${index}]`)})`).join(" && ") +
      ` && ${path}[0] <= ${path}[1]`
    )
  if (schema instanceof z.ZodArray)
    return (
      `${path} is list && ${path}.size() >= 1 && ${path}.size() <= 12 && ` +
      Array.from(
        { length: 12 },
        (_, index) =>
          `(${path}.size() <= ${index} || (${path}[${index}] is string && ${path}[${index}].size() <= 100))`
      ).join(" && ")
    )
  throw new Error(`Unsupported settings validator: ${schema.constructor.name}`)
}

const file = "firestore.rules"
const source = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
let updated = source
for (const definition of Object.values(SETTINGS)) {
  if (!("collection" in definition)) continue
  const collection = definition.collection
  const keys = Object.keys(definition.schema.shape)
  const validation = Object.entries(definition.schema.shape)
    .map(
      ([key, schema]) =>
        `          (!preferenceKeys().hasAny([${JSON.stringify(key)}]) || (${condition(schema, `request.resource.data.${key}`)}))`
    )
    .join(" &&\n")
  const block = `      match /${collection}/{settingsId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow create, update: if isPreferenceWrite(userId, settingsId, ${JSON.stringify(keys)}) &&
${validation};
        allow delete: if false;
      }`
  updated = updated.replace(
    new RegExp(`      match /${collection}/\\{settingsId\\} \\{[\\s\\S]*?\n      \\}`),
    block
  )
}
if (process.argv.includes("--check")) {
  if (updated !== source) {
    console.error("Settings rules are out of sync. Run npm run generate:settings-rules.")
    process.exitCode = 1
  } else console.log("Settings rules match all account preference schemas.")
} else fs.writeFileSync(file, updated)
