# Copyright 2024 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo.exceptions import ValidationError
from odoo.tests.common import TransactionCase, tagged


@tagged("post_install", "-at_install")
class TestResPartnerGeoengine(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.env = cls.env(context=dict(cls.env.context, tracking_disable=True))
        cls.category_bakery = cls.env["res.partner.category"].create({"name": "Bakery"})
        cls.category_grocery = cls.env["res.partner.category"].create(
            {"name": "Grocery"}
        )

        cls.partner_store_1 = cls.env["res.partner"].create(
            {
                "name": "Supermarket Central",
                "type": "store",
                "city": "Brussels",
                "zip": "1000",
                "street": "Grand Place ",
                "street2": "1",
                "opening_hours": "08:00 - 20:00",
                "partner_longitude": 4.3517,
                "partner_latitude": 50.8503,
                "category_id": [(6, 0, [cls.category_grocery.id])],
            }
        )

        cls.partner_store_2 = cls.env["res.partner"].create(
            {
                "name": "Local Bakery",
                "type": "store",
                "city": "Antwerp",
                "zip": "2000",
                "street": "Main Street ",
                "street2": "10",
                "opening_hours": "06:00 - 18:00",
                "partner_longitude": 4.4025,
                "partner_latitude": 51.2194,
                "category_id": [(6, 0, [cls.category_bakery.id])],
            }
        )

        cls.partner_contact = cls.env["res.partner"].create(
            {
                "name": "John Contact",
                "type": "contact",
                "city": "Brussels",
                "zip": "1000",
            }
        )

    def test_get_search_tags_name(self):
        tags = self.env["res.partner"].get_search_tags("Supermarket", "en_US")
        self.assertIn(("name", "Supermarket Central"), tags)

    def test_get_search_tags_city(self):
        tags = self.env["res.partner"].get_search_tags("Brussels", "en_US")
        self.assertIn(("city", "Brussels"), tags)

    def test_get_search_tags_zip(self):
        tags = self.env["res.partner"].get_search_tags("2000", "en_US")
        self.assertIn(("zip", "2000"), tags)

    def test_get_search_tags_street(self):
        tags = self.env["res.partner"].get_search_tags("Grand Place", "en_US")
        self.assertIn(("street", "Grand Place 1"), tags)

    def test_get_search_tags_category_tag(self):
        tags = self.env["res.partner"].get_search_tags("Bakery", "en_US")
        self.assertIn(("tag", "Bakery"), tags)

    def test_get_search_tags_excludes_non_store(self):
        tags = self.env["res.partner"].get_search_tags("John Contact", "en_US")
        self.assertEqual(tags, [])

    def test_fetch_partner_geoengine_basic(self):
        tags = [{"column": "name", "value": "Supermarket Central"}]
        results = self.env["res.partner"].fetch_partner_geoengine(tags, "en_US", 200)
        self.assertEqual(len(results), 1)
        feature = results[0]
        self.assertEqual(feature["type"], "Feature")
        self.assertEqual(feature["geometry"]["type"], "Point")
        self.assertEqual(feature["geometry"]["coordinates"], [4.3517, 50.8503])
        props = feature["properties"]
        self.assertEqual(props["id"], self.partner_store_1.id)
        self.assertEqual(props["name"], "Supermarket Central")
        self.assertEqual(props["city"], "Brussels")
        self.assertEqual(props["zip"], "1000")
        self.assertEqual(props["street"], "Grand Place ")
        self.assertEqual(props["street2"], "1")
        self.assertEqual(props["tags"], ["Grocery"])
        self.assertEqual(props["opening_hours"], "08:00 - 20:00")

    def test_fetch_partner_geoengine_filter_by_tag(self):
        tags = [{"column": "tag", "value": "Bakery"}]
        results = self.env["res.partner"].fetch_partner_geoengine(tags, "en_US", 200)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["properties"]["id"], self.partner_store_2.id)

    def test_fetch_partner_geoengine_multiple_tags(self):
        tags = [
            {"column": "city", "value": "Brussels"},
            {"column": "name", "value": "Supermarket"},
        ]
        results = self.env["res.partner"].fetch_partner_geoengine(tags, "en_US", 200)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["properties"]["id"], self.partner_store_1.id)

    def test_fetch_partner_geoengine_unauthorized_field(self):
        tags = [{"column": "opening_hours", "value": "08:00"}]
        with self.assertRaises(ValidationError):
            self.env["res.partner"].fetch_partner_geoengine(tags, "en_US", 200)

    def test_fetch_partner_geoengine_max_results_exceeded(self):
        tags = []
        res = self.env["res.partner"].fetch_partner_geoengine(tags, "en_US", 1)
        self.assertIsInstance(res, dict)
        self.assertEqual(res.get("error"), "Too many results")
        self.assertIn("Too many results", res.get("message", ""))

    def test_fetch_partner_geoengine_no_results(self):
        tags = [{"column": "name", "value": "Nonexistent Store"}]
        results = self.env["res.partner"].fetch_partner_geoengine(tags, "en_US", 200)
        self.assertEqual(results, [])
