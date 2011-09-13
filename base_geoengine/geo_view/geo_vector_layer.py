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
                                                      domain=[('ttype', 'in', SUPPORTED_ATT),
                                                              ('model', '=', 'view_id.model')]),
                'geo_field_id': fields.many2one('ir.model.fields',
                                                'Geo field',
                                                domain=[('ttype', 'ilike', 'geo_'),
                                                        ('model', '=', 'view_id.model')],
                                                required=True),
                'view_id' : fields.many2one('ir.ui.view', 'Related View',
                                            domain=[('type', '=', 'geo_map_view')],
                                            required=True),
                'sequence': fields.integer('layer priority lower on top'),
}
    # TODO Write data check consraints
    _defaults = {'nb_class': lambda *a: 1,
                 'begin_color': lambda *a: '#FF680A',
                 'sequence': lambda *a: 6}

GeoVectorLayer()
