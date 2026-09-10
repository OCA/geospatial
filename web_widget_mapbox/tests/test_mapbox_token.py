# Copyright 2026 Cetmix OÜ
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl-3.0).

import json
from uuid import uuid4

from odoo.tests import HttpCase, tagged
from odoo.tests.common import new_test_user


@tagged("post_install", "-at_install")
class TestMapboxTokenSession(HttpCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.user_password = "internal"
        cls.user = new_test_user(
            cls.env,
            "mapbox_internal",
            email="mapbox.internal@example.com",
            password=cls.user_password,
        )
        cls.portal_password = "portal"
        cls.portal_user = new_test_user(
            cls.env,
            "mapbox_portal",
            email="mapbox.portal@example.com",
            password=cls.portal_password,
            groups="base.group_portal",
        )
        cls.payload = json.dumps(dict(jsonrpc="2.0", method="call", id=str(uuid4())))
        cls.headers = {"Content-Type": "application/json"}
        # Avoid creating res.users.settings inside get_session_info: that
        # route is readonly and the INSERT is logged as an error.
        UsersSettings = cls.env["res.users.settings"]
        UsersSettings._find_or_create_for_user(cls.user)
        UsersSettings._find_or_create_for_user(cls.portal_user)

    def _get_session_info(self):
        response = self.url_open(
            "/web/session/get_session_info",
            data=self.payload,
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_session_info_internal_user_receives_token(self):
        token = "pk.internal_session"
        self.env["ir.config_parameter"].sudo().set_param(
            "web_widget_mapbox.token", token
        )
        self.authenticate(self.user.login, self.user_password)
        result = self._get_session_info()["result"]
        self.assertEqual(result["mapbox_token"], token)

    def test_session_info_portal_user_omits_token(self):
        token = "pk.portal_must_not_see"
        self.env["ir.config_parameter"].sudo().set_param(
            "web_widget_mapbox.token", token
        )
        self.authenticate(self.portal_user.login, self.portal_password)
        result = self._get_session_info()["result"]
        self.assertNotIn("mapbox_token", result)
        self.assertNotIn(token, json.dumps(result))

    def test_session_info_public_user_does_not_leak_token(self):
        token = "pk.public_must_not_see"
        self.env["ir.config_parameter"].sudo().set_param(
            "web_widget_mapbox.token", token
        )
        self.authenticate(None, None)
        response = self.url_open(
            "/web/session/get_session_info",
            data=self.payload,
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        result = data.get("result") or {}
        self.assertNotIn("mapbox_token", result)
        self.assertNotIn(token, response.text)
