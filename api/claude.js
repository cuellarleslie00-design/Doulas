export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { mode, prompt } = req.body || {};
  if (!mode || !prompt) return res.status(400).json({ error: 'Missing mode or prompt' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    console.log('Anthropic response status:', response.status);
    console.log('Anthropic response:', JSON.stringify(data));

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Anthropic API error' });
    }

    const text = data.content?.[0]?.text || '';
    if (!text) return res.status(500).json({ error: 'Empty response from AI' });

    return res.status(200).json({ result: text });

  } catch(e) {
    console.error('Handler error:', e);
    return res.status(500).json({ error: e.message });
  }
}
