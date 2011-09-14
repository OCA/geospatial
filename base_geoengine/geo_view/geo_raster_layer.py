# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
from osv import fields, osv



class GeoRasterLayer(osv.osv):
    _name = 'geoengine.raster.layer'


    _columns = {'raster_type':  fields.selection([('google', 'Google'),
                                                  ('osm', 'Open Street MAP'),
                                                  ('d_wms', 'Distant WMS'),
                                                  ('openerp', 'OpenERP -- not implemented')],
                                                 string="Raster layer type",
                                                 required=True),
                'name': fields.char('Layer Name', size=256, translate=True, required=True),
                'url': fields.text('Service URL'),
                'google_type':  fields.selection([('G_NORMAL_MAP', 'Google normal map'),
                                                  ('G_SATELLITE_MAP', 'Google staellite map'),
                                                  ('G_HYBRID_MAP', 'Google Hybrid map'),
                                                  ('G_PHYSICAL_MAP', 'Google Physical map')],
                                                 string="Google raster layer type"),
                'sequence': fields.integer('layer priority lower on top'),
                'overlay' : fields.boolean('Is overlay layer?'),
                'field_id': fields.many2one('ir.model.fields', 'OpenERP layer field to use',
                                            domain=[('ttype', 'ilike', 'geo_'),
                                                    ('model', '=', 'view_id.model')]),
                'view_id' : fields.many2one('ir.ui.view', 'Related View',
                                             domain=[('type', '=', 'geo_map_view')],
                                             required=True)}
# TODO Write data check consraints
GeoRasterLayer()

_defaults = {'sequence': lambda *a: 6}
