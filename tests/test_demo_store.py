import unittest
from demo_service.store import Store


class DemoStoreTests(unittest.TestCase):
    def setUp(self):
        self.time = 1_800_000_000.0
        self.store = Store(':memory:', now=lambda: self.time)

    def tearDown(self):
        self.store.close()

    def test_sessions_are_isolated_and_plans_are_allowlisted(self):
        a = self.store.create()
        b = self.store.create()
        self.assertNotEqual(a, b)
        self.assertEqual(self.store.read(a).plan_code, 'base_1')
        self.store.select(a, 'family_1')
        self.assertEqual(self.store.read(a).plan_code, 'family_1')
        self.assertEqual(self.store.read(b).plan_code, 'base_1')
        self.assertIsNone(self.store.read('not-a-real-token'))
        with self.assertRaises(ValueError):
            self.store.select(a, 'https://not-a-plan.invalid')

    def test_one_time_code_links_exactly_one_chat_and_shared_plan(self):
        token = self.store.create()
        code = self.store.link_code(token)
        self.assertTrue(self.store.attach_chat(code, 12345))
        self.assertFalse(self.store.attach_chat(code, 99999))
        fresh = self.store.link_code(token)
        self.assertFalse(self.store.attach_chat(fresh, 2**80))
        self.assertTrue(self.store.attach_chat(fresh, 12345))
        self.store.select_for_chat(12345, 'base_12')
        self.assertEqual(self.store.read(token).plan_code, 'base_12')
        self.assertIsNone(self.store.for_chat(99999))
        self.store.reset(token)
        self.assertIsNone(self.store.for_chat(12345))
        self.assertIsNone(self.store.read(token))

    def test_code_and_session_expire_without_disclosing_data(self):
        token = self.store.create()
        code = self.store.link_code(token)
        self.time += 601
        self.assertFalse(self.store.attach_chat(code, 12345))
        self.assertIsNotNone(self.store.read(token))
        self.time += 24 * 3600
        self.assertIsNone(self.store.read(token))
        self.assertIsNone(self.store.for_chat(12345))

    def test_chat_relink_revokes_older_link_without_changing_another_plan(self):
        a = self.store.create()
        b = self.store.create()
        self.store.attach_chat(self.store.link_code(a), 88)
        self.store.attach_chat(self.store.link_code(b), 88)
        self.assertIsNone(self.store.read(a).chat_id)
        self.assertEqual(self.store.for_chat(88).token_hash, self.store.read(b).token_hash)


if __name__ == '__main__':
    unittest.main()
