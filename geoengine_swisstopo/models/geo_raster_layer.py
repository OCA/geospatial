# -*- coding: utf-8 -*-
# © 2016 Yannick Vaucher (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
from openerp import api, fields, models


class GeoRasterLayer(models.Model):
    _inherit = 'geoengine.raster.layer'

    raster_type = fields.Selection(selection_add=[('swisstopo', 'swisstopo')])

    @api.one
    @api.depends('raster_type')
    def _get_is_wmts(self):
        if self.raster_type == 'swisstopo':
            self.is_wmts = True
        else:
            super(GeoRasterLayer, self)._get_is_wmts()

    @api.one
    @api.onchange('type')
    def onchange_type_set_resolutions(self):
        if self.raster_type == 'swisstopo':
            self.resolutions = (
                '4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, '
                '1500, 1250, 1000, 750, 650, 500, 250, 100, 50, 20, 10, 5, 2.5'
            )
            if self.type == 'ch.swisstopo.swissimage':
                self.resolutions.extends([2, 1.5, 1, 0.5])

    @api.one
    @api.onchange('raster_type')
    def onchange_set_wmts_options(self):
        if self.raster_type == 'swisstopo':
            self.url = ('https://wmts0.geo.admin.ch/,'
                        'https://wmts1.geo.admin.ch/,'
                        'https://wmts2.geo.admin.ch/')
            self.format_suffix = 'jpeg'
            self.projection = 'EPSG:21781'
            self.units = 'm'
            self.resolutions = (
                '4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, '
                '1500, 1250, 1000, 750, 650, 500, 250, 100, 50, 20, 10, 5, 2.5'
            )
            if self.type == 'ch.swisstopo.swissimage':
                self.resolutions.extends([2, 1.5, 1, 0.5])
            self.max_extent = '420000, 30000, 900000, 350000'
            self.request_encoding = 'REST'
            self.matrix_set = '21781'
            self.dimensions = 'TIME'
            self.params = '{"time": 2015}'
        else:
            super(GeoRasterLayer, self).onchange_set_wmts_options()
