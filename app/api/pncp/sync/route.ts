const response = await fetch(url, {
  method: 'GET',
  headers: {
    Accept: 'application/json',
  },
  cache: 'no-store',
});

const rawText = await response.text();

console.log('STATUS:', response.status);
console.log('BODY:', rawText);

if (!response.ok) {
  return NextResponse.json({
    error: 'PNCP respondeu com erro',
    status: response.status,
    body: rawText.slice(0, 1000),
  });
}
