# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# Copyright 2016 Yannick Payot (Camptocamp SA)
# Copyright 2023 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

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
    _order = "sequence ASC, name"

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
    begin_color = fields.Char("Begin color class", required=False, help="hex value")
    end_color = fields.Char(
        "End color class", required=False, help="hex value", default="#FF680A"
    )
    nb_class = fields.Integer("Number of class", default=1)
    attribute_field_id = fields.Many2one(
        "ir.model.fields", "Attribute field", domain=[("ttype", "in", SUPPORTED_ATT)]
    )
    model_id = fields.Many2one("ir.model", "Model to use")
    model_name = fields.Char(related="model_id.model", readonly=True)
    geo_field_id = fields.Many2one(
        "ir.model.fields",
        "Geo field",
        required=True,
        ondelete="cascade",
        domain=[("ttype", "ilike", "geo_")],
    )
    view_id = fields.Many2one(
        "ir.ui.view", "Related View", domain=[("type", "=", "geoengine")], required=True
    )
    sequence = fields.Integer("Layer priority lower on top", default=6)
    readonly = fields.Boolean("Layer is read only")
    display_polygon_labels = fields.Boolean("Display Labels on Polygon")
    active_on_startup = fields.Boolean(
        help="Layer will be shown on startup if checked."
    )
    layer_opacity = fields.Float()
    model_domain = fields.Char(default="[]")
    model_view_id = fields.Many2one(
        "ir.ui.view",
        "Model view",
        domain=[("type", "=", "geoengine")],
        compute="_compute_model_view_id",
        readonly=False,
    )

    @api.constrains("geo_field_id", "model_id")
    def _check_geo_field_id(self):
        for rec in self:
            if rec.model_id:
                if not rec.geo_field_id.model_id == rec.model_id:
                    raise ValidationError(
                        _(
                            "The geo_field_id must be a field in %s model",
                            rec.model_id.display_name,
                        )
                    )

    @api.depends("model_id")
    def _compute_model_view_id(self):
        for rec in self:
            if rec.model_id:
                for view in rec.model_id.view_ids:
                    if view.type == "geoengine":
                        rec.model_view_id = view
            else:
                rec.model_view_id = ""
