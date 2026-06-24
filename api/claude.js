export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { mode, prompt } = req.body || {};
  if (!mode || !prompt) return res.status(400).json({ error: 'Missing mode or prompt' });

  const systemPrompts = {
    strategy: `You are a healthcare contracting expert specializing in doula and perinatal services reimbursement in California and Washington state. You must respond with a valid JSON object using this exact schema: {"recommended_model":"string","model_rationale":"string","negotiation_leverage":["string"],"rate_recommendation":"string","key_contract_terms":[{"term":"string","recommendation":"string","priority":"high|medium|low"}],"pilot_strategy":"string","state_specific":"string","risk_flags":["string"],"strength_score":{"leverage":5,"market_timing":5,"value_story":5}}`,
    redline: `You are a healthcare contract attorney representing a doula services provider in California and Washington state. You must respond with a valid JSON object using this exact schema: {"overall_assessment":"string","payer_favor_score":7,"redlines":[{"clause_name":"string","quoted_language":"string","severity":"critical|major|minor","issue":"string","recommended_language":"string","legal_basis":"string"}],"missing_protections":["string"],"positive_terms":["string"]}`
  };

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
        max_tokens: 2000,
        system: systemPrompts[mode] || systemPrompts.strategy,
        messages: [
          { role: 'user', content: prompt },
          { role: 'assistant', content: '{' }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Anthropic API error' });
    }

    let text = '{' + (data.content?.[0]?.text || '');
    text = text.trim();

    JSON.parse(text);

    return res.status(200).json({ result: text });

  } catch(e) {
    console.error('Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
