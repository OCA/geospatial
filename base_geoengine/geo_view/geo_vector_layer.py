# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
from osv import fields, osv

SUPPORTED_ATT = ['float', 'integer','integer_big', 'related', 
                 'function', 'date', 'datetime', 'char', 'text']

class GeoVectorLayer(osv.osv):
    _name = 'geoengine.vector.layer'


    _columns = {'geo_repr': fields.selection([('basic', 'Basic'),
                                              ('choropleth', 'Choropleth'),
                                              ('proportion', 'Proportional Symbol'),
                                              ('colored', 'Colored range')],
                                             string="Representation mode",
                                             required=True),
                                             
                'name': fields.char('Layer Name', size=256, required=True),
                'symbol_url': fields.text('symbol_url'),
                'symbol_binary': fields.binary('Binary Symbol'),
                'begin_color': fields.char('Begin color class', size=64, required=False,
                                           help='hex value'),
                'end_color': fields.char('End color class', size=64, required=False,
                                         help='hex value'),
                'nb_class': fields.integer('Number of class'),
                'attribute_field_id': fields.many2one('ir.model.fields',
                                                      'attribute field',
                                                      domain=[('ttype', 'in', SUPPORTED_ATT)]),
                                                      
                'geo_field_id': fields.many2one('ir.model.fields',
                                                'Geo field',
                                                domain=[('ttype', 'ilike', '_geo')],
                                                required=True),
                'view_id' : fields.many2one('ir.ui.view', 'Related View', required=True)}

GeoVectorLayer()
