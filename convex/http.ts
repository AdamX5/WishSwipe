import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'

const http = httpRouter()

http.route({
  path: '/normalise',
  method: 'POST',
  handler: httpAction(async (ctx) => {
    const result = await ctx.runAction(internal.normaliser.actions.ingestAllStores, {})
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
})

export default http
