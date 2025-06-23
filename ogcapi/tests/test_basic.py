from odoo.tests.common import TransactionCase

class TestOgcapiModule(TransactionCase):
    def test_module_installed(self):
        module = self.env['ir.module.module'].search([('name', '=', 'ogcapi')], limit=1)
        self.assertTrue(module, "ogcapi module should be installed")

class TestOgcapiModel(TransactionCase):
    def test_model_exists(self):
        model = self.env.get('ogcapi.api')
        self.assertIsNotNone(model, "ogcapi.api bulunamadı")

    def test_create_record(self):
        """ogcapi.api için temel bir kayıt oluşturma testi."""
        vals = {
            'name': 'Test Record',
            'title': 'Test Record',
            'description': 'Test Record'
        }
        record = self.env['ogcapi.api'].create(vals)
        self.assertTrue(record, "Kayıt oluşturulamadı")
        self.assertEqual(record.name, 'Test Record')
