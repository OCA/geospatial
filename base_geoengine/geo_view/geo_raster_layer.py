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
                                                  ('d_vms', 'Distant VMS'),
                                                  ('openerp', 'OpenERP -- not implemented')],
                                                 string="Raster layer type",
                                                 required=True),
                'name': fields.char('Layer Name', size=256, required=True),
                'url': fields.text('Service URL'),
                'google_type':  fields.selection([('G_NORMAL_MAP', 'Google normal map'),
                                                  ('G_SATELLITE_MAP', 'Google staellite map'),
                                                  ('G_HYBRID_MAP', 'Google Hybrid map'),
                                                  ('G_PHYSICAL_MAP', 'Google Physical map')],
                                                 string="Google raster layer type",
                                                 required=True),
                'sequence': fields.integer('layer priority lower on top'),
                'overlay' : fields.boolean('Is overlay layer?'),
                'field_id': fields.many2one('ir.model.fields', 'OpenERP layer field to use',
                                            domain=[('ttype', 'ilike', 'geo_')]),
                'view_id' : fields.many2one('ir.ui.view', 'Related View', required=True)}
GeoRasterLayer()
