export async function onRequestGet() {
  return new Response('hello world', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Test': 'yes'
    }
  });
}
