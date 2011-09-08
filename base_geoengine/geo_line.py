# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################

from osv import fields, osv, orm
from . import geo_field

class GeoLine(geo_field.Geom):
    """This class add a new type of columns to ORM it enable POSTGIS geometry type support"""
    _type = 'geo_line'
    
    def __init__(self, string, dim=2, srid=900913 , gist_index=True, **args):
        res = super(GeoLine, self).__init__(string, "LINESTRING", **args)
        return res
        
fields.geo_line = GeoLine