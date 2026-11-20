window.addEventListener('DOMContentLoaded', async () => {
  try {
    const r = await fetch('/api/config', {cache:'no-store'});
    if (!r.ok) return;
    const j = await r.json();
    const key = j.kakao_js_key || '';
    if (/^[0-9a-f]{32}$/i.test(key) && !document.getElementById('connect').disabled) {
      document.getElementById('mapKey').value = key;
      document.getElementById('connect').click();
    }
  } catch (_) { /* manual map connection remains available */ }
});
