import tempfile
import unittest
from pathlib import Path
from scripts.check_public_artifact import allowlisted, inspect_public_paths


class PublicArtifactTests(unittest.TestCase):
    def test_typed_unit_test_paths_are_part_of_public_artifact(self):
        self.assertTrue(allowlisted('src/fixtures.test.ts'))
        self.assertTrue(allowlisted('src/bot.test.ts'))

    def test_safe_static_source_is_accepted(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'src').mkdir()
            (root / 'src' / 'main.tsx').write_text('export const greeting = "NOCT VPN"')
            (root / 'index.html').write_text('<!doctype html><div id="root"></div>')
            self.assertEqual(inspect_public_paths(root, ['src/main.tsx', 'index.html']), [])

    def test_credentials_and_old_repo_are_rejected_without_echoing_values(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'src').mkdir()
            (root / 'src' / 'bad.ts').write_text('fetch("https://api.telegram.org/bot-secret")')
            violations = inspect_public_paths(root, ['src/bad.ts', '.env', 'backups/export.db', 'src/api.ts'])
            self.assertTrue(any('external-network' in violation for violation in violations))
            self.assertTrue(any('not-allowlisted' in violation for violation in violations))
            self.assertNotIn('bot-secret', ' '.join(violations))

    def test_telegram_token_and_symlinks_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'src').mkdir()
            fake_shape = '123456789:' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmn'
            (root / 'src' / 'secret.ts').write_text(fake_shape)
            (root / 'src' / 'linked.ts').symlink_to(root / 'src' / 'secret.ts')
            violations = inspect_public_paths(root, ['src/secret.ts', 'src/linked.ts'])
            self.assertTrue(any('secret-shape' in violation for violation in violations))
            self.assertTrue(any('symlink' in violation for violation in violations))


if __name__ == '__main__':
    unittest.main()
