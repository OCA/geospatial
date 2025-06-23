from odoo.tests.common import TransactionCase

class TestOgcapiModule(TransactionCase):
    def test_module_installed(self):
        module = self.env['ir.module.module'].search([('name', '=', 'ogcapi')], limit=1)
        self.assertTrue(module, "ogcapi module should be installed")

