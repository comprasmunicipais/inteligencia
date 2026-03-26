Deno.serve(async () => {
  const cronSecret = Deno.env.get('CRON_SECRET');

  if (!cronSecret) {
    return new Response('CRON_SECRET not set', { status: 500 });
  }

  const res = await fetch('https://inteligencia-sooty.vercel.app/api/email/queue/process', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  const body = await res.text();

  return new Response(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
