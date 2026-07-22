export let baseUrl = 'https://vibecoder.freshvibeapps.com';
export let token = 'vibecoder-local';

export function setBaseUrl(url) {
  baseUrl = url;
}

export function setToken(newToken) {
  token = newToken;
}

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      },
      cache: 'no-store'
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'Network error or server not responding');
  }
}

export async function listItems(typeName, { page = 1, perPage = 20, sort = '-created' } = {}) {
  const qs = `type=${encodeURIComponent(typeName)}&page=${page}&perPage=${perPage}&sort=${encodeURIComponent(sort)}`;
  const data = await request(`/api/agent/content-items?${qs}`, { method: 'GET' });
  return data;
}

export async function getItem(itemId) {
  const data = await request(`/api/agent/content-items/${itemId}`, { method: 'GET' });
  return data.item;
}

export async function createItem(typeName, data) {
  const body = JSON.stringify({ type: typeName, data });
  const response = await request('/api/agent/content-items', { method: 'POST', body });
  return response.item;
}

export async function updateItem(itemId, data) {
  const body = JSON.stringify({ data });
  const response = await request(`/api/agent/content-items/${itemId}`, { method: 'PATCH', body });
  return response.item;
}

export async function deleteItem(itemId) {
  const response = await request(`/api/agent/content-items/${itemId}`, { method: 'DELETE' });
  return response.item;
}
