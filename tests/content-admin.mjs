import { test } from 'node:test';
import assert from 'node:assert/strict';

test('loadContentType caches results', async (t) => {
  const origFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = origFetch; });
  
  let callCount = 0;
  globalThis.fetch = async (url, opts) => {
    callCount++;
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, type: { name: 'Listing', fields: [] } })
    };
  };
  
  const { loadContentType, clearContentTypeCache } = await import('../runtime/content-types.js');
  clearContentTypeCache();
  const a = await loadContentType('Listing');
  const b = await loadContentType('Listing');
  assert.equal(callCount, 1);
  assert.equal(a, b);
});

test('loadContentType throws on 404', async (t) => {
  const origFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = origFetch; });

  globalThis.fetch = async (url, opts) => {
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' })
    };
  };

  const { loadContentType, clearContentTypeCache } = await import('../runtime/content-types.js');
  clearContentTypeCache();

  await assert.rejects(
    () => loadContentType('NonExistent'),
    /Failed to load content type.*404/
  );
});

test('loadContentType throws on API error', async (t) => {
  const origFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = origFetch; });

  globalThis.fetch = async (url, opts) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: false, error: 'Not found' })
    };
  };

  const { loadContentType, clearContentTypeCache } = await import('../runtime/content-types.js');
  clearContentTypeCache();

  await assert.rejects(
    () => loadContentType('NonExistent'),
    /Failed to load content type.*Not found/
  );
});

test('listContentTypes returns array', async (t) => {
  const origFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = origFetch; });
  
  globalThis.fetch = async (url, opts) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, types: [{name: 'Listing'}, {name: 'BlogPost'}] })
    };
  };
  
  const { listContentTypes, clearContentTypeCache } = await import('../runtime/content-types.js');
  clearContentTypeCache();
  
  const result = await listContentTypes();
  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 2);
});

test('createItem POSTs to right URL', async (t) => {
  const origFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = origFetch; });
  
  globalThis.fetch = async (url, opts) => {
    assert.equal(opts.method, 'POST');
    assert.match(url, /\/api\/agent\/content-items$/);
    const body = JSON.parse(opts.body);
    assert.equal(body.type, 'Listing');
    assert.equal(body.data.title, 'Test');
    
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, item: { id: 'abc123' } })
    };
  };
  
  const { createItem } = await import('../runtime/content-api-client.js');
  await createItem('Listing', {title: 'Test'});
});

test('listItems GETs with query string', async (t) => {
  const origFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = origFetch; });
  
  globalThis.fetch = async (url, opts) => {
    assert.equal(opts.method, 'GET');
    assert.match(url, /\?type=Listing&page=2&perPage=5/);
    
    return {
      ok: true,
      status: 200,
      json: async () => ({ 
        ok: true, 
        items: [],
        page: 2,
        perPage: 5,
        totalItems: 0,
        totalPages: 0
      })
    };
  };
  
  const { listItems } = await import('../runtime/content-api-client.js');
  await listItems('Listing', {page: 2, perPage: 5});
});

test('getItem GETs by id', async (t) => {
  const origFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = origFetch; });
  
  globalThis.fetch = async (url, opts) => {
    assert.equal(opts.method, 'GET');
    assert.match(url, /\/api\/agent\/content-items\/abc123$/);
    
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, item: { id: 'abc123' } })
    };
  };
  
  const { getItem } = await import('../runtime/content-api-client.js');
  await getItem('abc123');
});

test('updateItem PATCHes', async (t) => {
  const origFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = origFetch; });
  
  globalThis.fetch = async (url, opts) => {
    assert.equal(opts.method, 'PATCH');
    assert.match(url, /\/api\/agent\/content-items\/abc123$/);
    const body = JSON.parse(opts.body);
    assert.equal(body.data.title, 'New');

    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, item: { id: 'abc123', data: { title: 'New' } } })
    };
  };
  
  const { updateItem } = await import('../runtime/content-api-client.js');
  await updateItem('abc123', {title: 'New'});
});

test('deleteItem DELETEs', async (t) => {
  const origFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = origFetch; });
  
  globalThis.fetch = async (url, opts) => {
    assert.equal(opts.method, 'DELETE');
    assert.match(url, /\/api\/agent\/content-items\/abc123$/);
    
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true })
    };
  };
  
  const { deleteItem } = await import('../runtime/content-api-client.js');
  await deleteItem('abc123');
});
