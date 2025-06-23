from odoo.tests.common import TransactionCase
from odoo.exceptions import ValidationError

class TestOgcapiKeywordModel(TransactionCase):

    def test_create_and_fields(self):
        kw = self.env['ogcapi.keyword'].create({'name': 'test-keyword'})
        self.assertEqual(kw.name, 'test-keyword')

    def test_required_name(self):
        with self.assertRaises(ValidationError):
            self.env['ogcapi.keyword'].create({'name': False})

    def test_create_multiple_keywords(self):
        # Coverage: birden fazla anahtar kelime oluşturulabiliyor mu
        kw1 = self.env['ogcapi.keyword'].create({'name': 'kw1'})
        kw2 = self.env['ogcapi.keyword'].create({'name': 'kw2'})
        self.assertNotEqual(kw1.id, kw2.id)
        self.assertEqual(kw1.name, 'kw1')
        self.assertEqual(kw2.name, 'kw2')

    def test_keyword_str(self):
        # Coverage: __str__ veya display_name davranışı
        kw = self.env['ogcapi.keyword'].create({'name': 'display-keyword'})
        self.assertIn('display-keyword', kw.display_name)
