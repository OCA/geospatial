# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# Copyright 2016 Yannick Payot (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import api, fields, models


class GeoRasterLayerType(models.Model):
    _name = "geoengine.raster.layer.type"
    _description = "Raster Layer Type"

    name = fields.Char(translate=True, required=True)
    code = fields.Char(required=True)
    service = fields.Char(required=True)


class GeoRasterLayer(models.Model):
    _name = "geoengine.raster.layer"
    _description = "Raster Layer"

    raster_type = fields.Selection(
        [
            ("osm", "OpenStreetMap"),
            ("wmts", "WMTS"),
            ("d_wms", "Distant WMS"),
            ("odoo", "Odoo field"),
        ],
        string="Raster layer type",
        default="osm",
        required=True,
    )
    name = fields.Char("Layer Name", size=256, translate=True, required=True)
    url = fields.Char("Service URL", size=1024)

    # technical field to display or not wmts options
    is_wmts = fields.Boolean(compute="_compute_is_wmts")
    # wmts options
    matrix_set = fields.Char("matrixSet")
    format_suffix = fields.Char("formatSuffix", help="eg. png")
    request_encoding = fields.Char("requestEncoding", help="eg. REST")
    projection = fields.Char("projection", help="eg. EPSG:21781")
    units = fields.Char(help="eg. m")
    resolutions = fields.Char("resolutions")
    max_extent = fields.Char("max_extent")
    dimensions = fields.Char("dimensions", help="List of dimensions separated by ','")
    params = fields.Char("params", help="Dictiorary of values for dimensions as JSON")

    # technical field to display or not layer type
    has_type = fields.Boolean(compute="_compute_has_type")
    type_id = fields.Many2one(
        "geoengine.raster.layer.type", "Layer", domain="[('service', '=', raster_type)]"
    )
    type = fields.Char(related="type_id.code")
    sequence = fields.Integer("layer priority lower on top", default=6)
    overlay = fields.Boolean("Is overlay layer?")
    field_id = fields.Many2one(
        "ir.model.fields",
        "Odoo layer field to use",
        domain=[("ttype", "ilike", "geo_"), ("model", "=", "view_id.model")],
    )
    view_id = fields.Many2one(
        "ir.ui.view", "Related View", domain=[("type", "=", "geoengine")], required=True
    )
    use_to_edit = fields.Boolean("Use to edit")

    @api.depends("raster_type", "is_wmts")
    def _compute_has_type(self):
        for rec in self:
            rec.has_type = rec.raster_type == "is_wmts"

    @api.depends("raster_type")
    def _compute_is_wmts(self):
        for rec in self:
            rec.is_wmts = rec.raster_type == "wmts"

    @api.onchange("raster_type")
    def onchange_set_wmts_options(self):
        """Abstract method for WMTS modules to set default options"""
