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
from osv import fields, osv



class GeoRasterLayer(osv.osv):
    _name = 'geoengine.raster.layer'


    _columns = {'raster_type':  fields.selection([('google', 'Google'),
                                                  ('osm', 'OpenStreetMap'),
                                                  ('mapbox', 'MapBox'),
                                                  ('d_wms', 'Distant WMS'),
                                                  ('swisstopo', 'swisstopo'),
                                                  ('openerp', 'OpenERP -- not implemented')],
                                                 string="Raster layer type",
                                                 required=True),
                'name': fields.char('Layer Name', size=256, translate=True, required=True),
                'url': fields.char('Service URL', size=1024),
                'google_type':  fields.selection([('G_NORMAL_MAP', 'Google normal map'),
                                                  ('G_SATELLITE_MAP', 'Google staellite map'),
                                                  ('G_HYBRID_MAP', 'Google Hybrid map'),
                                                  ('G_PHYSICAL_MAP', 'Google Physical map')],
                                                 string="Google raster layer type"),
                'mapbox_id':  fields.char("Mapbox ID", size=256),
                'swisstopo_type':  fields.selection([('ch.swisstopo.pixelkarte-farbe', 'Color map'),
                                                     ('ch.swisstopo.swissimage', 'Aerial imagery')],
                                                    string="Swisstopo raster layer type"),
                'swisstopo_time':  fields.char('Release date', size=256),
                'sequence': fields.integer('layer priority lower on top'),
                'overlay' : fields.boolean('Is overlay layer?'),
                'field_id': fields.many2one('ir.model.fields', 'OpenERP layer field to use',
                                            domain=[('ttype', 'ilike', 'geo_'),
                                                    ('model', '=', 'view_id.model')]),
                'view_id' : fields.many2one('ir.ui.view', 'Related View',
                                             domain=[('type', '=', 'geoengine')],
                                             required=True),
                'use_to_edit': fields.boolean('Use to edit')}
# TODO Write data check consraints

    _defaults = {'sequence': lambda *a: 6}
