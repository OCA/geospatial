# Copyright 2015-2017 ACSONE SA/NV (<http://acsone.eu>)
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html).
import responses
import odoo.tests.common as common


class TestGeolocalizeOpenstreetmap(common.TransactionCase):
    def setUp(self):
        super(TestGeolocalizeOpenstreetmap, self).setUp()
        self.expected_latitude = 50.4311411
        self.expected_longitude = 4.6132813

        # First, test a street known by OSM
        belgium = self.env.ref("base.be")
        namur_values = {"name": "Namur", "code": "NA", "country_id": belgium.id}
        namur_state = self.env["res.country.state"].create(namur_values)
        vals = {
            "name": "Partner Project",
            "street": "Rue bois des noix",
            "country_id": belgium.id,
            "zip": "5060",
            "city": "Tamines",
            "state_id": namur_state.id,
        }

        self.partner_id_known = self.env["res.partner"].create(vals)

        # Second, test a fake street to force the code to go to
        # the second iteration
        vals2 = {
            "name": "Partner Project",
            "street": "Rue test",
            "city": "Tamines",
            "country_id": self.env.ref("base.be").id,
        }
        self.partner_id_known_second = self.env["res.partner"].create(vals2)

        # Third, test a fake street to force the code to go
        # to the second iteration
        vals3 = {
            "name": "Partner Project",
            "street": "Rue test",
            "city": "Tmnss",
            "country_id": self.env.ref("base.be").id,
        }
        self.partner_id_not_known = self.env["res.partner"].create(vals3)

    @responses.activate
    def test_osm_found_lat_long_with_mock(self):
        responses.add(
            responses.Response(
                method="GET",
                url="https://nominatim.openstreetmap.org/search?"
                + "city=Tamines&format=json&country=Belgium&state=Namur&"
                + "state=&street=Rue+bois+des+noix&limit=1&postalCode=5060",
                match_querystring=True,
                json=[
                    {
                        "lat": self.expected_latitude,
                        "lon": self.expected_longitude,
                    }
                ],
                status=200,
            )
        )

        self.partner_id_known.geo_localize()

        self.assertEqual(len(responses.calls), 1, "call does not exist")
        self.assertAlmostEqual(
            self.partner_id_known.partner_latitude,
            self.expected_latitude,
            3,
            "Latitude Should be equals",
        )
        self.assertAlmostEqual(
            self.partner_id_known.partner_longitude,
            self.expected_longitude,
            3,
            "Longitude Should be equals",
        )

    @responses.activate
    def test_osm_found_lat_long_second_time_with_mock(self):
        responses.add(
            responses.Response(
                method="GET",
                url="https://nominatim.openstreetmap.org/search?city=Tamines"
                + "&format=json&country=Belgium&state=&street=Rue+test&"
                + "limit=1&postalCode=",
                match_querystring=True,
                json=[{}],
                status=200,
            )
        )
        responses.add(
            responses.Response(
                method="GET",
                url="https://nominatim.openstreetmap.org/search?city=Tamines"
                + "&format=json&country=Belgium&state=&street=&"
                + "limit=1&postalCode=",
                match_querystring=True,
                json=[{"lat": 50.825833, "lon": 4.3475227}],
                status=200,
            )
        )

        self.partner_id_known_second.geo_localize()

        self.assertAlmostEqual(
            self.partner_id_known_second.partner_latitude,
            50.825833,
            3,
            "Latitude Should be equals",
        )
        self.assertAlmostEqual(
            self.partner_id_known_second.partner_longitude,
            4.3475227,
            3,
            "Longitude Should be equals",
        )

    @responses.activate
    def test_osm_loc_not_found_with_mock(self):

        responses.add(
            responses.Response(
                method="GET",
                url="https://nominatim.openstreetmap.org/search?city=Tmnss&"
                + "format=json&country=Belgium&state=&street=Rue+test&"
                + "limit=1&postalCode=",
                match_querystring=True,
                json=[{}],
            )
        )

        responses.add(
            responses.Response(
                method="GET",
                url="https://nominatim.openstreetmap.org/search?city=Tmnss&"
                + "format=json&country=Belgium&state=&street=&"
                + "limit=1&postalCode=",
                match_querystring=True,
                json=[{}],
            )
        )

        self.partner_id_not_known.geo_localize()

        self.assertFalse(self.partner_id_not_known.partner_longitude)
        self.assertFalse(self.partner_id_not_known.partner_latitude)
