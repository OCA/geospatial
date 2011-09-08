# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
from osv import fields, osv
GEO_TYPES = [('geo_polygon','geo_polygon'),
             ('geo_multi_polygon', 'geo_multi_polygon'),
             ('geo_point', 'geo_point'),
             ('geo_multi_point', 'geo_multi_point'),
             ('geo_line', 'geo_multi_point'),
             ('geo_multi_line', 'geo_multi_line')]
             
POSTGIS_GEO_TYPES = [('POINT', 'POINT'),
                     ('MULTIPOINT', 'MULTIPOINT'),
                     ('LINESTRING', 'LINESTRING'),
                     ('MULTILINESTRING', 'MULTILINESTRING'),
                     ('POLYGON', 'POLYGON'),
                     ('MULTIPOLYGON', 'MULTIPOLYGON')]


class IrModelField(osv.osv):
    _inherit = 'ir.model.fields'
    
    def _get_fields_type(self, cr, uid, context=None):
        cr.execute('select distinct ttype,ttype from ir_model_fields')
        res = cr.fetchall()
        to_return = list(set(res+GEO_TYPES))
        to_return.sort()
        return to_return
        
    _columns = {'srid': fields.integer('srid', required=False),
                'geo_type': fields.selection(POSTGIS_GEO_TYPES, string="PostGIs type"),
                'dim' : fields.selection([(2,'2'), (3,'3'), (4,'4')], string="PostGIs type"),
                'gist_index': fields.boolean('Create gist index'),
                'ttype': fields.selection(_get_fields_type,
                                          'Field Type',
                                          size=64,
                                          required=True)}
                                          
#    def _geo_field_create(cursor, geo_field, context=None):
        
                
IrModelField()