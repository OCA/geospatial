# Copyright (C) 2026-TODAY NICO SOLUTIONS - ENGINEERING & IT (<https://www.nico-solutions.de>)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo.tests.common import TransactionCase


class TestIrUiView(TransactionCase):
    def test_get_view_info_leaflet_map(self):
        view_info = self.env["ir.ui.view"]._get_view_info()

        self.assertIn("leaflet_map", view_info)
        self.assertEqual(
            view_info["leaflet_map"]["icon"],
            "fa fa-map-o",
        )
