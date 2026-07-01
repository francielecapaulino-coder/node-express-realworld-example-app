# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: conduit-flows.spec.ts >> Conduit User Journeys >> Guest User Experience >> Authentication validation endpoints
- Location: e2e/playwright/specs/conduit-flows.spec.ts:45:9

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 503
Received array: [401, 400]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Conduit User Journey E2E Tests
  5   |  * Testing realistic user flows and API interactions
  6   |  */
  7   | 
  8   | test.describe('Conduit User Journeys', () => {
  9   |   const BASE_URL = 'http://localhost:3000';
  10  |   
  11  |   test.describe('Guest User Experience', () => {
  12  |     
  13  |     test('Guest can access public endpoints', async ({ request }) => {
  14  |       // Test root endpoint
  15  |       const rootResponse = await request.get(BASE_URL);
  16  |       expect(rootResponse.status()).toBe(200);
  17  |       expect(rootResponse.headers()['content-type']).toBeDefined();
  18  |       
  19  |       // Test API documentation
  20  |       const docsResponse = await request.get(`${BASE_URL}/api-docs`);
  21  |       expect([200, 302]).toContain(docsResponse.status());
  22  |       
  23  |       // Test health/check endpoint if it exists
  24  |       const healthResponse = await request.get(`${BASE_URL}/api`);
  25  |       expect([200, 404]).toContain(healthResponse.status());
  26  |     });
  27  | 
  28  |     test('Guest gets unauthorized on protected routes', async ({ request }) => {
  29  |       const protectedEndpoints = [
  30  |         '/api/articles',
  31  |         '/api/articles/test-article/bookmark',
  32  |         '/api/articles/test-article'
  33  |       ];
  34  |       
  35  |       for (const endpoint of protectedEndpoints) {
  36  |         const response = await request.post(`${BASE_URL}${endpoint}`, {
  37  |           data: { title: 'Test' }
  38  |         });
  39  |         
  40  |         // Should be unauthorized for unauthenticated requests
  41  |         expect([401, 404, 405]).toContain(response.status());
  42  |       }
  43  |     });
  44  | 
  45  |     test('Authentication validation endpoints', async ({ request }) => {
  46  |       // Test login endpoint with invalid credentials
  47  |       const loginResponse = await request.post(`${BASE_URL}/api/users/login`, {
  48  |         data: {
  49  |           user: {
  50  |             email: 'invalid@email.com',
  51  |             password: 'wrongpassword'
  52  |           }
  53  |         }
  54  |       });
  55  |       
  56  |       // Should validate credentials properly
> 57  |       expect([401, 400]).toContain(loginResponse.status());
      |                          ^ Error: expect(received).toContain(expected) // indexOf
  58  |       
  59  |       // Test registration validation
  60  |       const registerResponse = await request.post(`${BASE_URL}/api/users`, {
  61  |         data: {
  62  |           user: {
  63  |             email: 'invalid-email',
  64  |             password: '123'
  65  |           }
  66  |         }
  67  |       });
  68  |       
  69  |       // Should validate user input
  70  |       expect([400, 422]).toContain(registerResponse.status());
  71  |     });
  72  |   });
  73  | 
  74  |   test.describe('API Contract Validation', () => {
  75  |     
  76  |     test('Error responses follow RealWorld spec', async ({ request }) => {
  77  |       const response = await request.post(`${BASE_URL}/api/users/login`, {
  78  |         data: {
  79  |           user: {
  80  |             email: 'nonexistent@test.com',
  81  |             password: '_wrongpassword_'
  82  |           }
  83  |         }
  84  |       });
  85  |       
  86  |       if (response.status() >= 400) {
  87  |         const body = await response.json();
  88  |         expect(body).toHaveProperty('errors');
  89  |         expect(typeof body.errors).toBe('object');
  90  |       }
  91  |     });
  92  | 
  93  |     test('Content-Type headers are correct', async ({ request }) => {
  94  |       const endpoints = [
  95  |         '',
  96  |         '/api',
  97  |         '/api/users/login',
  98  |         '/api/articles/test-article'
  99  |       ];
  100 |       
  101 |       for (const endpoint of endpoints) {
  102 |         const response = await request.get(`${BASE_URL}${endpoint}`);
  103 |         
  104 |         if (response.status() !== 404) {
  105 |           const contentType = response.headers()['content-type'];
  106 |           expect(contentType).toBeDefined();
  107 |           expect(['application/json', 'text/html', 'text/plain']).some(
  108 |             type => contentType?.includes(type)
  109 |           ).toBe(true);
  110 |         }
  111 |       }
  112 |     });
  113 | 
  114 |     test('CORS headers are present for API endpoints', async ({ request }) => {
  115 |       const response = await request.options(`${BASE_URL}/api/articles`, {
  116 |         headers: {
  117 |           'Origin': 'http://localhost:3000',
  118 |           'Access-Control-Request-Method': 'POST',
  119 |           'Access-Control-Request-Headers': 'Content-Type'
  120 |         }
  121 |       });
  122 |       
  123 |       if (response.status() === 204 || response.status() === 200) {
  124 |         const corsHeaders = response.headers();
  125 |         expect(corsHeaders['access-control-allow-origin']).toBeDefined();
  126 |       }
  127 |     });
  128 |   });
  129 | 
  130 |   test.describe('Request/Response Validation', () => {
  131 |     
  132 |     test('Malformed JSON is handled gracefully', async ({ request }) => {
  133 |       const response = await request.post(`${BASE_URL}/api/users/login`, {
  134 |         headers: {
  135 |           'Content-Type': 'application/json'
  136 |         },
  137 |         data: 'invalid json {'
  138 |       });
  139 |       
  140 |       expect([400, 415]).toContain(response.status());
  141 |     });
  142 | 
  143 |     test('Missing required fields are validated', async ({ request }) => {
  144 |       // Test login with missing fields
  145 |       const testCases = [
  146 |         { user: { email: 'test@test.com' } }, // Missing password
  147 |         { user: { password: 'password' } },   // Missing email
  148 |         { user: {} },                          // Missing both
  149 |         {},                                    // Missing user object
  150 |       ];
  151 |       
  152 |       for (const testCase of testCases) {
  153 |         const response = await request.post(`${BASE_URL}/api/users/login`, {
  154 |           data: testCase
  155 |         });
  156 |         
  157 |         expect([400, 422]).toContain(response.status());
```