# Copyright 2020 ACSONE SA/NV.
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


from odoo.tests import SavepointCase

from odoo_test_helper import FakeModelLoader


class TestGeoJsonify(SavepointCase):
    @classmethod
    def setUpClass(cls):
        super(TestGeoJsonify, cls).setUpClass()

        cls.loader = FakeModelLoader(cls.env, cls.__module__)
        cls.loader.backup_registry()
        from .models import TestGeo
        cls.loader.update_registry((TestGeo,))

        vals_export = {
            "name": "GeoExport",
            "resource": "test.geo",
            "export_fields": [(0, 0, {"name": "geo_point"})],
        }
        cls.export = cls.env["ir.exports"].create(vals_export)
        vals_test_record = {"lat": 50.63528, "lon": 4.86348}
        cls.test_record = cls.env["test.geo"].create(vals_test_record)

    @classmethod
    def tearDownClass(cls):
        cls.loader.restore_registry()
        super(TestGeoJsonify, cls).tearDownClass()
