# Copyright 2011-2019 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import fields, models

# make pytest happy
# in pytest context module dependencies are not loaded
# thus geo fields are unknown
from odoo.addons import base_geoengine  # noqa


class DummyAbstractModel(models.AbstractModel):
    _name = "test.abstract.dummy"
    _description = "test.abstract.dummy"

    geo_line = fields.GeoLine(string="Line")


class DummyInheritAbstract(models.Model):
    _name = "test.dummy.from_abstract"
    _description = "submodel of test.abstract.dummy"
    _inherit = "test.abstract.dummy"

    name = fields.Char()


class DummyModel(models.Model):
    _name = "test.dummy"
    _description = "test.dummy"

    name = fields.Char()
    geo_multipolygon = fields.GeoMultiPolygon()
    geo_point = fields.GeoPoint()


class DummyModelRelated(models.Model):
    _name = "test.dummy.related"
    _description = "test.dummy.related"

    dummy_test_id = fields.Many2one(comodel_name="test.dummy", string="Dummy test")
    dummy_geo_multipolygon = fields.GeoMultiPolygon(
        related="dummy_test_id.geo_multipolygon", string="Related Geom"
    )
