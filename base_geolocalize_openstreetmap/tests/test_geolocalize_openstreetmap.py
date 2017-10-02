# -*- coding: utf-8 -*-
# Copyright 2015-2017 ACSONE SA/NV (<http://acsone.eu>)
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html).
import odoo.tests.common as common


class TestGeolocalizeOpenstreetmap(common.TransactionCase):

    def test_geo_localize(self):
        street = "Rue au bois la dame"
        country_name = "Belgium"
        zip_code = "6800"
        country_code = "BE"

        values = self.env[
            'geoengine.geolocalize.openstreetmap'
        ]._geocode_address(
            street, zip_code, None, None, country_name, country_code)

        self.assertTrue(
            bool(values), "No values returned by openstreetmap")

        latitute = float(values.get('lat'))
        longitude = float(values.get('lon'))
        self.assertAlmostEqual(
            latitute, 49.95353, 5,
            "Latitude Should be equals")
        self.assertAlmostEqual(
            longitude, 5.40539, 5,
            "Longitude Should be equals")
