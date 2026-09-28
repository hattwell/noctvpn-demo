import unittest
from fastapi.testclient import TestClient
from demo_service.app import create_app
from demo_service.store import Store


class DemoBotTests(unittest.TestCase):
    def setUp(self):
        self.store = Store(':memory:')
        self.sent = []

        async def fake_sender(method, payload):
            self.sent.append((method, payload))

        self.client = TestClient(create_app(self.store, bot_token='synthetic-test-value', webhook_secret='synthetic-header', sender=fake_sender))
        self.client.__enter__()
        self.headers = {'X-Telegram-Bot-Api-Secret-Token': 'synthetic-header'}

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.store.close()

    def message(self, text, chat_id=456):
        return self.client.post('/v1/telegram/webhook', json={'update_id': len(self.sent) + 1, 'message': {'text': text, 'chat': {'id': chat_id}}}, headers=self.headers)

    def test_bot_ready_only_after_explicit_webhook_registration(self):
        self.assertFalse(self.client.get('/v1/health').json()['botReady'])
        sent = []

        async def fake_send(method, payload):
            sent.append((method, payload))

        with TestClient(create_app(Store(':memory:'), bot_token='synthetic-test-value', webhook_secret='synthetic-header', sender=fake_send, enable_webhook=True)) as client:
            self.assertTrue(client.get('/v1/health').json()['botReady'])
        self.assertEqual(sent[0][0], 'setWebhook')
        self.assertEqual(sent[0][1]['url'], 'https://noctvpn-demo-api.onrender.com/v1/telegram/webhook')
        self.assertEqual(sent[0][1]['allowed_updates'], ['message', 'callback_query'])

    def test_header_and_payment_updates_fail_closed(self):
        update = {'update_id': 1, 'message': {'text': '/start', 'chat': {'id': 456}}}
        self.assertEqual(self.client.post('/v1/telegram/webhook', json=update).status_code, 401)
        self.assertEqual(self.client.post('/v1/telegram/webhook', json=update, headers={'X-Telegram-Bot-Api-Secret-Token': 'wrong'}).status_code, 401)
        self.assertEqual(self.client.post('/v1/telegram/webhook', json={'update_id': 1, 'pre_checkout_query': {}}, headers=self.headers).status_code, 400)
        self.assertEqual(self.client.post('/v1/telegram/webhook', json={'update_id': 1, 'message': {'successful_payment': {}, 'chat': {'id': 456}}}, headers=self.headers).status_code, 400)
        self.assertEqual(self.sent, [])

    def test_guest_menu_link_and_plan_selection_sync_with_browser(self):
        self.assertEqual(self.message('/start').status_code, 200)
        self.assertIn('демо', self.sent[-1][1]['text'].lower())
        self.assertIn('Инструкции', str(self.sent[-1][1].get('reply_markup')))
        token = self.store.create()
        code = self.store.link_code(token)
        self.assertEqual(self.message('/start ' + code).status_code, 200)
        self.assertEqual(self.store.for_chat(456).plan_code, 'base_1')
        self.assertEqual(self.message('Купить / продлить').status_code, 200)
        self.assertIn('plan:base_12', str(self.sent[-1][1].get('reply_markup')))
        update = {'update_id': 66, 'callback_query': {'id': 'cb-test', 'data': 'plan:base_12', 'message': {'chat': {'id': 456}}}}
        self.assertEqual(self.client.post('/v1/telegram/webhook', json=update, headers=self.headers).status_code, 200)
        self.assertEqual(self.store.read(token).plan_code, 'base_12')
        self.assertEqual(self.message('Моя подписка').status_code, 200)
        self.assertIn('Base 12', self.sent[-1][1]['text'])
        self.assertIn('предпросмотр', self.sent[-1][1]['text'])

    def test_remaining_menu_is_informational_and_nothing_is_provisioned(self):
        token = self.store.create()
        self.message('/start ' + self.store.link_code(token))
        for label in ['Подключить устройство', 'Инструкции', 'История', 'FAQ', 'Поддержка', 'Аккаунт', 'Документы', 'Получить Trial', 'Оплатить', '/help']:
            before = len(self.sent)
            self.assertEqual(self.message(label).status_code, 200)
            self.assertGreater(len(self.sent), before)
            self.assertNotIn('vless://', str(self.sent[-1]))
            self.assertNotIn('://', self.sent[-1][1]['text'])
        self.assertEqual(self.store.read(token).plan_code, 'base_1')
        self.assertEqual(self.store.for_chat(456).chat_id, 456)

    def test_malformed_message_does_not_send_any_reply(self):
        self.assertEqual(self.client.post('/v1/telegram/webhook', json={'update_id': 1, 'message': {'chat': {'id': -22}, 'text': '/start'}}, headers=self.headers).status_code, 400)
        self.assertEqual(self.client.post('/v1/telegram/webhook', json={'update_id': 1, 'callback_query': {'data': 'plan:nope', 'message': {'chat': {'id': 456}}}}, headers=self.headers).status_code, 400)
        self.assertEqual(self.sent, [])


if __name__ == '__main__':
    unittest.main()
