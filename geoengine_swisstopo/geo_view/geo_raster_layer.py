# Copyright 2019 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import logging

import requests
from odoo import api, fields, models


_LOGGER = logging.getLogger(__name__)
_CAPABILITIES_URL = (
    "https://wmts.geo.admin.ch/EPSG/{matrix_set}/1.0.0/WMTSCapabilities.xml"
)


class GeoRasterLayer(models.Model):
    _inherit = "geoengine.raster.layer"

    raster_type = fields.Selection(selection_add=[("swisstopo", "Swisstopo")])
    projection = fields.Char(
        "Projection", compute="_get_projection", readonly=True, store=True
    )
    layername = fields.Char("Layer Name", default="ch.swisstopo.pixelkarte-farbe")
    matrix_set = fields.Selection(
        [
            ("2056", "LV95/CH1903+ (EPSG:2056)"),
            ("21781", "LV03/CH1903 (EPSG:21781)"),
            ("4326", "WGS84 (EPSG:4326, lat-lon)"),
            (
                "3857",
                "Spherical Mercator (EPSG:3857, as used in OSM, Bing, Google Map)",
            ),
        ],
        default="2056",
        string="TileMatrixSet",
    )
    time = fields.Char("Time Dimension (optional)", default=None)
    capabilities = fields.Char(compute="_get_capabilities", readonly=True, store=True)

    @api.depends("raster_type", "matrix_set")
    def _get_projection(self):
        for record in self:
            if record.raster_type == "swisstopo":
                record.projection = f"EPSG:{record.matrix_set}"
            else:
                record.projection = False

    @api.depends("raster_type", "matrix_set")
    def _get_capabilities(self):
        for record in self:
            if record.raster_type == "swisstopo":
                url = _CAPABILITIES_URL.format(matrix_set=record.matrix_set or "2056")
                response = requests.get(url, timeout=30)
                if response.ok:
                    record.capabilities = response.text
                else:
                    _LOGGER.error(
                        "Swisstopo WMTS Capabilities request (%s)\n"
                        "failed with status code %s:\n%s",
                        url,
                        response.status_code,
                        response.text,
                    )
                    record.capabilities = False
            else:
                record.capabilities = False
