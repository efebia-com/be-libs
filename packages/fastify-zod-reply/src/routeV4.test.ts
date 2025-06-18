import assert from "assert"
import fastify from "fastify"
import { describe, it } from "node:test"
import z from "zod/v4"
import responsesPlugin from "./index"
import { routeV4 } from "./routeV4"

describe('routeV4', () => {
    it('should be able to return a 204 without any content', async () => {
        const app = fastify()
        await app.register(responsesPlugin, { statusCodes: { noContent: { payload: undefined, statusCode: 204 } } })
        app.get('/', routeV4({ Reply: z.object({ 204: z.undefined() }) }, async (req, reply) => {
            return reply.noContent()
        }))
        const response = await app.inject({
            method: 'GET',
            url: '/'
        })

        assert.equal(response.body, '')
        assert.equal(response.headers['content-type'], undefined)
    })
    it('should fail if you send a 204 with content', async () => {
        const app = fastify()
        await app.register(responsesPlugin, { statusCodes: { noContent: { payload: undefined, statusCode: 204 } } })
        //@ts-ignore
        app.get('/', routeV4({ Reply: z.object({ 204: z.undefined() }) }, async (req, reply) => {
            return reply.noContent({ test: 'test' })
        }))
        const response = await app.inject({
            method: 'GET',
            url: '/'
        })

        assert.equal(response.statusCode, 500)
    })
    it('should be able to return a 200 with content', async () => {
        const app = fastify()
        await app.register(responsesPlugin, { statusCodes: { noContent: { payload: undefined, statusCode: 204 } } })
        app.get('/', routeV4({ Reply: z.object({ 200: z.object({ id: z.string() }) }) }, async (req, reply) => {
            return reply.ok({ id: 'test' })
        }))
        const response = await app.inject({
            method: 'GET',
            url: '/'
        })

        assert.equal(response.body, JSON.stringify({ id: 'test' }))
        assert.deepStrictEqual(response.json(), { id: 'test' })
        assert.equal(response.headers['content-type'], 'application/json; charset=utf-8')
    })
})