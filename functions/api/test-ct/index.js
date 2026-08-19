// functions/api/test-ct/index.js
// Test de Content-Type — probar diferentes formas de setearlo

export async function onRequestGet() {
  // Probar setear Content-Type con diferentes casos
  const headers = new Headers();
  headers.set('Content-Type', 'text/plain; charset=utf-8');
  headers.set('content-type', 'text/plain; charset=utf-8');  // lowercase
  headers.append('Content-Type', 'text/plain; charset=utf-8');
  headers.set('X-Test', 'yes');
  
  return new Response('hello world', {
    status: 200,
    headers
  });
}
