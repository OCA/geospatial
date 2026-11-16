# Copyright 2026 mytime.click
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo.orm.model_classes import add_to_registry
from odoo.tests.common import TransactionCase

from .models import GeoAdvancedSearchTest


class TestGeoReferenceModels(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        add_to_registry(cls.registry, GeoAdvancedSearchTest)
        cls.registry._setup_models__(cls.env.cr, ["geoengine.advanced.search.test"])
        cls.registry.init_models(
            cls.env.cr,
            ["geoengine.advanced.search.test"],
            {"models_to_check": True},
        )

    def test_reference_models(self):
        reference_models_id = self.env["base"].get_geo_reference_models()
        reference_model_by_name_id = {
            info["model"]: info for info in reference_models_id
        }
        self.assertIn("geoengine.advanced.search.test", reference_model_by_name_id)
        info = reference_model_by_name_id["geoengine.advanced.search.test"]
        self.assertEqual(info["name"], "Geoengine Advanced Search Test")
        self.assertEqual(info["fields"], [["the_geom", "Geom Boundaries"]])

    def test_models_without_geo_fields_excluded(self):
        reference_model_names = {
            info["model"] for info in self.env["base"].get_geo_reference_models()
        }
        self.assertNotIn("res.currency", reference_model_names)
        self.assertNotIn("base", reference_model_names)
