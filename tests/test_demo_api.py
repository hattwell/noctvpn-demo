import unittest
from fastapi.testclient import TestClient
from demo_service.app import create_app
from demo_service.store import Store


class DemoAPITests(unittest.TestCase):
    def setUp(self):
        self.time = 1_800_000_000.0
        self.store = Store(':memory:', now=lambda: self.time)
        self.client = TestClient(create_app(self.store, bot_token=None, webhook_secret=None))
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.store.close()

    def session(self):
        result = self.client.post('/v1/session', headers={'Origin': 'https://noctvpn-demo.onrender.com'})
        self.assertEqual(result.status_code, 201)
        self.assertEqual(result.headers['access-control-allow-origin'], 'https://noctvpn-demo.onrender.com')
        return result.json()['token']

    @staticmethod
    def auth(token):
        return {'Authorization': f'Bearer {token}'}

    def test_catalog_is_public_but_account_is_private(self):
        catalog = self.client.get('/v1/catalog').json()
        self.assertEqual([plan['code'] for plan in catalog], ['trial', 'base_1', 'base_6', 'base_12', 'family_1'])
        self.assertEqual(catalog[3]['rubPrice'], 1299)
        self.assertEqual(self.client.get('/v1/session').status_code, 401)
        token = self.session()
        own = self.client.get('/v1/session', headers=self.auth(token))
        self.assertEqual(own.json()['planCode'], 'base_1')
        self.assertNotIn('token', own.json())
        self.assertNotIn('chatId', own.json())
        foreign = self.client.get('/v1/session', headers=self.auth(self.session()))
        self.assertFalse(foreign.json()['linked'])
        self.assertEqual(self.client.get('/v1/session', headers=self.auth('invalid')).status_code, 401)
        cross_origin = self.client.get('/v1/catalog', headers={'Origin': 'https://other.example'})
        self.assertNotIn('access-control-allow-origin', cross_origin.headers)

    def test_selection_link_and_reset_never_create_a_purchase(self):
        token = self.session()
        updated = self.client.patch('/v1/session/plan', headers=self.auth(token), json={'planCode': 'family_1'})
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()['planCode'], 'family_1')
        self.assertEqual(updated.json()['displayPriceRub'], 399)
        self.assertEqual(self.client.patch('/v1/session/plan', headers=self.auth(token), json={'planCode': 'prod_secret'}).status_code, 400)
        self.assertEqual(self.client.patch('/v1/session/plan', headers={**self.auth(token), 'Content-Type': 'application/json'}, content=b'{bad-json').status_code, 400)
        link = self.client.post('/v1/session/link', headers=self.auth(token)).json()
        self.assertRegex(link['command'], r'^/start [A-Za-z0-9_-]{16}$')
        self.assertEqual(link['expiresInSeconds'], 600)
        for path in ['/v1/checkout', '/v1/trial', '/v1/connect']:
            self.assertEqual(self.client.post(path, headers=self.auth(token)).status_code, 403)
        self.assertEqual(self.client.get('/v1/session', headers=self.auth(token)).json()['planCode'], 'family_1')
        self.assertEqual(self.client.post('/v1/session/reset', headers=self.auth(token)).status_code, 204)
        self.assertEqual(self.client.get('/v1/session', headers=self.auth(token)).status_code, 401)

    def test_session_and_code_expiry_and_disabled_webhook(self):
        token = self.session()
        self.assertEqual(self.client.post('/v1/telegram/webhook', json={'update_id': 1}).status_code, 503)
        self.time += 24 * 3600 + 1
        self.assertEqual(self.client.get('/v1/session', headers=self.auth(token)).status_code, 401)
        self.assertFalse(self.client.get('/v1/health').json()['botReady'])

    def test_link_codes_are_rate_limited_per_session(self):
        token = self.session()
        statuses = [self.client.post('/v1/session/link', headers=self.auth(token)).status_code for _ in range(12)]
        self.assertIn(429, statuses)

    def test_rejects_large_body_and_rapid_anonymous_creation(self):
        def bounded_chunks():
            for _ in range(9):
                yield b'x' * 4096
            raise AssertionError('server read beyond its size limit')

        chunked = self.client.post('/v1/session', content=bounded_chunks())
        self.assertEqual(chunked.status_code, 411)
        big = self.client.post('/v1/session', content=b'x' * 40_000)
        self.assertEqual(big.status_code, 413)
        statuses = [self.client.post('/v1/session').status_code for _ in range(45)]
        self.assertIn(429, statuses)


if __name__ == '__main__':
    unittest.main()
