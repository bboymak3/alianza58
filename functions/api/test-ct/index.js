// functions/api/test-ct/index.js
// Test de Content-Type con diferentes estrategias

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const strategy = url.searchParams.get('strategy') || 'a';
  
  let headers;
  let body = 'hello world';
  
  if (strategy === 'a') {
    // Estrategia A: Headers como objeto plano
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      }
    });
  } else if (strategy === 'b') {
    // Estrategia B: Headers como instancia de Headers
    headers = new Headers();
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    return new Response(body, { status: 200, headers });
  } else if (strategy === 'c') {
    // Estrategia C: Devolver blob con tipo
    const blob = new Blob([body], { type: 'text/plain; charset=utf-8' });
    return new Response(blob, { status: 200 });
  } else if (strategy === 'd') {
    // Estrategia D: Setear content-type en mayúsculas y minúsculas
    headers = new Headers();
    headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify({ hello: 'world' }), { status: 200, headers });
  } else if (strategy === 'e') {
    // Estrategia E: Solo Content-Type sin valor de charset
    headers = new Headers();
    headers.set('Content-Type', 'image/jpeg');
    return new Response(body, { status: 200, headers });
  }
  
  return new Response('invalid strategy', { status: 400 });
}
