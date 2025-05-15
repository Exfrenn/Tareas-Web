document.addEventListener('DOMContentLoaded', () => {
    const base = window.location.origin;
  
    async function doFetch(path, opts = {}) {
      try {
        const res = await fetch(base + path, opts);
        const ct  = res.headers.get('Content-Type') || '';
        const body = ct.includes('application/json')
          ? await res.json()
          : await res.text();
        console.log(`${opts.method || 'GET'} ${path} → ${res.status}`, body);
        return body;
      } catch (err) {
        console.error(`Error ${opts.method || 'GET'} ${path}:`, err);
      }
    }
  
    (async () => {
      // --- ITEMS ---
      await doFetch('/api/items');
      const createdItem = await doFetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Kunai', type: 'arma', effect: '+40 daño' })
      });
      const itemId = createdItem.id ?? createdItem.created?.[0]?.id;
      await doFetch(`/api/items/${itemId}`);
      await doFetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ effect: '+50 daño' })
      });
  
      // --- USERS ---
      await doFetch('/api/users');
  
      // 1) Crear usuario sin items
      const u1 = await doFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Usuario Pain', email: 'pain@akatsuki.com' })
      });
      let user1Id;
      if (Array.isArray(u1.created) && u1.created.length) {
        user1Id = u1.created[0].user.id;
      } else if (u1.id) {
        user1Id = u1.id;
      }
  
      // 2) Crear usuario con items
      const u2 = await doFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Usuario Itachi', email: 'Itachi@akatsuki.com', items: [itemId] })
      });
      let user2Id;
      if (Array.isArray(u2.created) && u2.created.length) {
        user2Id = u2.created[0].user.id;
      } else if (u2.id) {
        user2Id = u2.id;
      }
  
      // 3) Obtener usuario por ID
      await doFetch(`/api/users/${user2Id}`);
  
      // 4) Actualizar usuario
      await doFetch(`/api/users/${user2Id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Itachi Modificado', items: [] })
      });
  
      // 5) Borrar usuario1
      await doFetch(`/api/users/${user1Id}`, { method: 'DELETE' });
  
      // --- Finalmente, BORRAR EL ÍTEM que ya no usamos ---
      await doFetch(`/api/items/${itemId}`, { method: 'DELETE' });
    })();
  });
 