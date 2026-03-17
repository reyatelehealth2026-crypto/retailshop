import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Proxy to PHP API
  const { endpoint } = req.query
  const path = Array.isArray(endpoint) ? endpoint.join('/') : endpoint || ''
  
  const apiUrl = `https://re-ya.net/api/${path}`
  const queryString = new URLSearchParams(req.query as any).toString()
  const fullUrl = queryString ? `${apiUrl}?${queryString}` : apiUrl

  try {
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization as string })
      },
      ...(req.method !== 'GET' && req.method !== 'HEAD' && { body: JSON.stringify(req.body) })
    })

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    console.error('API Proxy Error:', error)
    res.status(500).json({ success: false, error: 'API request failed' })
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
}
