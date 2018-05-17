# -*- coding: utf-8 -*-
# © 2016 Yannick Vaucher (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
from openerp import api, fields, models


class GeoRasterLayer(models.Model):
    _inherit = 'geoengine.raster.layer'

    raster_type = fields.Selection(
        selection_add=[('map.lausanne.ch', 'map.lausanne.ch')]
    )

    @api.one
    @api.depends('raster_type')
    def _get_is_wmts(self):
        if self.raster_type == 'map.lausanne.ch':
            self.is_wmts = True
        else:
            super(GeoRasterLayer, self)._get_is_wmts()

    @api.one
    @api.onchange('raster_type')
    def onchange_set_wmts_options(self):
        """ Define default values for lausanne map service """
        if self.raster_type == 'map.lausanne.ch':
            self.url = 'http://map.lausanne.ch/tiles/'
            self.format_suffix = 'png'
            self.projection = 'EPSG:21781'
            self.units = 'm'
            self.resolutions = (
                '20, 10, 5, 2.5, 2, 1.5, 1, 0.5, 0.25, 0.1, 0.05'
            )
            self.max_extent = '420000, 30000, 900000, 350000'
            self.server_resolutions = (
                '50, 20, 10, 5, 2.5, 1, 0.5, 0.25, 0.1, 0.05'
            )
            self.request_encoding = 'REST'
            self.matrix_set = 'swissgrid_05'
            self.dimensions = 'DATE'
            self.params = '{"date": 2015}'
        else:
            super(GeoRasterLayer, self).onchange_set_wmts_options()
