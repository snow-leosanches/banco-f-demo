import { createFileRoute } from '@tanstack/react-router'
import type {} from '@tanstack/react-start'

import { getSignalsInstance } from '@/lib/signals-server'

export const Route = createFileRoute('/api/attribute-groups')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const attributeKey = url.searchParams.get('attribute_key')
        const identifier = url.searchParams.get('identifier')
        const name = url.searchParams.get('name')
        const versionParam = url.searchParams.get('version')
        const attributesParam = url.searchParams.get('attributes')

        if (!attributeKey || !identifier || !name) {
          return Response.json(
            {
              error: 'Missing required parameters',
              message: 'attribute_key, identifier, and name are required',
              received: {
                attributeKey: attributeKey ?? null,
                identifier: identifier ?? null,
                name: name ?? null,
              },
            },
            { status: 400 },
          )
        }

        const version = versionParam ? parseInt(versionParam, 10) : undefined
        const invalidVersion =
          versionParam != null && (version === undefined || Number.isNaN(version) || version < 0)
        if (invalidVersion) {
          return Response.json(
            {
              error: 'Invalid version',
              message: 'version must be a non-negative integer',
              received: versionParam,
            },
            { status: 400 },
          )
        }

        const attributes = attributesParam
          ? attributesParam
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean)
          : []
        if (attributes.length === 0) {
          return Response.json(
            {
              error: 'Missing or empty attributes',
              message: 'attributes query param is required (comma-separated list of attribute names)',
              received: attributesParam ?? null,
            },
            { status: 400 },
          )
        }

        if (version === undefined) {
          return Response.json(
            {
              error: 'Missing version',
              message: 'version is required for attribute group requests',
              received: versionParam ?? null,
            },
            { status: 400 },
          )
        }

        const signalsResult = getSignalsInstance()
        if (!signalsResult.success) {
          return Response.json(
            {
              error: 'Snowplow Signals not configured on server',
              message: signalsResult.error,
              diagnostic: signalsResult.details,
            },
            { status: 500 },
          )
        }

        try {
          const groupAttributes = await signalsResult.signals.getGroupAttributes({
            attribute_key: attributeKey,
            identifier,
            name,
            version,
            attributes: attributes as [string, ...string[]],
          })

          if (
            !groupAttributes ||
            (typeof groupAttributes === 'object' && Object.keys(groupAttributes).length === 0)
          ) {
            return Response.json({
              message: 'No attributes found for this attribute group',
              attributeKey,
              identifier,
              name,
              version,
              attributes: groupAttributes ?? {},
            })
          }

          return Response.json(groupAttributes)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          const stack = error instanceof Error ? error.stack : undefined

          return Response.json(
            {
              error: 'Failed to fetch attribute group attributes',
              message,
              requestParams: { attributeKey, identifier, name, version, attributes },
              ...(process.env.NODE_ENV === 'development' && stack ? { stack } : {}),
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
