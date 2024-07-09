# Copyright 2015-2017 ACSONE SA/NV (<http://acsone.eu>)
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html).
import requests

from odoo.tests.common import TransactionCase


class TestGeoenginePartner(TransactionCase):
    @classmethod
    def setUpClass(cls):
        cls._super_send = requests.Session.send
        super().setUpClass()

    @classmethod
    def _request_handler(cls, s, r, /, **kw):
        """Don't block external requests."""
        return cls._super_send(s, r, **kw)

    def test_get_geo_point(self):
        partner_id = self.env.ref("base.user_root").partner_id
        partner_id.partner_longitude = False
        partner_id.partner_latitude = False
        self.assertFalse(
            partner_id.geo_point, "Should not have geo_point with no latlon"
        )
        partner_id.partner_latitude = 20
        self.assertFalse(
            partner_id.geo_point, "Should not have geo_point with no latlon"
        )
        partner_id.partner_longitude = 20
        self.assertTrue(partner_id.geo_point, "Should have geo_point")

    def test_geo_localize(self):
        vals = {
            "name": "Partner Project",
            "street": "Rue au bois la dame",
            "country_id": self.env.ref("base.be").id,
            "zip": "6800",
        }
        partner_id = self.env["res.partner"].create(vals)
        partner_id.name = "Other Partner"
        partner_id.with_context(force_geo_localize=True).geo_localize()
        self.assertAlmostEqual(
            partner_id.partner_latitude, 49.9535323, 2, "Latitude Should be equals"
        )
        self.assertAlmostEqual(
            partner_id.partner_longitude, 5.4119073, 2, "Longitude Should be equals"
        )
        domain = [("id", "=", partner_id.id)]
        partner_id.unlink()
        self.assertFalse(
            self.env["res.partner"].search(domain),
            "Should not have this partner anymore",
        )
