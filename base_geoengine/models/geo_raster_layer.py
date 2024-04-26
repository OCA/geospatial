# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# Copyright 2016 Yannick Payot (Camptocamp SA)
# Copyright 2023 ACSONE SA/NV
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
    _order = "sequence ASC, name"

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
    name = fields.Char("Layer Name", translate=True, required=True)
    url = fields.Char("Service URL")

    # technical field to display or not wmts options
    is_wmts = fields.Boolean(compute="_compute_is_wmts")
    # technical field to display or not wms options
    is_wms = fields.Boolean(compute="_compute_is_wms")
    # wmts options
    matrix_set = fields.Char("Matrix set")
    format_suffix = fields.Char("Format", help="eg. png")
    request_encoding = fields.Char("Request encoding", help="eg. REST")
    projection = fields.Char(help="eg. EPSG:21781")
    units = fields.Char(help="eg. m")  # Not used
    resolutions = fields.Char()
    max_extent = fields.Char("Max extent")
    dimensions = fields.Char(help="List of dimensions separated by ','")
    params = fields.Char(help="Dictiorary of values for dimensions as JSON")

    # wms options
    params_wms = fields.Char(help="Need to provide at least a LAYERS param")
    server_type = fields.Char(
        help="The type of the remote WMS server: mapserver, \
            geoserver, carmentaserver, or qgis",
    )

    # technical field to display or not layer type -- Not used
    has_type = fields.Boolean(compute="_compute_has_type")
    type_id = fields.Many2one(
        "geoengine.raster.layer.type", "Layer", domain="[('service', '=', raster_type)]"
    )
    type = fields.Char(related="type_id.code")
    sequence = fields.Integer("Layer priority", default=6)
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
    opacity = fields.Float(default=1.0)

    @api.depends("raster_type", "is_wmts")
    def _compute_has_type(self):
        for rec in self:
            rec.has_type = rec.raster_type == "is_wmts"

    @api.depends("raster_type")
    def _compute_is_wmts(self):
        for rec in self:
            rec.is_wmts = rec.raster_type == "wmts"

    @api.depends("raster_type")
    def _compute_is_wms(self):
        for rec in self:
            rec.is_wms = rec.raster_type == "d_wms"
