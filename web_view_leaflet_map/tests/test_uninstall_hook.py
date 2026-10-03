# Copyright (C) 2026-TODAY NICO SOLUTIONS - ENGINEERING & IT (<https://www.nico-solutions.de>)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo.tests.common import TransactionCase

from ..hooks import uninstall_hook


class TestUninstallHook(TransactionCase):
    def test_uninstall_hook_removes_leaflet_map(self):
        action_model = self.env["ir.actions.act_window"]

        action_end = action_model.create(
            {
                "name": "Leaflet Map End",
                "res_model": "res.partner",
                "view_mode": "list,leaflet_map",
            }
        )
        action_start = action_model.create(
            {
                "name": "Leaflet Map Start",
                "res_model": "res.partner",
                "view_mode": "leaflet_map,list",
            }
        )
        action_only = action_model.create(
            {
                "name": "Leaflet Map Only",
                "res_model": "res.partner",
                "view_mode": "leaflet_map",
            }
        )

        uninstall_hook(self.env)
        self.env.invalidate_all()
        self.assertEqual(action_end.view_mode, "list")
        self.assertEqual(action_start.view_mode, "list")
        self.assertFalse(action_only.exists())
