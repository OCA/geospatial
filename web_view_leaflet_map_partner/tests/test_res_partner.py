# Copyright (C) 2026-TODAY NICO SOLUTIONS - ENGINEERING & IT (<https://www.nico-solutions.de>)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo.tests.common import TransactionCase


class TestResPartner(TransactionCase):
    def test_compute_display_address(self):
        partner = self.env["res.partner"].create(
            {
                "name": "Test Partner",
                "street": "Test Street 123",
                "zip": "12345",
                "city": "Test City",
                "country_id": self.env.ref("base.de").id,
            }
        )

        self.assertEqual(
            partner.display_address,
            partner._display_address(without_company=True),
        )
