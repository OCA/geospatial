# Copyright (C) 2026-TODAY NICO SOLUTIONS - ENGINEERING & IT (<https://www.nico-solutions.de>)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import json

from odoo.addons.base.tests.common import HttpCase, TransactionCase
from odoo.addons.web_leaflet_lib.hooks import post_init_hook


class TestIrHttp(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.config = cls.env["ir.config_parameter"].sudo()
        cls.base_module = cls.env.ref("base.module_base")

    def test_post_init_hook_with_false_tile_url(self):
        self.config.set_param("leaflet.tile_url", "False")
        self.base_module.demo = True
        post_init_hook(self.env)
        self.assertEqual(
            self.config.get_param("leaflet.tile_url"),
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        )

    def test_post_init_hook_with_existing_tile_url(self):
        tile_url = "https://tile.example.com/{z}/{y}/{x}.png"
        self.config.set_param("leaflet.tile_url", tile_url)
        self.base_module.demo = True
        post_init_hook(self.env)
        self.assertEqual(
            self.config.get_param("leaflet.tile_url"),
            tile_url,
        )

    def test_post_init_hook_without_demo_data(self):
        self.config.set_param("leaflet.tile_url", "False")
        self.base_module.demo = False
        post_init_hook(self.env)
        self.assertEqual(
            self.config.get_param("leaflet.tile_url"),
            "False",
        )


class TestIrHttpSessionInfo(HttpCase):
    def setUp(self):
        super().setUp()
        self.authenticate("admin", "admin")

    def _get_session_info(self):
        response = self.url_open(
            "/web/session/get_session_info",
            data=json.dumps(
                {
                    "jsonrpc": "2.0",
                    "method": "call",
                    "params": {},
                }
            ),
            headers={
                "Content-Type": "application/json",
            },
        )
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertNotIn(
            "error",
            response_data,
            response_data.get("error"),
        )

        return response_data.get("result", response_data)

    def test_session_info_with_leaflet_parameters(self):
        self.env["ir.config_parameter"].sudo().set_param(
            "leaflet.tile_url",
            "tile-url",
        )
        self.env["ir.config_parameter"].sudo().set_param(
            "leaflet.copyright",
            "copyright",
        )
        result = self._get_session_info()
        self.assertEqual(
            result["leaflet.tile_url"],
            "tile-url",
        )
        self.assertEqual(
            result["leaflet.copyright"],
            "copyright",
        )

    def test_session_info_without_leaflet_parameters(self):
        self.env["ir.config_parameter"].sudo().search(
            [
                (
                    "key",
                    "in",
                    [
                        "leaflet.tile_url",
                        "leaflet.copyright",
                    ],
                ),
            ]
        ).unlink()
        result = self._get_session_info()
        self.assertEqual(
            result["leaflet.tile_url"],
            "",
        )
        self.assertEqual(
            result["leaflet.copyright"],
            "",
        )
