# Copyright 2026 mytime.click
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo.orm.model_classes import add_to_registry
from odoo.tests.common import TransactionCase
from odoo.tools import mute_logger

from .models import GeoSearchAvatarTest, GeoSearchLogoTest, GeoSearchNoLogoTest

TEST_MODELS = [
    "geoengine.advanced.search.logo.test",
    "geoengine.advanced.search.nologo.test",
    "geoengine.advanced.search.avatar.test",
]


class TestImageField(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # The test models of the other geoengine_advanced_search tests are
        # registered already but their tables are gone: the check run by
        # _setup_models__ logs them, which is expected here.
        with mute_logger("odoo.registry"):
            for model_class in (
                GeoSearchLogoTest,
                GeoSearchNoLogoTest,
                GeoSearchAvatarTest,
            ):
                add_to_registry(cls.registry, model_class)
            cls.registry._setup_models__(cls.env.cr, TEST_MODELS)
            cls.registry.init_models(cls.env.cr, TEST_MODELS, {"models_to_check": True})

    def _reference_model_by_name_id(self):
        reference_models_id = self.env["base"].get_geo_reference_models()
        return {info["model"]: info for info in reference_models_id}

    def test_logo_field(self):
        info = self._reference_model_by_name_id()["geoengine.advanced.search.logo.test"]
        self.assertEqual(info["image_field"], "logo")
        self.assertEqual(info["fields"], [["the_geom", "Geom Boundaries"]])

    def test_model_without_image_field(self):
        info = self._reference_model_by_name_id()[
            "geoengine.advanced.search.nologo.test"
        ]
        self.assertFalse(info["image_field"])

    def test_avatar_model(self):
        # The image takes priority over the avatar without any contact geo addon.
        info = self._reference_model_by_name_id()[
            "geoengine.advanced.search.avatar.test"
        ]
        self.assertEqual(info["image_field"], "image_128")
