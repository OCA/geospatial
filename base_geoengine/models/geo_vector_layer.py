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

NUMBER_ATT = ["float", "integer", "integer_big"]


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
    geo_field_id = fields.Many2one(
        "ir.model.fields",
        "Geo field",
        required=True,
        ondelete="cascade",
        domain=[("ttype", "ilike", "geo_")],
    )
    attribute_field_id = fields.Many2one(
        "ir.model.fields", "Attribute field", domain=[("ttype", "in", SUPPORTED_ATT)]
    )
    model_id = fields.Many2one(
        "ir.model",
        "Model to use",
        store=True,
        readonly=False,
        compute="_compute_model_id",
    )
    model_name = fields.Char(related="model_id.model", readonly=True)

    view_id = fields.Many2one(
        "ir.ui.view", "Related View", domain=[("type", "=", "geoengine")], required=True
    )
    sequence = fields.Integer("Layer Priority", default=6)
    readonly = fields.Boolean("Layer is read only")
    display_polygon_labels = fields.Boolean("Display Labels on Polygon")
    active_on_startup = fields.Boolean(
        help="Layer will be shown on startup if checked."
    )
    layer_opacity = fields.Float(default=1.0)
    model_domain = fields.Char(default="[]")
    model_view_id = fields.Many2one(
        "ir.ui.view",
        "Model view",
        domain=[("type", "=", "geoengine")],
        compute="_compute_model_view_id",
        readonly=False,
    )
    layer_transparent = fields.Boolean()

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

    @api.constrains("geo_repr", "attribute_field_id")
    def _check_geo_repr(self):
        for rec in self:
            if (
                rec.attribute_field_id
                and rec.attribute_field_id.ttype not in NUMBER_ATT
            ):
                if (
                    rec.geo_repr == "colored"
                    and rec.classification != "unique"
                    or rec.geo_repr == "proportion"
                ):
                    raise ValidationError(
                        _(
                            "You need to select a numeric field",
                        )
                    )

    @api.constrains("attribute_field_id", "geo_field_id")
    def _check_if_attribute_in_geo_field(self):
        for rec in self:
            if rec.attribute_field_id and rec.geo_field_id:
                if rec.attribute_field_id.model != rec.geo_field_id.model:
                    raise ValidationError(
                        _(
                            "You need to provide an attribute that exists in %s model",
                            rec.geo_field_id.model_id.display_name,
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

    @api.depends("geo_field_id", "view_id")
    def _compute_model_id(self):
        for rec in self:
            if rec.view_id and rec.geo_field_id:
                if rec.view_id.model != rec.geo_field_id.model:
                    rec.model_id = rec.geo_field_id.model_id
                else:
                    rec.model_id = ""
            else:
                rec.model_id = ""
