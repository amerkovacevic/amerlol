import { z } from "zod"

export const tarkovJsonEnvelopeSchema = z.object({
  data: z.unknown(),
  translations: z.array(z.string()).optional(),
})

export const upstreamEntityRefSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
}).passthrough()

export type TarkovJsonEnvelope = z.infer<typeof tarkovJsonEnvelopeSchema>

export function parseTarkovEnvelope(value: unknown): TarkovJsonEnvelope {
  return tarkovJsonEnvelopeSchema.parse(value)
}
