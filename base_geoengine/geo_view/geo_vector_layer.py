# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
from osv import fields, osv

SUPPORTED_ATT = ['float', 'integer','integer_big', 'related',
                 'function', 'date', 'datetime', 'char', 'text', 'selection']

class GeoVectorLayer(osv.osv):
    _name = 'geoengine.vector.layer'


    _columns = {'geo_repr': fields.selection([('basic', 'Basic'),
                                              # Actually we have to think if we should separate it for colored
                                              #('choropleth', 'Choropleth'),
                                              ('proportion', 'Proportional Symbol'),
                                              ('colored', 'Colored range/Choropleth')],
                                             string="Representation mode",
                                             required=True),
                'classification': fields.selection([('unique', 'Unique value'),
                                                    ('interval', 'Interval'),
                                                    ('quantile', 'Quantile')],
                                             string="Classification mode",
                                             required=False),
                'name': fields.char('Layer Name', size=256, translate=True, required=True),
                'symbol_url': fields.text('Symbol URL'),
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
                                                domain=[('ttype', 'ilike', 'geo_')],
                                                required=True),
                'view_id' : fields.many2one('ir.ui.view', 'Related View',
                                            domain=[('type', '=', 'geoengine')],
                                            required=True),
                'sequence': fields.integer('layer priority lower on top'),
}
    # TODO Write data check consraints
    _defaults = {'nb_class': lambda *a: 1,
                 'begin_color': lambda *a: '#FF680A',
                 'sequence': lambda *a: 6}

GeoVectorLayer()
