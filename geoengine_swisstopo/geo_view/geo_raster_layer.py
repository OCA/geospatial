# Copyright 2019 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import api, fields, models


BASE_URL = (
    "https://wmts{{0-9}}.geo.admin.ch/1.0.0/{layername}/default/"
    "{time}/{matrix_set}/{{TileSetId}}/{{TileRow}}/{{TileCol}}.{ext}"
)


class GeoRasterLayer(models.Model):
    _inherit = 'geoengine.raster.layer'

    raster_type = fields.Selection(selection_add=[('swisstopo', 'Swisstopo')])
    projection = fields.Char('Projection', default="EPSG:21781")
    layername = fields.Char("Layer Machine Name", default="ch.swisstopo.pixelkarte-farbe")
    matrix_set = fields.Selection(
        [
            ("2056", "LV95/CH1903+ (EPSG:2056)"),
            ("21781", "LV03/CH1903 (EPSG:21781)"),
            ("4326", "LV95/CH1903+ (EPSG:4326)"),
            ("3857", "LV95/CH1903+ (EPSG:3857, as used in OSM, Bing, Google Map)"),
        ],
        default="21781",
        string='TileMatrixSet',
    )
    time = fields.Char('Time Dimension', default="current")
    wmts_url = fields.Char(compute="_compute_wmts_url", readonly=True, store=True)

    @api.depends("raster_type", "layername", "time", "matrix_set", "format_suffix")
    def _compute_wmts_url(self):
        for record in self:
            if record.raster_type == "swisstopo":
                record.wmts_url = BASE_URL.format(
                    layername=record.layername or "ch.swisstopo.pixelkarte-farbe",
                    time=record.time or "current",
                    matrix_set=record.matrix_set or "21781",
                    ext=record.format_suffix or "jpeg",
                )
            else:
                record.wmts_url = False
