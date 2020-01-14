# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# Copyright 2016 Yannick Vaucher (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import fields, models

SUPPORTED_ATT = [
    "float",
    "integer",
    "integer_big",
    "related",
    "function",
    "date",
    "datetime",
    "char",
    "text",
    "selection",
]


class GeoVectorLayer(models.Model):
    _name = "geoengine.vector.layer"
    _description = "Vector Layer"

    geo_repr = fields.Selection(
        [
            ("basic", "Basic"),
            # Actually we have to think if we should separate it for colored
            ("proportion", "Proportional Symbol"),
            ("colored", "Colored range/Chroma.js"),
        ],
        string="Representation mode",
        required=True,
    )
    classification = fields.Selection(
        [
            ("unique", "Unique value"),
            ("interval", "Interval"),
            ("quantile", "Quantile"),
            ("custom", "Custom"),
        ],
        string="Classification mode",
        required=False,
    )
    name = fields.Char("Layer Name", translate=True, required=True)
    symbol_ids = fields.One2many("geoengine.vector.symbol", "vector_layer_id")
    begin_color = fields.Char(
        "Begin color class", size=64, required=False, help="hex value"
    )
    end_color = fields.Char(
        "End color class", size=64, required=False, help="hex value", default="#FF680A"
    )
    nb_class = fields.Integer("Number of class", default=1)
    attribute_field_id = fields.Many2one(
        "ir.model.fields", "attribute field", domain=[("ttype", "in", SUPPORTED_ATT)]
    )
    geo_field_id = fields.Many2one(
        "ir.model.fields",
        "Geo field",
        domain=[("ttype", "ilike", "geo_")],
        required=True,
    )
    view_id = fields.Many2one(
        "ir.ui.view", "Related View", domain=[("type", "=", "geoengine")], required=True
    )
    sequence = fields.Integer("layer priority lower on top", default=6)
    readonly = fields.Boolean("Layer is read only")
    display_polygon_labels = fields.Boolean("Display Labels on Polygon")
    active_on_startup = fields.Boolean(
        help="Layer will be shown on startup if checked."
    )
    layer_opacity = fields.Float("Layer Opacity")
