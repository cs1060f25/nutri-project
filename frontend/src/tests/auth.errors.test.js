/**
 * Login with wrong password error test
 */

describe('Login Error Handling', () => {
  jest.setTimeout(30000);

  it('should return 401 with INVALID_CREDENTIALS when password is incorrect', async () => {
    const apiUrl = 'https://nutri-project-main.vercel.app//auth/login';
    const testData = {
      email: 'test_email@gmail.com',
      password: '123457',
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe('INVALID_CREDENTIALS');
    expect(data.error.message).toBe('Email or password is incorrect.');
  });
});

