# Copyright (C) 2026-TODAY NICO SOLUTIONS - ENGINEERING & IT (<https://www.nico-solutions.de>)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo.tests.common import TransactionCase


class TestResUsers(TransactionCase):
    def test_get_default_leaflet_position(self):
        partner = self.env.user.company_id.partner_id
        partner.write(
            {
                "partner_latitude": 53.0793,
                "partner_longitude": 8.8017,
            }
        )

        result = self.env.user.get_default_leaflet_position("res.partner")

        self.assertEqual(result["lat"], 53.0793)
        self.assertEqual(result["lng"], 8.8017)
