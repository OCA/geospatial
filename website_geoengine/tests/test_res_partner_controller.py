# Copyright 2024 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import json

from odoo.tests.common import HttpCase, tagged


@tagged("post_install", "-at_install")
class TestResPartnerController(HttpCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.env = cls.env(context=dict(cls.env.context, tracking_disable=True))
        cls.category_test = cls.env["res.partner.category"].create(
            {"name": "Controller Test Tag"}
        )
        cls.store_partner = cls.env["res.partner"].create(
            {
                "name": "Geo Controller Store",
                "type": "store",
                "city": "Liège",
                "zip": "4000",
                "street": "Rue de la Cathédrale 1",
                "opening_hours": "09:00 - 17:00",
                "partner_longitude": 5.5797,
                "partner_latitude": 50.6412,
                "category_id": [(6, 0, [cls.category_test.id])],
            }
        )

    def test_controller_tags_route(self):
        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {"tags": "Geo Controller", "lang": "en_US"},
            "id": 1,
        }
        response = self.url_open(
            "/website-geoengine/tags",
            data=json.dumps(payload),
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(response.status_code, 200)
        res_json = response.json()
        self.assertNotIn("error", res_json)
        self.assertIn("result", res_json)
        tags = res_json["result"]
        self.assertTrue(
            any(t[0] == "name" and t[1] == "Geo Controller Store" for t in tags)
        )

    def test_controller_partners_route(self):
        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
                "tags": [{"column": "name", "value": "Geo Controller Store"}],
                "lang": "en_US",
                "maxResults": "200",
            },
            "id": 1,
        }
        response = self.url_open(
            "/website-geoengine/partners",
            data=json.dumps(payload),
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(response.status_code, 200)
        res_json = response.json()
        self.assertNotIn("error", res_json)
        self.assertIn("result", res_json)
        features = res_json["result"]
        self.assertEqual(len(features), 1)
        self.assertEqual(features[0]["properties"]["name"], "Geo Controller Store")
