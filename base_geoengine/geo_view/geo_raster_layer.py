# -*- coding: utf-8 -*-
##############################################################################
#
#    Author: Nicolas Bessi
#    Copyright 2011-2012 Camptocamp SA
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
##############################################################################
from openerp import fields, models


class GeoRasterLayer(models.Model):
    _name = 'geoengine.raster.layer'

    raster_type = fields.Selection(
        [('osm', 'OpenStreetMap'),
         ('mapbox', 'MapBox'),
         # FIXME ('google', 'Google'), see OCA/geospatial#63
         ('d_wms', 'Distant WMS'),
         ('swisstopo', 'swisstopo'),
         ('openerp', 'OpenERP -- not implemented')],
        string="Raster layer type",
        default='osm',
        required=True)
    name = fields.Char(
        'Layer Name', size=256, translate=True, required=True)
    url = fields.Char('Service URL', size=1024)
    google_type = fields.Selection(
        [('G_NORMAL_MAP', 'Google normal map'),
         ('G_SATELLITE_MAP', 'Google staellite map'),
         ('G_HYBRID_MAP', 'Google Hybrid map'),
         ('G_PHYSICAL_MAP', 'Google Physical map')],
        string="Google raster layer type")
    mapbox_id = fields.Char("Mapbox ID", size=256)
    swisstopo_type = fields.Selection(
        [('ch.swisstopo.pixelkarte-farbe', 'Color map'),
         ('ch.swisstopo.swissimage', 'Aerial imagery')],
        string="Swisstopo raster layer type")
    swisstopo_time = fields.Char('Release date', size=256)
    sequence = fields.Integer('layer priority lower on top', default=6)
    overlay = fields.Boolean('Is overlay layer?')
    field_id = fields.Many2one(
        'ir.model.fields', 'OpenERP layer field to use',
        domain=[('ttype', 'ilike', 'geo_'),
                ('model', '=', 'view_id.model')])
    view_id = fields.Many2one(
        'ir.ui.view', 'Related View', domain=[('type', '=', 'geoengine')],
        required=True)
    use_to_edit = fields.Boolean('Use to edit')
