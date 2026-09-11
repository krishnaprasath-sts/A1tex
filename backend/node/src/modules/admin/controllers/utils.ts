import { z } from 'zod'

export function adminId(req: any) {
  return req.auth?.sub as number | undefined
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(1000).default(20),
})

export const idParam = z.object({ id: z.string().min(1) })
