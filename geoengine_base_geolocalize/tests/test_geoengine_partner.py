# Copyright 2015-2017 ACSONE SA/NV (<http://acsone.eu>)
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html).
import re

from requests import PreparedRequest, Response, Session

from odoo.tests.common import TransactionCase

PAYLOAD = [
    {
        "place_id": 108312997,
        "licence": "Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright",
        "osm_type": "way",
        "osm_id": 318222295,
        "lat": "49.9549071",
        "lon": "5.4085830",
        "class": "highway",
        "type": "unclassified",
        "place_rank": 26,
        "importance": 0.053386585030899485,
        "addresstype": "road",
        "name": "Rue Au Bois la Dame",
        "display_name": (
            "Rue Au Bois la Dame, Séviscourt, Bras, Libramont-Chevigny,"
            "Neufchâteau, Luxembourg, Wallonia, 6800, Belgium"
        ),
        "boundingbox": ["49.9535323", "49.9566288", "5.4053940", "5.4115772"],
    }
]


class TestGeoenginePartner(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        cls.nominatim_osm_request_re = re.compile(
            r"https://nominatim.openstreetmap.org/search\?format=json&q=(.*)"
        )

    @classmethod
    def _request_handler(cls, session: Session, request: PreparedRequest, /, **kwargs):
        url = request.url.lower()
        matching = cls.nominatim_osm_request_re.match(url)
        if matching:
            response = Response()
            response.status_code = 200
            query = matching.group(1)
            if query == "rue+au+bois+la+dame%2c+6800%2c+belgium":
                response.json = lambda: PAYLOAD
                return response
        return super()._request_handler(session, request, **kwargs)

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
