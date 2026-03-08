import { NextRequest } from 'next/server';

export interface MockRequestOptions {
  url?: string;
  token?: string;
  method?: string;
  body?: unknown;
}

/**
 * Creates a mock NextRequest with optional Bearer token authentication.
 */
export function createMockRequest(options: MockRequestOptions = {}): NextRequest {
  const {
    url = 'http://localhost:3000/api/test',
    token,
    method = 'GET',
    body,
  } = options;

  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const init: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(body);
    headers.set('Content-Type', 'application/json');
  }

  return new NextRequest(url, init);
}
