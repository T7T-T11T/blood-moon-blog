/** Daily pseudonym for aggregate statistics; never persist the source IP. */
export async function visitorId(ip, secret, date = new Date().toISOString().slice(0, 10)) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('Statistics secret unavailable')
  const bytes = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', bytes.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const hash = new Uint8Array(await crypto.subtle.sign('HMAC', key, bytes.encode(`visits:${date}:${ip}`)))
  return btoa(String.fromCharCode(...hash)).replace(/=+$/, '')
}
