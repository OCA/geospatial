from odoo.tests.common import TransactionCase
from odoo.exceptions import ValidationError

class TestOgcapiKeywordModel(TransactionCase):

    def test_create_and_fields(self):
        kw = self.env['ogcapi.keyword'].create({'name': 'test-keyword'})
        self.assertEqual(kw.name, 'test-keyword')

    def test_required_name(self):
        with self.assertRaises(ValidationError):
            self.env['ogcapi.keyword'].create({'name': False})
