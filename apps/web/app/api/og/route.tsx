// TASK-053 — OG image generation
// Uses @vercel/og to generate 1200×630 preview cards for lists and profiles.
// See DESIGN-SYSTEM.md Screen 12 for visual spec.

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'list'
  const title = searchParams.get('title') ?? 'Reelstack'

  // TODO TASK-053: implement @vercel/og card generation
  return new Response(
    JSON.stringify({ type, title, status: 'not implemented yet' }),
    { headers: { 'Content-Type': 'application/json' } },
  )
}
