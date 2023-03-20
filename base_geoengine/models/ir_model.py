# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# Copyright 2023 Yannick Payot (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import fields, models

from odoo.addons import base

if "geoengine" not in base.models.ir_actions.VIEW_TYPES:
    base.models.ir_actions.VIEW_TYPES.append(("geoengine", "Geoengine"))

GEO_TYPES = [
    ("geo_polygon", "geo_polygon"),
    ("geo_multi_polygon", "geo_multi_polygon"),
    ("geo_point", "geo_point"),
    ("geo_multi_point", "geo_multi_point"),
    ("geo_line", "geo_line"),
    ("geo_multi_line", "geo_multi_line"),
]

GEO_TYPES_ONDELETE = {
    "geo_polygon": "cascade",
    "geo_multi_polygon": "cascade",
    "geo_point": "cascade",
    "geo_multi_point": "cascade",
    "geo_line": "cascade",
    "geo_multi_line": "cascade",
}

POSTGIS_GEO_TYPES = [
    ("POINT", "POINT"),
    ("MULTIPOINT", "MULTIPOINT"),
    ("LINESTRING", "LINESTRING"),
    ("MULTILINESTRING", "MULTILINESTRING"),
    ("POLYGON", "POLYGON"),
    ("MULTIPOLYGON", "MULTIPOLYGON"),
]


class IrModelField(models.Model):
    _inherit = "ir.model.fields"

    srid = fields.Integer("srid", required=False)
    geo_type = fields.Selection(POSTGIS_GEO_TYPES, string="PostGIs type")
    dim = fields.Selection(
        [("2", "2"), ("3", "3"), ("4", "4")], string="PostGIs Dimension", default="2"
    )
    gist_index = fields.Boolean("Create gist index")
    ttype = fields.Selection(
        selection_add=GEO_TYPES,
        ondelete=GEO_TYPES_ONDELETE,
    )
