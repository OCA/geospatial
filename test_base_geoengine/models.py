# Copyright 2011-2019 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import fields
from odoo.addons.base_geoengine.geo_model import GeoModel
from odoo.addons.base_geoengine import fields as geo_fields


class DummyModel(GeoModel):
    _name = 'test.dummy'

    name = fields.Char(string="Zip", size=64, required=True)
    the_geom = geo_fields.GeoMultiPolygon(string="NPA Shape")
    geo_point = geo_fields.GeoPoint(string="Point")


class DummyModelRelated(GeoModel):
    _name = 'test.dummy.related'

    dummy_test_id = fields.Many2one(
        String='dummy_test', comodel_name='test.dummy')
    the_geom_related = geo_fields.GeoMultiPolygon(
        'related', related='dummy_test_id.the_geom')
